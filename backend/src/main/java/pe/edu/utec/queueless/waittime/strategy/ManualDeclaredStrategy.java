package pe.edu.utec.queueless.waittime.strategy;

import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;

/**
 * Fase 1: usa el tiempo declarado por el comercio + cola actual.
 *
 * <p>TODO Semana 3: sumar la cola actual de pedidos del PuntoDeVenta para
 * darle un componente dinámico al tiempo declarado.
 */
@Component
public class ManualDeclaredStrategy implements WaitTimeStrategy {

    @Override
    public int estimarMinutos(PuntoDeVenta puntoDeVenta) {
        return puntoDeVenta.getTiempoPromedioDeclarado();
    }
}
