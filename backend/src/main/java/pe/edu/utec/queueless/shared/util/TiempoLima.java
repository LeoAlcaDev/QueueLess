package pe.edu.utec.queueless.shared.util;

import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Zona horaria fija del negocio (America/Lima) y acceso a la hora actual en esa
 * zona. Vive aquí, y no como constante privada de un service, porque más de un
 * módulo la necesita (pedidos y productos). Ver ADR-0011 y ADR-0012.
 */
public final class TiempoLima {

    public static final ZoneId ZONA = ZoneId.of("America/Lima");

    private TiempoLima() {
    }

    /** Hora actual del día en zona Lima, sin fecha. */
    public static LocalTime ahora() {
        return LocalTime.now(ZONA);
    }
}
