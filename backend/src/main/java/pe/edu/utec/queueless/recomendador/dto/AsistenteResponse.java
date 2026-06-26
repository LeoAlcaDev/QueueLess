package pe.edu.utec.queueless.recomendador.dto;

import lombok.Getter;

import java.util.List;

/**
 * La respuesta del asistente. Cuando el modelo respondió, trae el orden recomendado y una
 * explicación en prosa (asistenteDisponible = true). Cuando el modelo no está disponible,
 * trae igual la lista segura y pedible, pre-ordenada por código, con un aviso
 * (asistenteDisponible = false): la seguridad nunca depende de la API externa (ADR-0031).
 */
@Getter
public class AsistenteResponse {

    private final boolean asistenteDisponible;
    private final String explicacion;
    private final String aviso;
    private final List<RecomendacionItem> recomendaciones;

    private AsistenteResponse(boolean asistenteDisponible, String explicacion, String aviso,
                             List<RecomendacionItem> recomendaciones) {
        this.asistenteDisponible = asistenteDisponible;
        this.explicacion = explicacion;
        this.aviso = aviso;
        this.recomendaciones = recomendaciones;
    }

    /** El modelo respondió: orden recomendado más explicación en prosa. */
    public static AsistenteResponse con(List<RecomendacionItem> recomendaciones, String explicacion) {
        return new AsistenteResponse(true, explicacion, null, recomendaciones);
    }

    /** El modelo no respondió: la lista segura pre-ordenada con un aviso. */
    public static AsistenteResponse degradado(List<RecomendacionItem> recomendaciones) {
        return new AsistenteResponse(false, null,
            "El asistente no está disponible en este momento; estas son tus opciones seguras y pedibles ahora.",
            recomendaciones);
    }

    /** No hay platos seguros y pedibles ahora para este cliente. */
    public static AsistenteResponse sinOpciones() {
        return new AsistenteResponse(true, null,
            "No encontré platos seguros y pedibles para vos en este momento.",
            List.of());
    }
}
