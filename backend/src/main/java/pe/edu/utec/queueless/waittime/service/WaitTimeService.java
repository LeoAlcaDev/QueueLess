package pe.edu.utec.queueless.waittime.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.waittime.strategy.ManualDeclaredStrategy;
import pe.edu.utec.queueless.waittime.strategy.PredictiveStrategy;

/**
 * Decide qué estrategia usar (Fase 1 o Fase 2) según el volumen histórico
 * acumulado de pedidos completados del comercio.
 */
@Service
@RequiredArgsConstructor
public class WaitTimeService {

    private final ManualDeclaredStrategy manual;
    private final PredictiveStrategy predictive;

    @Value("${queueless.waittime.pedidos-minimos-fase2}")
    private int umbralFase2;

    public int estimar(PuntoDeVenta puntoDeVenta) {
        // TODO Semana 3: contar pedidos ENTREGADO del puntoDeVenta y elegir estrategia
        return manual.estimarMinutos(puntoDeVenta);
    }
}
