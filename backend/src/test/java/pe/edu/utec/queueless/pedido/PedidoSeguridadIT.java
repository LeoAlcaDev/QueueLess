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
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Reglas de propiedad del pedido contra un Postgres real: un cliente no toca pedidos
 * de otro, un comercio no opera sobre pedidos de un local que no es suyo.
 */
@ActiveProfiles("test")
@Transactional
class PedidoSeguridadIT extends AbstractIntegrationTest {

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

    @Test
    @DisplayName("un cliente no puede ver el detalle del pedido de otro cliente (404)")
    void clienteNoVeDetalleAjeno() {
        // Arrange
        PedidoResponse pedidoDeB = crearPedidoDeUnCliente("b.detalle@utec.edu.pe");
        Usuario clienteA = registrar("a.detalle@utec.edu.pe", Rol.CLIENTE);

        // Act + Assert
        assertThatThrownBy(() -> pedidoService.verDetalleDeMiPedido(clienteA, pedidoDeB.getId()))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("un cliente no puede cancelar el pedido de otro cliente (404)")
    void clienteNoCancelaAjeno() {
        // Arrange
        PedidoResponse pedidoDeB = crearPedidoDeUnCliente("b.cancelar@utec.edu.pe");
        Usuario clienteA = registrar("a.cancelar@utec.edu.pe", Rol.CLIENTE);

        // Act + Assert
        assertThatThrownBy(() -> pedidoService.cancelarPorCliente(clienteA, pedidoDeB.getId(), null))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("un comercio no puede aceptar un pedido de un local que no es suyo")
    void comercioNoAceptaPedidoAjeno() {
        // Arrange: comercio Y tiene el local y el pedido (ya pagado)
        Usuario comercioY = registrar("y.local@utec.edu.pe", Rol.COMERCIO);
        PuntoDeVentaResponse localY = puntoDeVentaService.crearComoComercio(comercioY, localRequest("Local Y"));
        ProductoResponse productoY = productoService.crear(comercioY, productoRequest(localY.getId(), "Algo", "5.00"));
        Usuario cliente = registrar("cliente.seg@utec.edu.pe", Rol.CLIENTE);
        PedidoResponse pedido = pedidoService.crear(cliente,
            pedidoRequest(localY.getId(), productoY.getId()));
        pedidoService.cambiarEstado(pedido.getId(), EstadoPedido.PAGADO_ESPERANDO_COMERCIO);

        Usuario comercioX = registrar("x.intruso@utec.edu.pe", Rol.COMERCIO);

        // Act + Assert
        assertThatThrownBy(() -> pedidoService.aceptar(comercioX, pedido.getId()))
            .isInstanceOf(BusinessRuleException.class);
    }

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    /** Registra un comercio con su local y producto, y deja un pedido creado por el cliente dado. */
    private PedidoResponse crearPedidoDeUnCliente(String emailCliente) {
        Usuario comercio = registrar("comercio." + emailCliente, Rol.COMERCIO);
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest("Local"));
        ProductoResponse producto = productoService.crear(comercio, productoRequest(local.getId(), "Algo", "5.00"));
        Usuario cliente = registrar(emailCliente, Rol.CLIENTE);
        return pedidoService.crear(cliente, pedidoRequest(local.getId(), producto.getId()));
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

    private CrearPedidoRequest pedidoRequest(Long puntoDeVentaId, Long productoId) {
        ItemPedidoRequest item = new ItemPedidoRequest();
        item.setProductoId(productoId);
        item.setCantidad(1);

        List<ItemPedidoRequest> items = new ArrayList<>();
        items.add(item);

        CrearPedidoRequest request = new CrearPedidoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setTipoEntrega(TipoEntrega.PICKUP);
        request.setItems(items);
        return request;
    }
}
