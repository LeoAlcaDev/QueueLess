package pe.edu.utec.queueless.queuepoints;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;
import pe.edu.utec.queueless.queuepoints.repository.MovimientoQueuePointsRepository;
import pe.edu.utec.queueless.queuepoints.service.QueuePointsService;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas del ledger aisladas con mocks. La idempotencia y el saldo se prueban
 * contra base real en {@link QueuePointsFlowIT}.
 */
@ExtendWith(MockitoExtension.class)
class QueuePointsServiceTest {

    @Mock private MovimientoQueuePointsRepository repository;

    @InjectMocks private QueuePointsService service;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = Usuario.builder().email("camila@utec.edu.pe").build();
        usuario.setId(1L);
    }

    @Test
    @DisplayName("registrarGanancia: si no existe movimiento previo, inserta uno GANADO")
    void registrarGananciaFelizCamino() {
        when(repository.findFirstByTipoAndReferenciaTipoAndReferenciaId(
            TipoMovimiento.GANADO, "PEDIDO", 42L)).thenReturn(Optional.empty());
        when(repository.save(any(MovimientoQueuePoints.class)))
            .thenAnswer(i -> {
                MovimientoQueuePoints m = i.getArgument(0);
                m.setId(99L);
                return m;
            });

        MovimientoQueuePoints mov = service.registrarGanancia(usuario, 50, "PEDIDO", 42L, "Entrega QL-1");

        assertThat(mov.getId()).isEqualTo(99L);
        assertThat(mov.getTipo()).isEqualTo(TipoMovimiento.GANADO);
        assertThat(mov.getMonto()).isEqualTo(50);
        verify(repository).save(any(MovimientoQueuePoints.class));
    }

    @Test
    @DisplayName("registrarGanancia: si ya existe movimiento con la misma referencia, no inserta de nuevo")
    void registrarGananciaIdempotente() {
        MovimientoQueuePoints existente = MovimientoQueuePoints.builder()
            .usuario(usuario).tipo(TipoMovimiento.GANADO).monto(50)
            .referenciaTipo("PEDIDO").referenciaId(42L).build();
        existente.setId(7L);
        when(repository.findFirstByTipoAndReferenciaTipoAndReferenciaId(
            TipoMovimiento.GANADO, "PEDIDO", 42L)).thenReturn(Optional.of(existente));

        MovimientoQueuePoints mov = service.registrarGanancia(usuario, 50, "PEDIDO", 42L, "x");

        assertThat(mov.getId()).isEqualTo(7L);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("canjear con saldo insuficiente lanza BusinessRuleException")
    void canjearSaldoInsuficienteFalla() {
        when(repository.findFirstByTipoAndReferenciaTipoAndReferenciaId(
            TipoMovimiento.CANJEADO, "PEDIDO", 10L)).thenReturn(Optional.empty());
        MovimientoQueuePoints ganado = MovimientoQueuePoints.builder()
            .usuario(usuario).tipo(TipoMovimiento.GANADO).monto(20).build();
        when(repository.findByUsuarioIdForUpdate(1L)).thenReturn(List.of(ganado));

        assertThatThrownBy(() -> service.canjear(usuario, 50, "PEDIDO", 10L, null))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("Saldo insuficiente");
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("canjear con saldo suficiente inserta movimiento CANJEADO")
    void canjearConSaldoSuficiente() {
        when(repository.findFirstByTipoAndReferenciaTipoAndReferenciaId(
            TipoMovimiento.CANJEADO, "PEDIDO", 10L)).thenReturn(Optional.empty());
        MovimientoQueuePoints ganado = MovimientoQueuePoints.builder()
            .usuario(usuario).tipo(TipoMovimiento.GANADO).monto(100).build();
        when(repository.findByUsuarioIdForUpdate(1L)).thenReturn(List.of(ganado));
        when(repository.save(any(MovimientoQueuePoints.class)))
            .thenAnswer(i -> i.getArgument(0));

        MovimientoQueuePoints mov = service.canjear(usuario, 30, "PEDIDO", 10L, "Descuento");

        assertThat(mov.getTipo()).isEqualTo(TipoMovimiento.CANJEADO);
        assertThat(mov.getMonto()).isEqualTo(30);
        assertThat(mov.getReferenciaId()).isEqualTo(10L);
    }
}
