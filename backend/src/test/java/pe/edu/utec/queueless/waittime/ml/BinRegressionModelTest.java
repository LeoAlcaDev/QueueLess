package pe.edu.utec.queueless.waittime.ml;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.shared.util.TiempoLima;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.OptionalInt;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Modelo de tiempos sobre datos sintéticos. Sin Spring ni base: se le pasan pedidos
 * en memoria y se verifica qué predice cada celda.
 */
class BinRegressionModelTest {

    // 12:00 en Lima (UTC-5). La hora y el día se derivan de este instante, no se
    // fijan a mano, para no acoplar el test a la zona del runner.
    private static final Instant BASE = Instant.parse("2026-05-18T17:00:00Z");
    private static final int HORA = BASE.atZone(TiempoLima.ZONA).getHour();
    private static final int DIA = BASE.atZone(TiempoLima.ZONA).getDayOfWeek().getValue() - 1;

    @Test
    @DisplayName("un modelo sin entrenar no predice nada")
    void sinEntrenarDevuelveVacio() {
        BinRegressionModel model = new BinRegressionModel();

        assertThat(model.predecir(1L, HORA, DIA, 0)).isEmpty();
    }

    @Test
    @DisplayName("tras entrenar, una celda devuelve el promedio de los tiempos reales")
    void prediceElPromedioDeLaCelda() {
        BinRegressionModel model = new BinRegressionModel();
        PuntoDeVenta local = local(1L);
        // Dos pedidos del mismo local, sin solaparse: cola 0. Preparaciones de 10 y 20.
        List<Pedido> pedidos = List.of(
            entregado(local, BASE, BASE.plus(10, ChronoUnit.MINUTES)),
            entregado(local, BASE.plus(10, ChronoUnit.MINUTES), BASE.plus(30, ChronoUnit.MINUTES)));

        model.entrenarSobrePedidos(pedidos);

        assertThat(model.predecir(1L, HORA, DIA, 0)).hasValue(15);   // (10 + 20) / 2
    }

    @Test
    @DisplayName("una celda sin datos cae a vacío para que la estrategia use el fallback")
    void celdaSinDatosDevuelveVacio() {
        BinRegressionModel model = new BinRegressionModel();
        PuntoDeVenta local = local(1L);
        model.entrenarSobrePedidos(List.of(
            entregado(local, BASE, BASE.plus(10, ChronoUnit.MINUTES))));

        // Misma hora y día pero un bucket de cola sin datos, y otro local sin entrenar.
        assertThat(model.predecir(1L, HORA, DIA, 6)).isEmpty();
        assertThat(model.predecir(2L, HORA, DIA, 0)).isEmpty();
    }

    @Test
    @DisplayName("reentrenar con datos nuevos reemplaza el modelo anterior")
    void reentrenarReemplazaElModelo() {
        BinRegressionModel model = new BinRegressionModel();
        PuntoDeVenta local = local(1L);
        model.entrenarSobrePedidos(List.of(
            entregado(local, BASE, BASE.plus(10, ChronoUnit.MINUTES))));
        assertThat(model.predecir(1L, HORA, DIA, 0)).isPresent();

        model.entrenarSobrePedidos(List.of());

        assertThat(model.predecir(1L, HORA, DIA, 0)).isEmpty();
    }

    @Test
    @DisplayName("el bucket de cola agrupa 0-2, 3-5 y 6 o más")
    void bucketDeCola() {
        assertThat(BinRegressionModel.bucketCola(0)).isZero();
        assertThat(BinRegressionModel.bucketCola(2)).isZero();
        assertThat(BinRegressionModel.bucketCola(3)).isEqualTo(1);
        assertThat(BinRegressionModel.bucketCola(5)).isEqualTo(1);
        assertThat(BinRegressionModel.bucketCola(6)).isEqualTo(2);
        assertThat(BinRegressionModel.bucketCola(20)).isEqualTo(2);
    }

    private PuntoDeVenta local(Long id) {
        PuntoDeVenta local = PuntoDeVenta.builder().tiempoPromedioDeclarado(10).build();
        local.setId(id);
        return local;
    }

    private Pedido entregado(PuntoDeVenta local, Instant aceptado, Instant listo) {
        return Pedido.builder()
            .puntoDeVenta(local)
            .estado(EstadoPedido.ENTREGADO)
            .aceptadoAt(aceptado)
            .listoAt(listo)
            .build();
    }
}
