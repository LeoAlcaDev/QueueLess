package pe.edu.utec.queueless.recomendador.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.recomendador.dto.AsistenteRequest;
import pe.edu.utec.queueless.recomendador.dto.AsistenteResponse;
import pe.edu.utec.queueless.recomendador.dto.RecomendacionItem;
import pe.edu.utec.queueless.recomendador.modelo.ModeloRecomendacion;
import pe.edu.utec.queueless.recomendador.modelo.ModeloRecomendacion.RespuestaModelo;
import pe.edu.utec.queueless.recomendador.modelo.RecomendadorNoDisponibleException;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Prueba la orquestación del asistente con dobles del ensamblador y del modelo: que degrada a
 * la lista segura cuando el modelo falla, que respeta el orden del modelo pero ignora los ids
 * que no estén en el conjunto seguro, y que al modelo solo le llegan los candidatos ya
 * filtrados. No toca red ni base de datos.
 */
@ExtendWith(MockitoExtension.class)
class AsistenteServiceTest {

    @Mock private EnsambladorDeCandidatos ensamblador;
    @Mock private ModeloRecomendacion modelo;
    @InjectMocks private AsistenteService asistenteService;

    private final Usuario usuario = new Usuario();
    private AsistenteRequest request;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(asistenteService, "historialMaximoTurnos", 6);
        request = new AsistenteRequest();
        request.setMensaje("quiero algo rápido");
    }

    @Test
    @DisplayName("Cuando el modelo falla, degrada a la lista segura con un aviso")
    void degradaCuandoElModeloFalla() {
        // Arrange
        when(ensamblador.ensamblar(any(), any())).thenReturn(List.of(candidato(1L), candidato(2L)));
        when(modelo.ordenarYExplicar(anyList(), anyList(), anyString()))
            .thenThrow(new RecomendadorNoDisponibleException("la API no respondió"));

        // Act
        AsistenteResponse respuesta = asistenteService.recomendar(usuario, request);

        // Assert
        assertThat(respuesta.isAsistenteDisponible()).isFalse();
        assertThat(respuesta.getAviso()).isNotBlank();
        assertThat(respuesta.getRecomendaciones()).extracting(RecomendacionItem::productoId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("Respeta el orden del modelo, pero ignora los ids que no están en el conjunto seguro")
    void respetaElOrdenDelModeloPeroIgnoraIdsAjenos() {
        // Arrange: el conjunto seguro es 1, 2, 3; el modelo pide 3, 99 (ajeno), 1
        when(ensamblador.ensamblar(any(), any()))
            .thenReturn(List.of(candidato(1L), candidato(2L), candidato(3L)));
        when(modelo.ordenarYExplicar(anyList(), anyList(), anyString()))
            .thenReturn(new RespuestaModelo(List.of(3L, 99L, 1L), "te ordené por rapidez"));

        // Act
        AsistenteResponse respuesta = asistenteService.recomendar(usuario, request);

        // Assert: 99 se ignora; el 2, que el modelo no nombró, queda al final
        assertThat(respuesta.isAsistenteDisponible()).isTrue();
        assertThat(respuesta.getExplicacion()).isEqualTo("te ordené por rapidez");
        assertThat(respuesta.getRecomendaciones()).extracting(RecomendacionItem::productoId).containsExactly(3L, 1L, 2L);
    }

    @Test
    @DisplayName("Al modelo solo le llegan los candidatos que ya pasaron el filtro de seguridad")
    void alModeloSoloLleganLosCandidatosSeguros() {
        // Arrange
        List<Candidato> seguros = List.of(candidato(1L), candidato(2L));
        when(ensamblador.ensamblar(any(), any())).thenReturn(seguros);
        when(modelo.ordenarYExplicar(anyList(), anyList(), anyString()))
            .thenReturn(new RespuestaModelo(List.of(1L, 2L), "ok"));

        // Act
        asistenteService.recomendar(usuario, request);

        // Assert: lo que recibe el modelo es exactamente la salida del ensamblador, sin agregados
        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<Candidato>> captor = ArgumentCaptor.forClass(List.class);
        verify(modelo).ordenarYExplicar(captor.capture(), anyList(), anyString());
        assertThat(captor.getValue()).containsExactlyElementsOf(seguros);
    }

    @Test
    @DisplayName("Sin candidatos seguros, responde sin opciones y no llama al modelo")
    void sinCandidatosNoLlamaAlModelo() {
        // Arrange
        when(ensamblador.ensamblar(any(), any())).thenReturn(List.of());

        // Act
        AsistenteResponse respuesta = asistenteService.recomendar(usuario, request);

        // Assert
        assertThat(respuesta.getRecomendaciones()).isEmpty();
        assertThat(respuesta.getAviso()).isNotBlank();
        verify(modelo, never()).ordenarYExplicar(anyList(), anyList(), anyString());
    }

    private static Candidato candidato(long id) {
        return new Candidato(id, "Plato " + id, "descripción", new BigDecimal("10.00"), 1L, "Local",
            10, true, Set.of(), Set.of(), null);
    }
}
