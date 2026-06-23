package pe.edu.utec.queueless.tyc.dto;

import lombok.Getter;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;

/**
 * Estado de aceptación de los Términos para un usuario: la versión vigente, la versión que
 * aceptó (si aceptó alguna), cuándo, y si lo que aceptó es la versión vigente. Ver ADR-0030.
 */
@Getter
public class TycEstadoResponse {

    private final String versionVigente;
    private final String versionAceptada;   // null si nunca aceptó
    private final Instant aceptadoAt;        // null si nunca aceptó
    private final boolean aceptoVersionVigente;

    private TycEstadoResponse(String versionVigente, String versionAceptada,
                             Instant aceptadoAt, boolean aceptoVersionVigente) {
        this.versionVigente = versionVigente;
        this.versionAceptada = versionAceptada;
        this.aceptadoAt = aceptadoAt;
        this.aceptoVersionVigente = aceptoVersionVigente;
    }

    public static TycEstadoResponse de(Usuario usuario, String versionVigente) {
        String aceptada = usuario.getTycVersionAceptada();
        boolean alDia = versionVigente.equals(aceptada);
        return new TycEstadoResponse(versionVigente, aceptada, usuario.getTycAceptadoAt(), alDia);
    }
}
