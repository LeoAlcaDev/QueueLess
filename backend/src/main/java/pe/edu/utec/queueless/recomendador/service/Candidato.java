package pe.edu.utec.queueless.recomendador.service;

import pe.edu.utec.queueless.puntoventa.entity.AptitudDietetica;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Un plato pedible ahora con dos clases de datos: los que el filtro de seguridad necesita
 * para decidir si es apto (alérgenos, aptitud dietética, picante) y los que el modelo y la
 * respuesta necesitan para ordenar y mostrar (precio, tiempo, local, presupuesto). Solo los
 * candidatos que pasan el filtro llegan al modelo.
 */
public record Candidato(
    Long productoId,
    String nombre,
    String descripcion,
    BigDecimal precio,
    Long puntoDeVentaId,
    String puntoDeVentaNombre,
    int minutosEstimados,
    boolean dentroDePresupuesto,
    Set<Alergeno> alergenos,
    Set<AptitudDietetica> aptitudesDieteticas,
    ToleranciaPicante nivelPicante
) {}
