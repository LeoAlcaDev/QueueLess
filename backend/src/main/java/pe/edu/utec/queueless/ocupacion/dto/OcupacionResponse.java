package pe.edu.utec.queueless.ocupacion.dto;

import lombok.Getter;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;

import java.util.List;

/**
 * La curva de ocupación de un local. Cuando ninguna franja junta datos suficientes,
 * {@code hayDatosSuficientes} es false y la curva viene vacía con un mensaje de
 * "aún recopilando datos": es el arranque en frío. El tiempo del ahora se devuelve
 * siempre, porque no depende del historial (cae al tiempo declarado desde el día uno).
 */
@Getter
public class OcupacionResponse {

    private final Long puntoDeVentaId;
    private final String nombre;
    private final int ventanaDias;
    private final boolean hayDatosSuficientes;

    // Tiempo de espera estimado si se pide ahora mismo (cola del momento). Distinto del
    // tiempo por franja, que es la afluencia histórica traducida a una demora orientativa.
    private final int minutosAhora;

    private final String mensaje;
    private final List<FranjaOcupacion> franjas;

    private OcupacionResponse(Long puntoDeVentaId, String nombre, int ventanaDias,
                             boolean hayDatosSuficientes, int minutosAhora,
                             String mensaje, List<FranjaOcupacion> franjas) {
        this.puntoDeVentaId = puntoDeVentaId;
        this.nombre = nombre;
        this.ventanaDias = ventanaDias;
        this.hayDatosSuficientes = hayDatosSuficientes;
        this.minutosAhora = minutosAhora;
        this.mensaje = mensaje;
        this.franjas = franjas;
    }

    public static OcupacionResponse con(PuntoDeVenta local, int ventanaDias, int minutosAhora,
                                        List<FranjaOcupacion> franjas) {
        return new OcupacionResponse(local.getId(), local.getNombre(), ventanaDias, true,
            minutosAhora, null, franjas);
    }

    public static OcupacionResponse recopilando(PuntoDeVenta local, int ventanaDias, int minutosAhora) {
        return new OcupacionResponse(local.getId(), local.getNombre(), ventanaDias, false,
            minutosAhora, "Aún recopilando datos", List.of());
    }
}
