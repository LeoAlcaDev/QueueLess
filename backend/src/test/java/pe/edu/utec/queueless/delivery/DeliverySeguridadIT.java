package pe.edu.utec.queueless.delivery;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.ItemPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Seguridad de las opciones del cliente en delivery: un cliente no puede operar
 * sobre el pedido de otro. Por convención del proyecto, un pedido ajeno se ve
 * como inexistente (404), no como prohibido.
 */
@ActiveProfiles("test")
@Transactional
class DeliverySeguridadIT extends AbstractIntegrationTest {

    @Autowired private AuthService authService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PuntoDeVentaService puntoDeVentaService;
    @Autowired private ProductoService productoService;
    @Autowired private PedidoService pedidoService;
    @Autowired private SolicitudDeliveryService solicitudDeliveryService;

    @Test
    @DisplayName("un cliente no puede cambiar a pickup el pedido de otro cliente")
    void clienteAjenoNoCambiaAPickup() {
        Long pedidoId = crearPedidoDeliveryDeOtroCliente();
        Usuario intruso = registrar("intruso-" + suf() + "@utec.edu.pe", Rol.CLIENTE);

        assertThatThrownBy(() -> solicitudDeliveryService.cambiarAPickup(intruso, pedidoId))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("un cliente no puede reintentar la búsqueda del pedido de otro cliente")
    void clienteAjenoNoReintentaBusqueda() {
        Long pedidoId = crearPedidoDeliveryDeOtroCliente();
        Usuario intruso = registrar("intruso-" + suf() + "@utec.edu.pe", Rol.CLIENTE);

        assertThatThrownBy(() -> solicitudDeliveryService.reintentarBusqueda(intruso, pedidoId))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    private Long crearPedidoDeliveryDeOtroCliente() {
        String suf = suf();
        Usuario comercio = registrar("comercio-" + suf + "@utec.edu.pe", Rol.COMERCIO);
        Usuario duenio = registrar("duenio-" + suf + "@utec.edu.pe", Rol.CLIENTE);
        PuntoDeVentaResponse local =
            puntoDeVentaService.crearComoComercio(comercio, localRequest("Local " + suf));
        ProductoResponse producto = productoService.crear(comercio,
            productoRequest(local.getId(), "Bowl", "18.00"));
        PedidoResponse pedido = pedidoService.crear(duenio,
            pedidoRequest(local.getId(), TipoEntrega.DELIVERY, "Patio central", producto.getId(), 1));
        return pedido.getId();
    }

    private String suf() {
        return UUID.randomUUID().toString().substring(0, 8);
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
