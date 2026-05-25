package pe.edu.utec.queueless.waittime.ml;

import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.shared.util.TiempoLima;

import java.time.Duration;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalInt;

/**
 * Modelo de regresión por bins: una tabla por punto de venta donde cada celda
 * (hora del día × día de la semana × tamaño de la cola) guarda el promedio de los
 * tiempos reales de preparación observados en esas condiciones.
 *
 * <p>El mapa de tablas se reemplaza de forma atómica en cada reentrenamiento (campo
 * volatile): una consulta ve siempre una tabla completa, nunca una a medio armar.
 */
@Component
public class BinRegressionModel {

    private static final int HORAS = 24;
    private static final int DIAS = 7;
    private static final int BUCKETS_COLA = 3;

    private volatile Map<Long, BinTable> modelos = Map.of();

    /** Predice el tiempo en minutos para una celda; vacío si esa celda todavía no tiene datos. */
    public OptionalInt predecir(Long puntoDeVentaId, int hora, int dia, int pedidosEnCola) {
        BinTable tabla = modelos.get(puntoDeVentaId);
        if (tabla == null) {
            return OptionalInt.empty();
        }
        BinCell celda = tabla.celdas[hora][dia][bucketCola(pedidosEnCola)];
        if (celda == null || celda.conteo() == 0) {
            return OptionalInt.empty();
        }
        return OptionalInt.of((int) Math.round(celda.promedio()));
    }

    /** Reconstruye el modelo completo desde los pedidos entregados y lo publica de un golpe. */
    public void entrenarSobrePedidos(List<Pedido> entregados) {
        Map<Long, List<Pedido>> porPuntoDeVenta = agruparPorPuntoDeVenta(entregados);
        Map<Long, BinTable> nuevoModelo = new HashMap<>();
        for (Map.Entry<Long, List<Pedido>> entrada : porPuntoDeVenta.entrySet()) {
            nuevoModelo.put(entrada.getKey(), construirTabla(entrada.getValue()));
        }
        this.modelos = nuevoModelo;
    }

    /** Cola de pertenencia: 0-2 pedidos, 3-5, o 6 o más. */
    static int bucketCola(int pedidosEnCola) {
        if (pedidosEnCola <= 2) {
            return 0;
        }
        if (pedidosEnCola <= 5) {
            return 1;
        }
        return 2;
    }

    private Map<Long, List<Pedido>> agruparPorPuntoDeVenta(List<Pedido> pedidos) {
        Map<Long, List<Pedido>> porPuntoDeVenta = new HashMap<>();
        for (Pedido pedido : pedidos) {
            Long puntoDeVentaId = pedido.getPuntoDeVenta().getId();
            porPuntoDeVenta.computeIfAbsent(puntoDeVentaId, id -> new ArrayList<>()).add(pedido);
        }
        return porPuntoDeVenta;
    }

    private BinTable construirTabla(List<Pedido> pedidosDelLocal) {
        double[][][] sumas = new double[HORAS][DIAS][BUCKETS_COLA];
        int[][][] conteos = new int[HORAS][DIAS][BUCKETS_COLA];

        int[] colaAlAceptar = colaAlAceptar(pedidosDelLocal);
        for (int i = 0; i < pedidosDelLocal.size(); i++) {
            Pedido pedido = pedidosDelLocal.get(i);
            ZonedDateTime aceptado = pedido.getAceptadoAt().atZone(TiempoLima.ZONA);
            int hora = aceptado.getHour();
            int dia = aceptado.getDayOfWeek().getValue() - 1;   // lunes=0..domingo=6
            int bucket = bucketCola(colaAlAceptar[i]);
            long minutos = Duration.between(pedido.getAceptadoAt(), pedido.getListoAt()).toMinutes();
            sumas[hora][dia][bucket] += minutos;
            conteos[hora][dia][bucket]++;
        }

        BinTable tabla = new BinTable();
        for (int h = 0; h < HORAS; h++) {
            for (int d = 0; d < DIAS; d++) {
                for (int b = 0; b < BUCKETS_COLA; b++) {
                    if (conteos[h][d][b] > 0) {
                        double promedio = sumas[h][d][b] / conteos[h][d][b];
                        tabla.celdas[h][d][b] = new BinCell(promedio, conteos[h][d][b]);
                    }
                }
            }
        }
        return tabla;
    }

    /**
     * Para cada pedido (en el orden recibido), cuántos otros pedidos del local
     * estaban en preparación cuando este fue aceptado: ya aceptados en ese momento y
     * todavía sin estar listos. Se calcula con búsqueda binaria sobre los tiempos
     * ordenados, sin una consulta a la base por cada pedido.
     */
    private int[] colaAlAceptar(List<Pedido> pedidosDelLocal) {
        int n = pedidosDelLocal.size();
        long[] aceptados = new long[n];
        long[] listos = new long[n];
        for (int i = 0; i < n; i++) {
            aceptados[i] = pedidosDelLocal.get(i).getAceptadoAt().toEpochMilli();
            listos[i] = pedidosDelLocal.get(i).getListoAt().toEpochMilli();
        }
        Arrays.sort(aceptados);
        Arrays.sort(listos);

        int[] resultado = new int[n];
        for (int i = 0; i < n; i++) {
            long instanteAceptado = pedidosDelLocal.get(i).getAceptadoAt().toEpochMilli();
            int aceptadosHasta = contarHasta(aceptados, instanteAceptado);
            int listosHasta = contarHasta(listos, instanteAceptado);
            resultado[i] = Math.max(0, aceptadosHasta - listosHasta - 1);   // descuenta el pedido actual
        }
        return resultado;
    }

    /** Cantidad de valores del arreglo ordenado que son menores o iguales a {@code t}. */
    private int contarHasta(long[] ordenado, long t) {
        int bajo = 0;
        int alto = ordenado.length;
        while (bajo < alto) {
            int medio = (bajo + alto) >>> 1;
            if (ordenado[medio] <= t) {
                bajo = medio + 1;
            } else {
                alto = medio;
            }
        }
        return bajo;
    }

    private record BinCell(double promedio, int conteo) { }

    private static final class BinTable {
        final BinCell[][][] celdas = new BinCell[HORAS][DIAS][BUCKETS_COLA];
    }
}
