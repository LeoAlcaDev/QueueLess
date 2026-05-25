package pe.edu.utec.queueless.pago;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.pago.controller.PagoController;
import pe.edu.utec.queueless.pago.dto.IniciarPagoResponse;
import pe.edu.utec.queueless.pago.service.PagoService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifica que un cliente no puede tocar pagos ni pedidos de otro cliente.
 * Tanto iniciar como consultar responden como si el recurso no existiera
 * (404), para no revelar la existencia de recursos ajenos.
 */
@ActiveProfiles("test")
@Transactional
class PagoSeguridadIT extends AbstractIntegrationTest {

    @Autowired private PagoService pagoService;
    @Autowired private PagoController pagoController;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PuntoDeVentaRepository puntoDeVentaRepository;

    @Test
    @DisplayName("un cliente no puede iniciar el pago del pedido de otro (404)")
    void iniciarPagoDePedidoAjeno() {
        Usuario clienteA = crearCliente();
        Usuario clienteB = crearCliente();
        PuntoDeVenta local = crearLocal(crearCliente());
        Pedido pedidoDeA = crearPedidoPendiente(clienteA, local);

        assertThatThrownBy(() -> pagoService.iniciar(pedidoDeA.getId(), clienteB.getId()))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("un cliente no puede consultar el pago de otro (404)")
    void consultarPagoAjeno() {
        Usuario clienteA = crearCliente();
        Usuario clienteB = crearCliente();
        PuntoDeVenta local = crearLocal(crearCliente());
        Pedido pedidoDeA = crearPedidoPendiente(clienteA, local);
        IniciarPagoResponse pagoDeA = pagoService.iniciar(pedidoDeA.getId(), clienteA.getId());

        Authentication authB = new UsernamePasswordAuthenticationToken(clienteB.getEmail(), null);

        assertThatThrownBy(() -> pagoController.consultar(authB, pagoDeA.getPagoId()))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    private Usuario crearCliente() {
        Usuario cliente = Usuario.builder()
            .email("cli-" + UUID.randomUUID() + "@utec.edu.pe")
            .passwordHash("hash")
            .nombreCompleto("Cliente IT")
            .activo(true)
            .roles(new HashSet<>(Set.of(Rol.CLIENTE)))
            .build();
        return usuarioRepository.save(cliente);
    }

    private PuntoDeVenta crearLocal(Usuario gestor) {
        PuntoDeVenta local = PuntoDeVenta.builder()
            .nombre("Cafe IT " + UUID.randomUUID())
            .ubicacion("Bloque A")
            .gestor(gestor)
            .build();
        return puntoDeVentaRepository.save(local);
    }

    private Pedido crearPedidoPendiente(Usuario cliente, PuntoDeVenta local) {
        Pedido pedido = Pedido.builder()
            .codigo("P-" + UUID.randomUUID().toString().substring(0, 8))
            .cliente(cliente)
            .puntoDeVenta(local)
            .estado(EstadoPedido.PENDIENTE_PAGO)
            .tipoEntrega(TipoEntrega.PICKUP)
            .subtotal(new BigDecimal("25.00"))
            .total(new BigDecimal("25.00"))
            .build();
        return pedidoRepository.save(pedido);
    }
}
