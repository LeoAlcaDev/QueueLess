package pe.edu.utec.queueless.queuepoints.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests del repositorio del ledger de QueuePoints: calculo de saldo, idempotencia por
 * referencia y el historial de movimientos ordenado con desempate estable por id.
 */
class MovimientoQueuePointsRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private MovimientoQueuePointsRepository movimientoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = usuarioRepository.save(Usuario.builder()
            .email("repartidor.qp@utec.edu.pe")
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Repartidor QP")
            .roles(new HashSet<>(Set.of(Rol.REPARTIDOR)))
            .build());
    }

    @Test
    @DisplayName("calcularSaldo suma lo ganado y resta lo canjeado")
    void shouldCalcularSaldoWhenGanadoYCanjeado() {
        movimientoRepository.save(movimiento(TipoMovimiento.GANADO, 50, "ENTREGA", 1L));
        movimientoRepository.save(movimiento(TipoMovimiento.GANADO, 50, "ENTREGA", 2L));
        movimientoRepository.save(movimiento(TipoMovimiento.CANJEADO, 30, "CANJE", 1L));

        assertThat(movimientoRepository.calcularSaldo(usuario.getId())).isEqualTo(70);
    }

    @Test
    @DisplayName("calcularSaldo devuelve 0 cuando el usuario no tiene movimientos")
    void shouldReturnZeroSaldoWhenSinMovimientos() {
        assertThat(movimientoRepository.calcularSaldo(usuario.getId())).isEqualTo(0);
    }

    @Test
    @DisplayName("findFirst por referencia encuentra el movimiento para la idempotencia")
    void shouldFindFirstByReferenciaWhenExists() {
        movimientoRepository.save(movimiento(TipoMovimiento.GANADO, 50, "ENTREGA", 7L));

        assertThat(movimientoRepository.findFirstByTipoAndReferenciaTipoAndReferenciaId(
            TipoMovimiento.GANADO, "ENTREGA", 7L)).isPresent();
        assertThat(movimientoRepository.findFirstByTipoAndReferenciaTipoAndReferenciaId(
            TipoMovimiento.GANADO, "ENTREGA", 99L)).isEmpty();
    }

    @Test
    @DisplayName("el historial viene del mas reciente al mas antiguo, con desempate por id")
    void shouldOrderByCreatedAtDescIdDescWhenFindByUsuario() {
        movimientoRepository.save(movimiento(TipoMovimiento.GANADO, 50, "ENTREGA", 1L));
        movimientoRepository.save(movimiento(TipoMovimiento.GANADO, 50, "ENTREGA", 2L));
        movimientoRepository.save(movimiento(TipoMovimiento.CANJEADO, 30, "CANJE", 3L));

        assertThat(movimientoRepository.findByUsuarioIdOrderByCreatedAtDescIdDesc(usuario.getId()))
            .extracting(MovimientoQueuePoints::getReferenciaId)
            .containsExactly(3L, 2L, 1L);
    }

    private MovimientoQueuePoints movimiento(TipoMovimiento tipo, int monto, String referenciaTipo,
                                             Long referenciaId) {
        return MovimientoQueuePoints.builder()
            .usuario(usuario)
            .tipo(tipo)
            .monto(monto)
            .referenciaTipo(referenciaTipo)
            .referenciaId(referenciaId)
            .build();
    }
}
