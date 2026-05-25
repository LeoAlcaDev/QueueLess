package pe.edu.utec.queueless.waittime.strategy;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.waittime.ml.BinRegressionModel;

import java.time.ZonedDateTime;

/**
 * Fase 2: modelo predictivo entrenado con el histórico del local. Usa la hora y el
 * día actuales más el tamaño de la cola para consultar la celda del modelo. Si esa
 * celda todavía no tiene datos, cae al tiempo promedio declarado por el comercio.
 */
@Component
@RequiredArgsConstructor
public class PredictiveStrategy implements WaitTimeStrategy {

    private final BinRegressionModel model;

    @Override
    public int estimarMinutos(PuntoDeVenta puntoDeVenta, int pedidosEnCola) {
        ZonedDateTime ahora = ZonedDateTime.now(TiempoLima.ZONA);
        int hora = ahora.getHour();
        int dia = ahora.getDayOfWeek().getValue() - 1;   // lunes=0..domingo=6
        return model.predecir(puntoDeVenta.getId(), hora, dia, pedidosEnCola)
            .orElse(puntoDeVenta.getTiempoPromedioDeclarado());
    }
}
