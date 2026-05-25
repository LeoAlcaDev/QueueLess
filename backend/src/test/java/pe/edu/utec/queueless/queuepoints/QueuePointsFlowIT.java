package pe.edu.utec.queueless.queuepoints;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.queuepoints.dto.MovimientoResponse;
import pe.edu.utec.queueless.queuepoints.dto.SaldoResponse;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;
import pe.edu.utec.queueless.queuepoints.repository.MovimientoQueuePointsRepository;
import pe.edu.utec.queueless.queuepoints.service.QueuePointsService;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifica el cálculo de saldo y el canje contra Postgres real. El saldo es un
 * COALESCE(SUM(...)) que devuelve 0 si no hay movimientos; los canjes restan.
 */
@ActiveProfiles("test")
@Transactional
class QueuePointsFlowIT extends AbstractIntegrationTest {

    @Autowired private QueuePointsService service;
    @Autowired private MovimientoQueuePointsRepository repository;
    @Autowired private UsuarioRepository usuarioRepository;

    @Test
    @DisplayName("saldo de usuario sin movimientos es 0 (no null)")
    void saldoSinMovimientos() {
        Usuario usuario = crearUsuario();
        SaldoResponse saldo = service.saldoDe(usuario);
        assertThat(saldo.getSaldo()).isZero();
    }

    @Test
    @DisplayName("saldo = sum(GANADO) - sum(CANJEADO) sobre los movimientos del usuario")
    void saldoSumaGanadoMenosCanjeado() {
        Usuario usuario = crearUsuario();
        service.registrarGanancia(usuario, 50, "PEDIDO", 1L, "Entrega 1");
        service.registrarGanancia(usuario, 50, "PEDIDO", 2L, "Entrega 2");
        service.registrarGanancia(usuario, 50, "PEDIDO", 3L, "Entrega 3");
        service.canjear(usuario, 30, "PEDIDO", 100L, "Descuento");

        SaldoResponse saldo = service.saldoDe(usuario);
        assertThat(saldo.getSaldo()).isEqualTo(120);

        List<MovimientoResponse> historial = service.historialDe(usuario);
        assertThat(historial).hasSize(4);
        // Orden esperado: del más reciente al más antiguo. Verificamos el orden
        // completo para que un cambio futuro al order by se note de inmediato.
        assertThat(historial.get(0).getTipo()).isEqualTo(TipoMovimiento.CANJEADO);
        assertThat(historial)
            .extracting(MovimientoResponse::getTipo)
            .containsExactly(
                TipoMovimiento.CANJEADO,  // último insertado, id más alto
                TipoMovimiento.GANADO,
                TipoMovimiento.GANADO,
                TipoMovimiento.GANADO);
    }

    @Test
    @DisplayName("canje idempotente: el mismo referenciaId no se procesa dos veces")
    void canjeIdempotente() {
        Usuario usuario = crearUsuario();
        service.registrarGanancia(usuario, 100, "PEDIDO", 1L, "Entrega");
        MovimientoQueuePoints primer = service.canjear(usuario, 40, "PEDIDO", 50L, "Descuento");
        MovimientoQueuePoints segundo = service.canjear(usuario, 40, "PEDIDO", 50L, "Descuento");

        assertThat(segundo.getId()).isEqualTo(primer.getId());
        assertThat(service.saldoDe(usuario).getSaldo()).isEqualTo(60);
    }

    @Test
    @DisplayName("canje sin saldo suficiente lanza BusinessRuleException")
    void canjeSinSaldoFalla() {
        Usuario usuario = crearUsuario();
        service.registrarGanancia(usuario, 30, "PEDIDO", 1L, "Entrega");

        assertThatThrownBy(() -> service.canjear(usuario, 100, "PEDIDO", 999L, "X"))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("Saldo insuficiente");

        // No quedó persistido ningún movimiento de canje
        boolean hayCanje = repository.findByUsuarioIdOrderByCreatedAtDescIdDesc(usuario.getId()).stream()
            .anyMatch(m -> m.getTipo() == TipoMovimiento.CANJEADO);
        assertThat(hayCanje).isFalse();
    }

    private Usuario crearUsuario() {
        Usuario usuario = Usuario.builder()
            .email("qp-" + UUID.randomUUID() + "@utec.edu.pe")
            .passwordHash("hash")
            .nombreCompleto("QueuePoints IT")
            .activo(true)
            .roles(new HashSet<>(Set.of(Rol.REPARTIDOR)))
            .build();
        return usuarioRepository.save(usuario);
    }
}
