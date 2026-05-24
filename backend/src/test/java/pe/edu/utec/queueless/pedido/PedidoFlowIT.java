package pe.edu.utec.queueless.pedido;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
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
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Flujo de un pedido de punta a punta contra un Postgres real (TestContainers).
 * Cada test corre en su propia transacción con rollback, así la base queda limpia.
 */
@ActiveProfiles("test")
@Transactional
class PedidoFlowIT extends AbstractIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PuntoDeVentaService puntoDeVentaService;

    @Autowired
    private ProductoService productoService;

    @Autowired
    private PedidoService pedidoService;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Test
    @DisplayName("flujo PICKUP completo: el pedido pasa por los 6 estados con sus timestamps")
    void flujoPickupCompleto() {
        // Arrange
        Usuario comercio = registrar("comercio.flow@utec.edu.pe", Rol.COMERCIO);
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest("Cafe Flow"));
        ProductoResponse producto = productoService.crear(comercio, productoRequest(local.getId(), "Cafe", "7.00"));
        Usuario cliente = registrar("cliente.flow@utec.edu.pe", Rol.CLIENTE);

        // Act: el cliente crea el pedido (2 cafes)
        PedidoResponse creado = pedidoService.crear(cliente,
            pedidoRequest(local.getId(), TipoEntrega.PICKUP, null, producto.getId(), 2));

        // Assert: nace en PENDIENTE_PAGO con total y código
        assertThat(creado.getEstado()).isEqualTo(EstadoPedido.PENDIENTE_PAGO);
        assertThat(creado.getTotal()).isEqualByComparingTo("14.00");
        assertThat(creado.getCodigo()).startsWith("QL-");
        assertThat(creado.getCreadoAt()).isNotNull();
        assertThat(creado.getItems()).hasSize(1);

        Long pedidoId = creado.getId();

        // Act: se simula el pago (en Fase 4 lo hará el módulo de pagos)
        pedidoService.cambiarEstado(pedidoId, EstadoPedido.PAGADO_ESPERANDO_COMERCIO);

        // Assert: el pedido pagado ya aparece en la cola del comercio
        assertThat(pedidoService.listarColaDelComercio(comercio))
            .extracting(PedidoResponse::getId)
            .contains(pedidoId);

        // Act: el comercio mueve el pedido por la cola hasta entregarlo
        pedidoService.aceptar(comercio, pedidoId);
        pedidoService.iniciarPreparacion(comercio, pedidoId);
        PedidoResponse listo = pedidoService.marcarListo(comercio, pedidoId);
        assertThat(listo.getEstado()).isEqualTo(EstadoPedido.LISTO_PARA_RECOGER);
        pedidoService.marcarEntregado(comercio, pedidoId);

        // Assert: terminó en ENTREGADO con todos los timestamps de transición seteados
        Pedido persistido = pedidoRepository.findById(pedidoId).orElseThrow();
        assertThat(persistido.getEstado()).isEqualTo(EstadoPedido.ENTREGADO);
        assertThat(persistido.getPagadoAt()).isNotNull();
        assertThat(persistido.getAceptadoAt()).isNotNull();
        assertThat(persistido.getListoAt()).isNotNull();
        assertThat(persistido.getEntregadoAt()).isNotNull();
    }

    @Test
    @DisplayName("flujo DELIVERY: llega hasta LISTO_PARA_DELIVERY y el comercio no puede marcar entregado")
    void flujoDeliveryHastaListo() {
        // Arrange
        Usuario comercio = registrar("comercio.deli@utec.edu.pe", Rol.COMERCIO);
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest("Deli Flow"));
        ProductoResponse producto = productoService.crear(comercio, productoRequest(local.getId(), "Bowl", "18.00"));
        Usuario cliente = registrar("cliente.deli@utec.edu.pe", Rol.CLIENTE);

        PedidoResponse creado = pedidoService.crear(cliente,
            pedidoRequest(local.getId(), TipoEntrega.DELIVERY, "Patio central", producto.getId(), 1));
        Long pedidoId = creado.getId();

        // Simular pago y que se haya encontrado repartidor (Fases 4 y 5)
        pedidoService.cambiarEstado(pedidoId, EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
        pedidoService.cambiarEstado(pedidoId, EstadoPedido.PAGADO_ESPERANDO_COMERCIO);

        // Act
        pedidoService.aceptar(comercio, pedidoId);
        pedidoService.iniciarPreparacion(comercio, pedidoId);
        PedidoResponse listo = pedidoService.marcarListo(comercio, pedidoId);

        // Assert: un DELIVERY listo queda LISTO_PARA_DELIVERY
        assertThat(listo.getEstado()).isEqualTo(EstadoPedido.LISTO_PARA_DELIVERY);

        // La entrega de un DELIVERY no la confirma el comercio
        assertThatThrownBy(() -> pedidoService.marcarEntregado(comercio, pedidoId))
            .isInstanceOf(BusinessRuleException.class);
    }

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    private Usuario registrar(String email, Rol... roles) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("password123");
        request.setNombreCompleto("Demo " + email);
        request.setRoles(new HashSet<>(Set.of(roles)));
        authService.register(request);
        return usuarioRepository.findByEmail(email).orElseThrow();
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
