package pe.edu.utec.queueless.pedido.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests del repositorio de pedidos, en especial las consultas que alimentan el
 * tiempo de espera y los jobs de scheduling.
 */
class PedidoRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PuntoDeVentaRepository puntoDeVentaRepository;

    private Usuario cliente;
    private PuntoDeVenta puntoDeVenta;

    @BeforeEach
    void setUp() {
        cliente = usuarioRepository.save(usuario("cliente.ped@utec.edu.pe", Rol.CLIENTE));
        Usuario gestor = usuarioRepository.save(usuario("gestor.ped@utec.edu.pe", Rol.COMERCIO));
        puntoDeVenta = puntoDeVentaRepository.save(PuntoDeVenta.builder()
            .nombre("Local Pedidos").ubicacion("Bloque A").gestor(gestor).build());
    }

    @Test
    @DisplayName("countByPuntoDeVentaIdAndEstado cuenta solo los pedidos del local en ese estado")
    void shouldCountByPuntoDeVentaIdAndEstado() {
        pedidoRepository.save(pedido("QL-EP1", EstadoPedido.EN_PREPARACION));
        pedidoRepository.save(pedido("QL-EP2", EstadoPedido.EN_PREPARACION));
        pedidoRepository.save(pedido("QL-EN1", EstadoPedido.ENTREGADO));

        assertThat(pedidoRepository.countByPuntoDeVentaIdAndEstado(
            puntoDeVenta.getId(), EstadoPedido.EN_PREPARACION)).isEqualTo(2);
    }

    @Test
    @DisplayName("findByCodigo devuelve el pedido cuando el codigo existe")
    void shouldFindByCodigoWhenExists() {
        pedidoRepository.save(pedido("QL-COD9", EstadoPedido.PENDIENTE_PAGO));

        assertThat(pedidoRepository.findByCodigo("QL-COD9")).isPresent();
        assertThat(pedidoRepository.findByCodigo("QL-NOPE")).isEmpty();
    }

    @Test
    @DisplayName("el finder de entrenamiento trae solo entregados con ambos tiempos cargados")
    void shouldFindEntregadosWithBothTimestamps() {
        Pedido conTiempos = pedido("QL-OK", EstadoPedido.ENTREGADO);
        conTiempos.setAceptadoAt(Instant.now().minus(20, ChronoUnit.MINUTES));
        conTiempos.setListoAt(Instant.now().minus(5, ChronoUnit.MINUTES));
        pedidoRepository.save(conTiempos);
        pedidoRepository.save(pedido("QL-SINTIEMPOS", EstadoPedido.ENTREGADO));

        assertThat(pedidoRepository.findByEstadoAndAceptadoAtIsNotNullAndListoAtIsNotNull(
            EstadoPedido.ENTREGADO))
            .extracting(Pedido::getCodigo)
            .containsExactly("QL-OK");
    }

    @Test
    @DisplayName("el finder del job de cancelacion trae pendientes creados antes del corte")
    void shouldFindPendingOrdersCreatedBeforeCutoff() {
        pedidoRepository.save(pedido("QL-VIEJO", EstadoPedido.PENDIENTE_PAGO));

        Instant futuro = Instant.now().plus(1, ChronoUnit.HOURS);
        Instant pasado = Instant.now().minus(1, ChronoUnit.HOURS);

        assertThat(pedidoRepository.findByEstadoAndCreadoAtBefore(
            EstadoPedido.PENDIENTE_PAGO, futuro)).hasSize(1);
        assertThat(pedidoRepository.findByEstadoAndCreadoAtBefore(
            EstadoPedido.PENDIENTE_PAGO, pasado)).isEmpty();
    }

    private Pedido pedido(String codigo, EstadoPedido estado) {
        return Pedido.builder()
            .codigo(codigo)
            .cliente(cliente)
            .puntoDeVenta(puntoDeVenta)
            .estado(estado)
            .tipoEntrega(TipoEntrega.PICKUP)
            .subtotal(new BigDecimal("10.00"))
            .total(new BigDecimal("10.00"))
            .build();
    }

    private Usuario usuario(String email, Rol rol) {
        return Usuario.builder()
            .email(email)
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Demo Pedido")
            .roles(new HashSet<>(Set.of(rol)))
            .build();
    }
}
