package pe.edu.utec.queueless.recomendador.modelo;

import pe.edu.utec.queueless.recomendador.dto.TurnoConversacion;
import pe.edu.utec.queueless.recomendador.service.Candidato;

import java.util.List;

/**
 * El modelo de lenguaje detrás de una interfaz intercambiable, calcada de la pasarela de
 * pagos (ADR-0013): la implementación real se elige por configuración
 * (queueless.recomendador.proveedor) y un bean de respaldo falla con un mensaje claro si el
 * valor no calza. El modelo solo ordena y explica los candidatos que recibe —ya filtrados
 * como seguros—; nunca decide qué es seguro ni inventa platos.
 */
public interface ModeloRecomendacion {

    /**
     * Ordena los candidatos seguros y explica la recomendación en prosa, en base al mensaje
     * del cliente y el historial reciente. Lanza {@link RecomendadorNoDisponibleException} si
     * el modelo no responde, para que el asistente degrade a la lista segura.
     */
    RespuestaModelo ordenarYExplicar(List<Candidato> candidatos, List<TurnoConversacion> historial, String mensaje);

    /** El orden propuesto (por id de producto) y la explicación en prosa. */
    record RespuestaModelo(List<Long> ordenProductoIds, String explicacion) {
    }
}
