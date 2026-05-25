package pe.edu.utec.queueless.pedido;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatcher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.notification.dto.PushNotification;
import pe.edu.utec.queueless.notification.service.NotificationService;
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
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

/**
 * Flujo PICKUP de punta a punta contra Postgres real, verificando que se despacha la
 * notificación al cliente. No es transaccional a propósito: los eventos se publican al
 * confirmar cada transacción, así el listener asíncrono alcanza a correr.
 */
@ActiveProfiles("test")
class PickupFlowIT extends AbstractIntegrationTest {

    @Autowired private AuthService authService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PuntoDeVentaService puntoDeVentaService;
    @Autowired private ProductoService productoService;
    @Autowired private PedidoService pedidoService;
    @Autowired private PedidoRepository pedidoRepository;

    @MockBean private NotificationService notificationService;

    @Test
    @DisplayName("PICKUP de punta a punta: llega a ENTREGADO y avisa al cliente")
    void flujoPickupConNotificacion() {
        Usuario comercio = registrar("comercio.pickup@utec.edu.pe", Rol.COMERCIO);
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest());
        ProductoResponse producto = productoService.crear(comercio, productoRequest(local.getId()));
        Usuario cliente = registrar("cliente.pickup@utec.edu.pe", Rol.CLIENTE);

        PedidoResponse creado = pedidoService.crear(cliente, pedidoRequest(local.getId(), producto.getId()));
        Long pedidoId = creado.getId();

        pedidoService.cambiarEstado(pedidoId, EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        pedidoService.aceptar(comercio, pedidoId);
        pedidoService.iniciarPreparacion(comercio, pedidoId);
        pedidoService.marcarListo(comercio, pedidoId);
        pedidoService.marcarEntregado(comercio, pedidoId);

        Pedido persistido = pedidoRepository.findById(pedidoId).orElseThrow();
        assertThat(persistido.getEstado()).isEqualTo(EstadoPedido.ENTREGADO);

        // El listener corre asíncrono tras el commit; esperamos a que despache el aviso
        // de "Entregado" al canal del cliente.
        verify(notificationService, timeout(5000)).notificar(argThat(esEntregadoPara(cliente.getId())));
    }

    private ArgumentMatcher<PushNotification> esEntregadoPara(Long clienteId) {
        return push -> push != null
            && ("cliente-" + clienteId).equals(push.getTopic())
            && "Entregado".equals(push.getTitulo());
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

    private CrearPuntoDeVentaRequest localRequest() {
        CrearPuntoDeVentaRequest request = new CrearPuntoDeVentaRequest();
        request.setNombre("Cafe Pickup");
        request.setUbicacion("Bloque A");
        return request;
    }

    private CrearProductoRequest productoRequest(Long puntoDeVentaId) {
        CrearProductoRequest request = new CrearProductoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setNombre("Cafe");
        request.setPrecio(new BigDecimal("7.00"));
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
