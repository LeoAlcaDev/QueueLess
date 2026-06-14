package pe.edu.utec.queueless.queuepoints.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import pe.edu.utec.queueless.queuepoints.dto.MovimientoResponse;
import pe.edu.utec.queueless.queuepoints.repository.MovimientoQueuePointsRepository;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit test del historial paginado de QueuePoints (ADR-0023): el servicio
 * propaga la página y el tamaño pedidos al repositorio, pero descarta cualquier
 * sort que mande el cliente para que el orden estable lo siga fijando el
 * repositorio (created_at desc, id desc). Sin esto, un ?sort= del cliente
 * podría reordenar las páginas y hacer que se repitan o salteen filas.
 */
@ExtendWith(MockitoExtension.class)
class QueuePointsServiceTest {

    @Mock
    private MovimientoQueuePointsRepository repository;

    @InjectMocks
    private QueuePointsService service;

    @Test
    void historialDePropagaPaginaYTamanoPeroIgnoraElSortDelCliente() {
        // Arrange: un usuario con id conocido y un repositorio que devuelve una página vacía.
        Usuario usuario = mock(Usuario.class);
        when(usuario.getId()).thenReturn(7L);
        when(repository.findByUsuarioIdOrderByCreatedAtDescIdDesc(eq(7L), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of()));
        Pageable conSortDelCliente = PageRequest.of(2, 15, Sort.by("monto").descending());

        // Act
        Page<MovimientoResponse> resultado = service.historialDe(usuario, conSortDelCliente);

        // Assert: llegó la misma página y tamaño, pero sin el sort que mandó el cliente.
        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(repository).findByUsuarioIdOrderByCreatedAtDescIdDesc(eq(7L), captor.capture());
        Pageable usado = captor.getValue();
        assertThat(usado.getPageNumber()).isEqualTo(2);
        assertThat(usado.getPageSize()).isEqualTo(15);
        assertThat(usado.getSort().isSorted()).isFalse();
        assertThat(resultado).isEmpty();
    }
}
