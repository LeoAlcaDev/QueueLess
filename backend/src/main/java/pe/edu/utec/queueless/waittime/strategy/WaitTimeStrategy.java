package pe.edu.utec.queueless.waittime.strategy;

import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;

/**
 * Estrategia de cálculo de tiempo de espera estimado.
 * Tenemos 2 implementaciones: manual declarada (Fase 1) y predictiva (Fase 2).
 */
public interface WaitTimeStrategy {
    /** Devuelve el tiempo estimado en minutos para un punto de venta dado. */
    int estimarMinutos(PuntoDeVenta puntoDeVenta);
}
