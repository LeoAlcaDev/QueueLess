package pe.edu.utec.queueless.waittime.ml;

import org.springframework.stereotype.Component;

/**
 * Modelo simple de regresión por bins (hora-del-día × día-de-semana).
 *
 * <p>TODO Semana 3: implementar entrenamiento sobre los pedidos históricos
 * del PuntoDeVenta y predicción del próximo tiempo de preparación.
 */
@Component
public class BinRegressionModel {

    public void entrenar() {
        // TODO
    }

    public int predecir(Long puntoDeVentaId) {
        // TODO
        return 10;
    }
}
