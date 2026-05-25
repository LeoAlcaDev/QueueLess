package pe.edu.utec.queueless.delivery;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.delivery.dto.SolicitudDeliveryResponse;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.pago.dto.IniciarPagoResponse;
import pe.edu.utec.queueless.pago.service.PagoService;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.ItemPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
import pe.edu.utec.queueless.queuepoints.dto.SaldoResponse;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;
import pe.edu.utec.queueless.queuepoints.listener.EntregaCompletadaListener;
import pe.edu.utec.queueless.queuepoints.repository.MovimientoQueuePointsRepository;
import pe.edu.utec.queueless.queuepoints.service.QueuePointsService;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.PerfilRepartidor;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.PerfilRepartidorRepository;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * E2E del flujo DELIVERY: pago confirmado → comercio acepta → solicitud
 * creada → repartidor acepta, recoge y entrega → puntos ganados.
 *
 * <p>El listener {@code @Async @TransactionalEventListener} no corre dentro de
 * la TX del test (se ejecuta tras commit, en otro hilo). Para validar el flujo
 * end-to-end sin depender del scheduler, ejercitamos los servicios o el
 * listener directamente cuando hace falta.
 */
@ActiveProfiles("test")
@Transactional
class DeliveryFlowIT extends AbstractIntegrationTest {

    @Autowired private AuthService authService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PerfilRepartidorRepository perfilRepartidorRepository;
    @Autowired private PuntoDeVentaService puntoDeVentaService;
    @Autowired private ProductoService productoService;
    @Autowired private PedidoService pedidoService;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoService pagoService;
    @Autowired private SolicitudDeliveryService solicitudDeliveryService;
    @Autowired private SolicitudDeliveryRepository solicitudDeliveryRepository;
    @Autowired private QueuePointsService queuePointsService;
    @Autowired private MovimientoQueuePointsRepository movimientoRepository;
    @Autowired private EntregaCompletadaListener entregaCompletadaListener;

    @Test
    @DisplayName("flujo DELIVERY end-to-end: pago → aceptación → recogida → entrega → 50 QueuePoints al repartidor")
    void flujoDeliveryEndToEnd() {
        Contexto ctx = prepararPedidoDelivery();

        // Pago confirmado deja el pedido en PAGADO_BUSCANDO_REPARTIDOR
        IniciarPagoResponse iniciado =
            pagoService.iniciar(ctx.pedido.getId(), ctx.cliente.getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());
        assertThat(pedidoRepository.findById(ctx.pedido.getId()).orElseThrow().getEstado())
            .isEqualTo(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);

        // Para llegar a ACEPTADO el pedido va antes a PAGADO_ESPERANDO_COMERCIO
        pedidoService.cambiarEstado(ctx.pedido.getId(), EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        pedidoService.aceptar(ctx.comercio, ctx.pedido.getId());

        // Como el listener async no corre dentro de la TX del test, creamos la
        // solicitud llamando al service directamente — el cuerpo del listener.
        Pedido aceptado = pedidoRepository.findById(ctx.pedido.getId()).orElseThrow();
        SolicitudDelivery solicitud = solicitudDeliveryService.crearParaPedido(aceptado);
        assertThat(solicitud.getEstado()).isEqualTo(EstadoSolicitudDelivery.BUSCANDO);

        // El repartidor ve la solicitud disponible
        List<SolicitudDeliveryResponse> disponibles = solicitudDeliveryService.listarDisponibles();
        assertThat(disponibles).extracting(SolicitudDeliveryResponse::getId).contains(solicitud.getId());

        // Acepta, recoge, entrega
        SolicitudDeliveryResponse asignada =
            solicitudDeliveryService.aceptar(ctx.repartidor, solicitud.getId());
        assertThat(asignada.getEstado()).isEqualTo(EstadoSolicitudDelivery.ASIGNADO);
        assertThat(asignada.getRepartidorId()).isEqualTo(ctx.repartidor.getId());

        // El comercio aún tiene que dejarlo listo para delivery (es el flujo real)
        pedidoService.iniciarPreparacion(ctx.comercio, ctx.pedido.getId());
        pedidoService.marcarListo(ctx.comercio, ctx.pedido.getId());

        solicitudDeliveryService.confirmarRecogida(ctx.repartidor, solicitud.getId());
        solicitudDeliveryService.confirmarEntrega(ctx.repartidor, solicitud.getId());

        Pedido entregado = pedidoRepository.findById(ctx.pedido.getId()).orElseThrow();
        assertThat(entregado.getEstado()).isEqualTo(EstadoPedido.ENTREGADO);
        assertThat(entregado.getEntregadoAt()).isNotNull();

        SolicitudDelivery solicitudFinal =
            solicitudDeliveryRepository.findById(solicitud.getId()).orElseThrow();
        assertThat(solicitudFinal.getEstado()).isEqualTo(EstadoSolicitudDelivery.ENTREGADO);

        // El listener async no corre dentro de la TX; invocamos el proceso de negocio
        // directamente para verificar que registra los 50 QueuePoints
        entregaCompletadaListener.procesarEntrega(ctx.pedido.getId());

        SaldoResponse saldo = queuePointsService.saldoDe(ctx.repartidor);
        assertThat(saldo.getSaldo()).isEqualTo(50);
    }

    @Test
    @DisplayName("idempotencia del listener: procesar dos veces el mismo evento no duplica el movimiento")
    void listenerIdempotente() {
        Contexto ctx = prepararPedidoDelivery();
        IniciarPagoResponse iniciado =
            pagoService.iniciar(ctx.pedido.getId(), ctx.cliente.getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());
        pedidoService.cambiarEstado(ctx.pedido.getId(), EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        pedidoService.aceptar(ctx.comercio, ctx.pedido.getId());

        Pedido aceptado = pedidoRepository.findById(ctx.pedido.getId()).orElseThrow();
        SolicitudDelivery solicitud = solicitudDeliveryService.crearParaPedido(aceptado);
        solicitudDeliveryService.aceptar(ctx.repartidor, solicitud.getId());
        pedidoService.iniciarPreparacion(ctx.comercio, ctx.pedido.getId());
        pedidoService.marcarListo(ctx.comercio, ctx.pedido.getId());
        solicitudDeliveryService.confirmarRecogida(ctx.repartidor, solicitud.getId());
        solicitudDeliveryService.confirmarEntrega(ctx.repartidor, solicitud.getId());

        // Invocamos dos veces el proceso de negocio para verificar idempotencia
        entregaCompletadaListener.procesarEntrega(ctx.pedido.getId());
        entregaCompletadaListener.procesarEntrega(ctx.pedido.getId()); // reentrega

        List<MovimientoQueuePoints> movs =
            movimientoRepository.findByUsuarioIdOrderByCreatedAtDescIdDesc(ctx.repartidor.getId());
        long movsDeEntrega = movs.stream()
            .filter(m -> m.getTipo() == TipoMovimiento.GANADO
                && "PEDIDO".equals(m.getReferenciaTipo())
                && ctx.pedido.getId().equals(m.getReferenciaId()))
            .count();
        assertThat(movsDeEntrega).isEqualTo(1);
        assertThat(queuePointsService.saldoDe(ctx.repartidor).getSaldo()).isEqualTo(50);
    }

    @Test
    @DisplayName("la creación de SolicitudDelivery es idempotente: dos llamadas no crean dos solicitudes")
    void crearSolicitudIdempotente() {
        Contexto ctx = prepararPedidoDelivery();
        IniciarPagoResponse iniciado =
            pagoService.iniciar(ctx.pedido.getId(), ctx.cliente.getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());
        pedidoService.cambiarEstado(ctx.pedido.getId(), EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        pedidoService.aceptar(ctx.comercio, ctx.pedido.getId());

        Pedido aceptado = pedidoRepository.findById(ctx.pedido.getId()).orElseThrow();
        SolicitudDelivery primera = solicitudDeliveryService.crearParaPedido(aceptado);
        SolicitudDelivery segunda = solicitudDeliveryService.crearParaPedido(aceptado);

        assertThat(segunda.getId()).isEqualTo(primera.getId());
    }

    @Test
    @DisplayName("aceptar una solicitud ya asignada lanza BusinessRuleException (state-machine guard; la cobertura de concurrencia real requiere dos hilos distintos)")
    void aceptarSolicitudYaAsignadaFalla() {
        Contexto ctx = prepararPedidoDelivery();
        IniciarPagoResponse iniciado =
            pagoService.iniciar(ctx.pedido.getId(), ctx.cliente.getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());
        pedidoService.cambiarEstado(ctx.pedido.getId(), EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        pedidoService.aceptar(ctx.comercio, ctx.pedido.getId());

        Pedido aceptado = pedidoRepository.findById(ctx.pedido.getId()).orElseThrow();
        SolicitudDelivery solicitud = solicitudDeliveryService.crearParaPedido(aceptado);
        solicitudDeliveryService.aceptar(ctx.repartidor, solicitud.getId());

        Usuario otroRepartidor = registrarRepartidorDisponible(
            "rep2-" + UUID.randomUUID() + "@utec.edu.pe");

        assertThatThrownBy(() ->
            solicitudDeliveryService.aceptar(otroRepartidor, solicitud.getId()))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no está disponible");
    }

    @Test
    @DisplayName("solo el repartidor asignado puede confirmar recogida/entrega")
    void otroRepartidorNoPuedeConfirmar() {
        Contexto ctx = prepararPedidoDelivery();
        IniciarPagoResponse iniciado =
            pagoService.iniciar(ctx.pedido.getId(), ctx.cliente.getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());
        pedidoService.cambiarEstado(ctx.pedido.getId(), EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        pedidoService.aceptar(ctx.comercio, ctx.pedido.getId());

        Pedido aceptado = pedidoRepository.findById(ctx.pedido.getId()).orElseThrow();
        SolicitudDelivery solicitud = solicitudDeliveryService.crearParaPedido(aceptado);
        solicitudDeliveryService.aceptar(ctx.repartidor, solicitud.getId());

        Usuario otroRepartidor = registrarRepartidorDisponible(
            "rep3-" + UUID.randomUUID() + "@utec.edu.pe");

        assertThatThrownBy(() ->
            solicitudDeliveryService.confirmarRecogida(otroRepartidor, solicitud.getId()))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no está asignada a vos");
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private record Contexto(Usuario cliente, Usuario comercio, Usuario repartidor, Pedido pedido) { }

    private Contexto prepararPedidoDelivery() {
        String suf = UUID.randomUUID().toString().substring(0, 8);
        Usuario comercio = registrar("comercio-" + suf + "@utec.edu.pe", Rol.COMERCIO);
        Usuario cliente  = registrar("cliente-" + suf + "@utec.edu.pe", Rol.CLIENTE);
        Usuario repartidor = registrarRepartidorDisponible("rep-" + suf + "@utec.edu.pe");

        PuntoDeVentaResponse local =
            puntoDeVentaService.crearComoComercio(comercio, localRequest("Local " + suf));
        ProductoResponse producto = productoService.crear(comercio,
            productoRequest(local.getId(), "Bowl", "18.00"));

        PedidoResponse creado = pedidoService.crear(cliente,
            pedidoRequest(local.getId(), TipoEntrega.DELIVERY, "Patio central",
                producto.getId(), 1));
        Pedido pedido = pedidoRepository.findById(creado.getId()).orElseThrow();
        return new Contexto(cliente, comercio, repartidor, pedido);
    }

    private Usuario registrar(String email, Rol... roles) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("password123");
        request.setNombreCompleto("Demo " + email);
        request.setRoles(new HashSet<>(Set.of(roles)));
        authService.register(request);
        return usuarioRepository.findByEmail(email).orElseThrow();
    }

    private Usuario registrarRepartidorDisponible(String email) {
        Usuario repartidor = registrar(email, Rol.REPARTIDOR);
        PerfilRepartidor perfil = perfilRepartidorRepository.findById(repartidor.getId()).orElseThrow();
        perfil.setDisponible(true);
        perfilRepartidorRepository.save(perfil);
        return repartidor;
    }

    private CrearPuntoDeVentaRequest localRequest(String nombre) {
        CrearPuntoDeVentaRequest request = new CrearPuntoDeVentaRequest();
        request.setNombre(nombre);
        request.setUbicacion("Bloque A");
        return request;
    }

    private CrearProductoRequest productoRequest(Long puntoDeVentaId, String nombre, String precio) {
        CrearProductoRequest request = new CrearProductoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setNombre(nombre);
        request.setPrecio(new BigDecimal(precio));
        request.setTipoPreparacion(TipoPreparacion.PREPARADO);
        return request;
    }

    private CrearPedidoRequest pedidoRequest(Long puntoDeVentaId, TipoEntrega tipoEntrega,
                                             String zonaEntrega, Long productoId, int cantidad) {
        ItemPedidoRequest item = new ItemPedidoRequest();
        item.setProductoId(productoId);
        item.setCantidad(cantidad);
        List<ItemPedidoRequest> items = new ArrayList<>();
        items.add(item);
        CrearPedidoRequest request = new CrearPedidoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setTipoEntrega(tipoEntrega);
        request.setZonaEntrega(zonaEntrega);
        request.setItems(items);
        return request;
    }
}
