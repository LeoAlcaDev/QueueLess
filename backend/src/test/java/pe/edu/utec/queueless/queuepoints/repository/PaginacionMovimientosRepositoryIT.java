package pe.edu.utec.queueless.queuepoints.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifica la paginación del historial de movimientos (ADR-0023): que se
 * respete el tamaño de página pedido y que recorrer las páginas no repita ni
 * saltee filas. El desempate por id es lo que lo hace estable: todos los
 * movimientos creados en una misma transacción comparten el mismo created_at
 * (Postgres lo llena con el timestamp del inicio de la transacción), así que
 * sin el id como segundo criterio el orden entre páginas sería impredecible.
 */
class PaginacionMovimientosRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private MovimientoQueuePointsRepository movimientoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = usuarioRepository.save(Usuario.builder()
            .email("paginacion.qp@utec.edu.pe")
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Paginacion QP")
            .roles(new HashSet<>(Set.of(Rol.REPARTIDOR)))
            .build());
    }

    @Test
    @DisplayName("la página entrega el tamaño pedido y reporta el total y el número de páginas")
    void shouldRespectPageSizeAndReportTotals() {
        guardarMovimientos(25);

        Page<MovimientoQueuePoints> primera = movimientoRepository
            .findByUsuarioIdOrderByCreatedAtDescIdDesc(usuario.getId(), PageRequest.of(0, 10));

        assertThat(primera.getNumberOfElements()).isEqualTo(10);
        assertThat(primera.getTotalElements()).isEqualTo(25);
        assertThat(primera.getTotalPages()).isEqualTo(3);
    }

    @Test
    @DisplayName("recorrer las tres páginas no repite ni saltea filas y respeta el orden por id descendente")
    void shouldPageStablyWithoutOverlapOrGaps() {
        guardarMovimientos(25);

        List<Long> ids = new ArrayList<>();
        for (int pagina = 0; pagina < 3; pagina++) {
            Page<MovimientoQueuePoints> page = movimientoRepository
                .findByUsuarioIdOrderByCreatedAtDescIdDesc(usuario.getId(), PageRequest.of(pagina, 10));
            for (MovimientoQueuePoints mov : page.getContent()) {
                ids.add(mov.getId());
            }
        }

        // 25 ids distintos (todos los insertados), en orden estrictamente descendente:
        // sin id repetido entre páginas y sin ninguno salteado.
        assertThat(ids).hasSize(25);
        assertThat(ids).doesNotHaveDuplicates();
        assertThat(ids).isSortedAccordingTo(Comparator.<Long>reverseOrder());
    }

    private void guardarMovimientos(int cantidad) {
        for (int i = 1; i <= cantidad; i++) {
            movimientoRepository.save(MovimientoQueuePoints.builder()
                .usuario(usuario)
                .tipo(TipoMovimiento.GANADO)
                .monto(50)
                .referenciaTipo("ENTREGA")
                .referenciaId((long) i)
                .build());
        }
    }
}
