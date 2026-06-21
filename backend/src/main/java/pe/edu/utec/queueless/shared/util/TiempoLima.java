package pe.edu.utec.queueless.shared.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * Zona horaria fija del negocio (America/Lima) y conversiones de un instante
 * absoluto a la hora o fecha local de esa zona. Vive aquí, y no como constante
 * privada de un service, porque más de un módulo la necesita (pedidos y
 * productos). Ver ADR-0011, ADR-0012 y ADR-0026.
 */
public final class TiempoLima {

    public static final ZoneId ZONA = ZoneId.of("America/Lima");

    private TiempoLima() {
    }

    /** Hora actual del día en zona Lima, sin fecha. */
    public static LocalTime ahora() {
        return LocalTime.now(ZONA);
    }

    /** El instante dado, visto como fecha y hora local de Lima. */
    public static LocalDateTime enZonaLima(Instant instante) {
        return LocalDateTime.ofInstant(instante, ZONA);
    }

    /** La hora del día (sin fecha) del instante dado, en zona Lima. */
    public static LocalTime horaDe(Instant instante) {
        return enZonaLima(instante).toLocalTime();
    }

    /** La fecha de calendario del instante dado, en zona Lima. */
    public static LocalDate fechaDe(Instant instante) {
        return enZonaLima(instante).toLocalDate();
    }
}
