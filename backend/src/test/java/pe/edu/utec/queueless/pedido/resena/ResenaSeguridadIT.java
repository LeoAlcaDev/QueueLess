package pe.edu.utec.queueless.pedido.resena;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.pago.dto.IniciarPagoResponse;
import pe.edu.utec.queueless.pago.service.PagoService;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.ItemPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.resena.dto.CrearResenaRequest;
import pe.edu.utec.queueless.pedido.resena.entity.ObjetivoResena;
import pe.edu.utec.queueless.pedido.resena.service.ResenaService;
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
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Seguridad y reglas de las reseñas: un cliente solo puede reseñar su propio
 * pedido (uno ajeno se ve como inexistente, 404) y solo si está ENTREGADO.
 */
@ActiveProfiles("test")
@Transactional
class ResenaSeguridadIT extends AbstractIntegrationTest {

    @Autowired private AuthService authService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PuntoDeVentaService puntoDeVentaService;
    @Autowired private ProductoService productoService;
    @Autowired private PedidoService pedidoService;
    @Autowired private PagoService pagoService;
    @Autowired private ResenaService resenaService;

    @Test
    @DisplayName("un cliente no puede reseñar el pedido de otro cliente")
    void clienteAjenoNoPuedeResenar() {
        String suf = suf();
        Usuario comercio = registrar("comercio-" + suf + "@utec.edu.pe", Rol.COMERCIO);
        Usuario duenio = registrar("duenio-" + suf + "@utec.edu.pe", Rol.CLIENTE);
        Long pedidoId = crearPedido(comercio, duenio, suf, TipoEntrega.PICKUP);
        Usuario intruso = registrar("intruso-" + suf + "@utec.edu.pe", Rol.CLIENTE);

        assertThatThrownBy(() ->
            resenaService.crear(intruso, pedidoId, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 5)))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("no se puede reseñar un pedido que todavía no está ENTREGADO")
    void noSePuedeResenarPedidoNoEntregado() {
        String suf = suf();
        Usuario comercio = registrar("comercio-" + suf + "@utec.edu.pe", Rol.COMERCIO);
        Usuario cliente = registrar("cliente-" + suf + "@utec.edu.pe", Rol.CLIENTE);
        Long pedidoId = crearPedido(comercio, cliente, suf, TipoEntrega.PICKUP);

        // Avanzamos el pedido hasta EN_PREPARACION (todavía no entregado).
        IniciarPagoResponse iniciado = pagoService.iniciar(pedidoId, cliente.getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());
        pedidoService.aceptar(comercio, pedidoId);
        pedidoService.iniciarPreparacion(comercio, pedidoId);

        assertThatThrownBy(() ->
            resenaService.crear(cliente, pedidoId, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 4)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("ENTREGADO");
    }

    private Long crearPedido(Usuario comercio, Usuario cliente, String suf, TipoEntrega tipoEntrega) {
        PuntoDeVentaResponse local =
            puntoDeVentaService.crearComoComercio(comercio, localRequest("Local " + suf));
        ProductoResponse producto = productoService.crear(comercio,
            productoRequest(local.getId(), "Bowl", "18.00"));
        PedidoResponse pedido = pedidoService.crear(cliente,
            pedidoRequest(local.getId(), tipoEntrega, producto.getId()));
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

    private CrearResenaRequest request(ObjetivoResena objetivo, Short calificacion) {
        CrearResenaRequest r = new CrearResenaRequest();
        r.setObjetivoTipo(objetivo);
        r.setCalificacion(calificacion);
        return r;
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

    private CrearPedidoRequest pedidoRequest(Long puntoDeVentaId, TipoEntrega tipoEntrega, Long productoId) {
        ItemPedidoRequest item = new ItemPedidoRequest();
        item.setProductoId(productoId);
        item.setCantidad(1);
        List<ItemPedidoRequest> items = new ArrayList<>();
        items.add(item);
        CrearPedidoRequest request = new CrearPedidoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setTipoEntrega(tipoEntrega);
        request.setItems(items);
        return request;
    }
}
