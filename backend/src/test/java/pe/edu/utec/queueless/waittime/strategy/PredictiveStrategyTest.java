package pe.edu.utec.queueless.waittime.strategy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.waittime.ml.BinRegressionModel;

import java.util.OptionalInt;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * La estrategia predictiva consulta el modelo y cae al tiempo declarado si no hay dato.
 */
@ExtendWith(MockitoExtension.class)
class PredictiveStrategyTest {

    @Mock private BinRegressionModel model;
    @InjectMocks private PredictiveStrategy strategy;

    @Test
    @DisplayName("si el modelo tiene dato para la celda, devuelve esa prediccion")
    void usaLaPrediccionDelModelo() {
        PuntoDeVenta local = local(1L, 10);
        when(model.predecir(eq(1L), anyInt(), anyInt(), eq(4))).thenReturn(OptionalInt.of(18));

        assertThat(strategy.estimarMinutos(local, 4)).isEqualTo(18);
    }

    @Test
    @DisplayName("si la celda no tiene datos, cae al tiempo declarado del local")
    void caeAlTiempoDeclarado() {
        PuntoDeVenta local = local(1L, 10);
        when(model.predecir(eq(1L), anyInt(), anyInt(), anyInt())).thenReturn(OptionalInt.empty());

        assertThat(strategy.estimarMinutos(local, 4)).isEqualTo(10);
    }

    private PuntoDeVenta local(Long id, int declarado) {
        PuntoDeVenta local = PuntoDeVenta.builder().tiempoPromedioDeclarado(declarado).build();
        local.setId(id);
        return local;
    }
}
