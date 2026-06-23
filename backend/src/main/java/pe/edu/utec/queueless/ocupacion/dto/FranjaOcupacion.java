package pe.edu.utec.queueless.ocupacion.dto;

import lombok.Getter;

/**
 * Una franja de la curva de ocupación: un día de la semana (1=lunes .. 7=domingo) y
 * una hora del día (0-23), en zona Lima. Si la franja no junta datos suficientes viene
 * marcada como recopilando, sin nivel ni tiempo, para no fingir un patrón que no tenemos.
 */
@Getter
public class FranjaOcupacion {

    private final int diaSemana;
    private final int hora;
    private final boolean suficientesDatos;

    // Promedio de pedidos por cada vez que la franja ocurrió; null si está recopilando.
    private final Double pedidosTipicos;

    // Demora orientativa de la franja, en minutos; null si está recopilando.
    private final Integer minutosEstimados;

    private FranjaOcupacion(int diaSemana, int hora, boolean suficientesDatos,
                            Double pedidosTipicos, Integer minutosEstimados) {
        this.diaSemana = diaSemana;
        this.hora = hora;
        this.suficientesDatos = suficientesDatos;
        this.pedidosTipicos = pedidosTipicos;
        this.minutosEstimados = minutosEstimados;
    }

    public static FranjaOcupacion con(int diaSemana, int hora, double pedidosTipicos, int minutosEstimados) {
        return new FranjaOcupacion(diaSemana, hora, true, pedidosTipicos, minutosEstimados);
    }

    public static FranjaOcupacion recopilando(int diaSemana, int hora) {
        return new FranjaOcupacion(diaSemana, hora, false, null, null);
    }
}
