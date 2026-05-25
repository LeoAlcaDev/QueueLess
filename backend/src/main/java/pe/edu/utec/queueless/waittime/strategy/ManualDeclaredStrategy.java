package pe.edu.utec.queueless.waittime.strategy;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;

/**
 * Fase 1: tiempo declarado por el comercio más el tamaño de la cola actual.
 *
 * <p>El estimado es {@code tiempoPromedioDeclarado + pedidosEnCola × minutosPorPedidoEnCola}.
 * El multiplicador es configurable; por defecto cada pedido en cola suma 3 minutos.
 */
@Component
public class ManualDeclaredStrategy implements WaitTimeStrategy {

    @Value("${queueless.waittime.minutos-por-pedido-en-cola}")
    private int minutosPorPedidoEnCola;

    @Override
    public int estimarMinutos(PuntoDeVenta puntoDeVenta, int pedidosEnCola) {
        return puntoDeVenta.getTiempoPromedioDeclarado() + pedidosEnCola * minutosPorPedidoEnCola;
    }
}
