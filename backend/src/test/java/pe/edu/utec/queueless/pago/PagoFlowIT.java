package pe.edu.utec.queueless.pago;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.pago.dto.IniciarPagoResponse;
import pe.edu.utec.queueless.pago.entity.EstadoPago;
import pe.edu.utec.queueless.pago.entity.Pago;
import pe.edu.utec.queueless.pago.repository.PagoRepository;
import pe.edu.utec.queueless.pago.service.PagoService;
import pe.edu.utec.queueless.pago.service.ReembolsoService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Flujo end-to-end del pago contra Postgres real (TestContainers).
 *
 * <p>Cubre: iniciar pago con gateway mock → confirmar vía referencia → pedido
 * pasa al siguiente estado → cancelación desde estado pagado dispara reembolso.
 * No se invoca el endpoint del webhook directamente; se ejercita el service
 * para no depender del listener asíncrono dentro de la misma transacción de test.
 */
@ActiveProfiles("test")
@Transactional
class PagoFlowIT extends AbstractIntegrationTest {

    @Autowired private PagoService pagoService;
    @Autowired private PedidoService pedidoService;
    @Autowired private ReembolsoService reembolsoService;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private PagoRepository pagoRepository;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PuntoDeVentaRepository puntoDeVentaRepository;

    private Usuario crearCliente() {
        Usuario cliente = Usuario.builder()
            .email("cli-" + UUID.randomUUID() + "@utec.edu.pe")
            .passwordHash("hash")
            .nombreCompleto("Cliente IT")
            .activo(true)
            .roles(new java.util.HashSet<>(Set.of(Rol.CLIENTE)))
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

    private Pedido crearPedidoPendiente(Usuario cliente, PuntoDeVenta local, TipoEntrega tipoEntrega) {
        Pedido pedido = Pedido.builder()
            .codigo("P-" + UUID.randomUUID().toString().substring(0, 8))
            .cliente(cliente)
            .puntoDeVenta(local)
            .estado(EstadoPedido.PENDIENTE_PAGO)
            .tipoEntrega(tipoEntrega)
            .subtotal(new BigDecimal("25.00"))
            .total(new BigDecimal("25.00"))
            .build();
        return pedidoRepository.save(pedido);
    }

    @Test
    @DisplayName("flujo completo: iniciar pago (PICKUP) → confirmar → pedido pasa a PAGADO_ESPERANDO_COMERCIO")
    void flujoCompletoMockPickup() {
        Usuario cliente = crearCliente();
        Usuario gestor = crearCliente();
        PuntoDeVenta local = crearLocal(gestor);
        Pedido pedido = crearPedidoPendiente(cliente, local, TipoEntrega.PICKUP);

        IniciarPagoResponse iniciado = pagoService.iniciar(pedido.getId(), cliente.getId());

        assertThat(iniciado.getEstado()).isEqualTo(EstadoPago.PENDIENTE);
        assertThat(iniciado.getReferenciaExterna()).startsWith("mock-");
        assertThat(iniciado.getUrlCheckout()).contains("/api/pago/webhook/mock");

        pagoService.confirmar(iniciado.getReferenciaExterna());

        Pago refrescado = pagoRepository.findById(iniciado.getPagoId()).orElseThrow();
        assertThat(refrescado.getEstado()).isEqualTo(EstadoPago.CONFIRMADO);
        assertThat(refrescado.getConfirmadoAt()).isNotNull();

        Pedido pedidoRefrescado = pedidoRepository.findById(pedido.getId()).orElseThrow();
        assertThat(pedidoRefrescado.getEstado()).isEqualTo(EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        assertThat(pedidoRefrescado.getPagadoAt()).isNotNull();
    }

    @Test
    @DisplayName("flujo DELIVERY: confirmar lleva el pedido a PAGADO_BUSCANDO_REPARTIDOR")
    void flujoDeliveryLlegaABuscandoRepartidor() {
        Usuario cliente = crearCliente();
        Usuario gestor = crearCliente();
        PuntoDeVenta local = crearLocal(gestor);
        Pedido pedido = crearPedidoPendiente(cliente, local, TipoEntrega.DELIVERY);

        IniciarPagoResponse iniciado = pagoService.iniciar(pedido.getId(), cliente.getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());

        Pedido pedidoRefrescado = pedidoRepository.findById(pedido.getId()).orElseThrow();
        assertThat(pedidoRefrescado.getEstado()).isEqualTo(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR);
    }

    @Test
    @DisplayName("reembolso: cancelar un pedido pagado deja el pago en REEMBOLSADO")
    void cancelarPagoConfirmadoEmiteReembolso() {
        Usuario cliente = crearCliente();
        Usuario gestor = crearCliente();
        PuntoDeVenta local = crearLocal(gestor);
        Pedido pedido = crearPedidoPendiente(cliente, local, TipoEntrega.PICKUP);
        IniciarPagoResponse iniciado = pagoService.iniciar(pedido.getId(), cliente.getId());
        pagoService.confirmar(iniciado.getReferenciaExterna());

        // El listener corre @Async después de commit (fuera de la TX del test).
        // Ejercitamos el ReembolsoService directamente para validar la lógica
        // sin depender del scheduler en este IT.
        pedidoService.cambiarEstado(pedido.getId(), EstadoPedido.CANCELADO_POR_CLIENTE);
        reembolsoService.emitirReembolso(pedido.getId());

        Pago refrescado = pagoRepository.findById(iniciado.getPagoId()).orElseThrow();
        assertThat(refrescado.getEstado()).isEqualTo(EstadoPago.REEMBOLSADO);
        assertThat(refrescado.getReembolsadoAt()).isNotNull();
    }
}
