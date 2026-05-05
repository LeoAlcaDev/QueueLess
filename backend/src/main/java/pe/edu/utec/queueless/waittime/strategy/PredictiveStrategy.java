package pe.edu.utec.queueless.waittime.strategy;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.waittime.ml.BinRegressionModel;

/**
 * Fase 2: modelo predictivo entrenado con datos históricos.
 * Solo se activa cuando hay suficientes pedidos completados
 * (queueless.waittime.pedidos-minimos-fase2).
 */
@Component
@RequiredArgsConstructor
public class PredictiveStrategy implements WaitTimeStrategy {

    private final BinRegressionModel model;

    @Override
    public int estimarMinutos(PuntoDeVenta puntoDeVenta) {
        // TODO Semana 3: alimentar features (hora, día, cantidad de items en cola)
        // y devolver predicción del modelo entrenado.
        return model.predecir(puntoDeVenta.getId());
    }
}
