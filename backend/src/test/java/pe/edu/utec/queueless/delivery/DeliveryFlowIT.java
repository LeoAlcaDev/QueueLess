package pe.edu.utec.queueless.delivery;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
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
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
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
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.BooleanSupplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * E2E del flujo DELIVERY ejercitando el cableado real: pago confirmado ->
 * (listener) crea la solicitud -> repartidor acepta -> el pedido pasa a esperar
 * al comercio -> comercio prepara -> repartidor recoge y entrega -> (listener)
 * otorga QueuePoints.
 *
 * <p>Los listeners corren después del commit y en otro hilo, por eso el test no
 * es transaccional (deja que cada paso confirme) y espera con un sondeo corto a
 * que el efecto asíncrono ocurra.
 */
@ActiveProfiles("test")
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
    @DisplayName("flujo DELIVERY end-to-end por el cableado real: pago -> solicitud -> aceptar -> entrega -> 50 QueuePoints")
    void flujoDeliveryEndToEnd() {
        Contexto ctx = prepararPedidoDelivery();

        // Pago confirmado deja el pedido buscando repartidor.
        IniciarPagoResponse iniciado = pagoService.iniciar(ctx.pedido().getId(), ctx.cliente().getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());
        assertThat(estadoPedido(ctx)).isEqualTo(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);

        // El listener crea la SolicitudDelivery tras el commit; esperamos a que aparezca.
        esperarHasta("se crea la SolicitudDelivery en BUSCANDO", () -> solicitudBuscando(ctx).isPresent());
        SolicitudDelivery solicitud = solicitudDeliveryRepository
            .findByPedidoId(ctx.pedido().getId()).orElseThrow();

        // El repartidor la ve disponible y la acepta; el pedido pasa a esperar al comercio.
        assertThat(solicitudDeliveryService.listarDisponibles())
            .extracting(SolicitudDeliveryResponse::getId).contains(solicitud.getId());
        solicitudDeliveryService.aceptar(ctx.repartidor(), solicitud.getId());
        assertThat(estadoPedido(ctx)).isEqualTo(EstadoPedido.PAGADO_ESPERANDO_COMERCIO);

        // El comercio recién ahora puede aceptar; prepara y deja listo para delivery.
        pedidoService.aceptar(ctx.comercio(), ctx.pedido().getId());
        pedidoService.iniciarPreparacion(ctx.comercio(), ctx.pedido().getId());
        pedidoService.marcarListo(ctx.comercio(), ctx.pedido().getId());

        // El repartidor recoge y entrega; el pedido queda ENTREGADO y se otorgan los puntos.
        solicitudDeliveryService.confirmarRecogida(ctx.repartidor(), solicitud.getId());
        solicitudDeliveryService.confirmarEntrega(ctx.repartidor(), solicitud.getId());
        assertThat(estadoPedido(ctx)).isEqualTo(EstadoPedido.ENTREGADO);
        assertThat(solicitudDeliveryRepository.findById(solicitud.getId()).orElseThrow().getEstado())
            .isEqualTo(EstadoSolicitudDelivery.ENTREGADO);

        esperarHasta("el repartidor recibe 50 QueuePoints", () ->
            queuePointsService.saldoDe(ctx.repartidor()).getSaldo() == 50);
    }

    @Test
    @DisplayName("la creación de la solicitud es idempotente: una segunda llamada devuelve la misma")
    void crearSolicitudIdempotente() {
        Contexto ctx = prepararPedidoDelivery();
        pagarYConfirmar(ctx);
        esperarHasta("se crea la SolicitudDelivery", () -> solicitudBuscando(ctx).isPresent());

        SolicitudDelivery primera = solicitudDeliveryRepository.findByPedidoId(ctx.pedido().getId()).orElseThrow();
        Pedido pedido = pedidoRepository.findById(ctx.pedido().getId()).orElseThrow();
        SolicitudDelivery segunda = solicitudDeliveryService.crearParaPedido(pedido);

        assertThat(segunda.getId()).isEqualTo(primera.getId());
    }

    @Test
    @DisplayName("aceptar una solicitud ya asignada lanza BusinessRuleException")
    void aceptarSolicitudYaAsignadaFalla() {
        Contexto ctx = prepararPedidoDelivery();
        pagarYConfirmar(ctx);
        esperarHasta("se crea la SolicitudDelivery", () -> solicitudBuscando(ctx).isPresent());
        SolicitudDelivery solicitud = solicitudDeliveryRepository.findByPedidoId(ctx.pedido().getId()).orElseThrow();

        solicitudDeliveryService.aceptar(ctx.repartidor(), solicitud.getId());
        Usuario otroRepartidor = registrarRepartidorDisponible("rep2-" + UUID.randomUUID() + "@utec.edu.pe");

        assertThatThrownBy(() -> solicitudDeliveryService.aceptar(otroRepartidor, solicitud.getId()))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no está disponible");
    }

    @Test
    @DisplayName("solo el repartidor asignado puede confirmar la recogida")
    void otroRepartidorNoPuedeConfirmar() {
        Contexto ctx = prepararPedidoDelivery();
        pagarYConfirmar(ctx);
        esperarHasta("se crea la SolicitudDelivery", () -> solicitudBuscando(ctx).isPresent());
        SolicitudDelivery solicitud = solicitudDeliveryRepository.findByPedidoId(ctx.pedido().getId()).orElseThrow();

        solicitudDeliveryService.aceptar(ctx.repartidor(), solicitud.getId());
        Usuario otroRepartidor = registrarRepartidorDisponible("rep3-" + UUID.randomUUID() + "@utec.edu.pe");

        assertThatThrownBy(() -> solicitudDeliveryService.confirmarRecogida(otroRepartidor, solicitud.getId()))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no está asignada a vos");
    }

    @Test
    @DisplayName("el registro de QueuePoints es idempotente: re-procesar la entrega no duplica puntos")
    void registroDePuntosIdempotente() {
        Contexto ctx = prepararPedidoDelivery();
        pagarYConfirmar(ctx);
        esperarHasta("se crea la SolicitudDelivery", () -> solicitudBuscando(ctx).isPresent());
        SolicitudDelivery solicitud = solicitudDeliveryRepository.findByPedidoId(ctx.pedido().getId()).orElseThrow();

        solicitudDeliveryService.aceptar(ctx.repartidor(), solicitud.getId());
        pedidoService.aceptar(ctx.comercio(), ctx.pedido().getId());
        pedidoService.iniciarPreparacion(ctx.comercio(), ctx.pedido().getId());
        pedidoService.marcarListo(ctx.comercio(), ctx.pedido().getId());
        solicitudDeliveryService.confirmarRecogida(ctx.repartidor(), solicitud.getId());
        solicitudDeliveryService.confirmarEntrega(ctx.repartidor(), solicitud.getId());

        esperarHasta("el repartidor recibe 50 QueuePoints", () ->
            queuePointsService.saldoDe(ctx.repartidor()).getSaldo() == 50);

        // Re-procesar el mismo evento no debe sumar otra vez (idempotencia por referencia).
        entregaCompletadaListener.onEntregaCompletada(new PedidoEstadoCambiadoEvent(
            ctx.pedido().getId(), EstadoPedido.LISTO_PARA_DELIVERY, EstadoPedido.ENTREGADO));

        long movimientosDeEntrega = movimientoRepository
            .findByUsuarioIdOrderByCreatedAtDescIdDesc(ctx.repartidor().getId()).stream()
            .filter(m -> ctx.pedido().getId().equals(m.getReferenciaId()))
            .count();
        assertThat(movimientosDeEntrega).isEqualTo(1);
        assertThat(queuePointsService.saldoDe(ctx.repartidor()).getSaldo()).isEqualTo(50);
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private record Contexto(Usuario cliente, Usuario comercio, Usuario repartidor, Pedido pedido) { }

    private EstadoPedido estadoPedido(Contexto ctx) {
        return pedidoRepository.findById(ctx.pedido().getId()).orElseThrow().getEstado();
    }

    private Optional<SolicitudDelivery> solicitudBuscando(Contexto ctx) {
        return solicitudDeliveryRepository.findByPedidoId(ctx.pedido().getId())
            .filter(s -> s.getEstado() == EstadoSolicitudDelivery.BUSCANDO);
    }

    private void pagarYConfirmar(Contexto ctx) {
        IniciarPagoResponse iniciado = pagoService.iniciar(ctx.pedido().getId(), ctx.cliente().getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());
    }

    private void esperarHasta(String descripcion, BooleanSupplier condicion) {
        long limite = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < limite) {
            if (condicion.getAsBoolean()) {
                return;
            }
            dormir();
        }
        throw new AssertionError("La condición no se cumplió a tiempo: " + descripcion);
    }

    private void dormir() {
        try {
            Thread.sleep(100);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    private Contexto prepararPedidoDelivery() {
        String suf = UUID.randomUUID().toString().substring(0, 8);
        Usuario comercio = registrar("comercio-" + suf + "@utec.edu.pe", Rol.COMERCIO);
        Usuario cliente = registrar("cliente-" + suf + "@utec.edu.pe", Rol.CLIENTE);
        Usuario repartidor = registrarRepartidorDisponible("rep-" + suf + "@utec.edu.pe");

        PuntoDeVentaResponse local =
            puntoDeVentaService.crearComoComercio(comercio, localRequest("Local " + suf));
        ProductoResponse producto = productoService.crear(comercio,
            productoRequest(local.getId(), "Bowl", "18.00"));

        PedidoResponse creado = pedidoService.crear(cliente,
            pedidoRequest(local.getId(), TipoEntrega.DELIVERY, "Patio central", producto.getId(), 1));
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
