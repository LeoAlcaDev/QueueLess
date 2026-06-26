package pe.edu.utec.queueless.recomendador.dto;

import java.math.BigDecimal;

/**
 * Un plato recomendado tal como lo ve el cliente: ya filtrado como seguro y pedible ahora,
 * con su precio, el tiempo estimado a esta hora, el local y si entra en su presupuesto.
 */
public record RecomendacionItem(
    Long productoId,
    String nombre,
    String descripcion,
    BigDecimal precio,
    Long puntoDeVentaId,
    String puntoDeVentaNombre,
    int minutosEstimados,
    boolean dentroDePresupuesto
) {}
