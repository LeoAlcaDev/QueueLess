package pe.edu.utec.queueless.pedido.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Clasificación de la tasa de cumplimiento. Sin DB: se prueba el núcleo
 * {@code calcularDesde} con pedidos en memoria. Las fallas son cancelar pasada la
 * gracia y dejar lapsar sin aceptar; el resto es neutro (ADR-0026).
 */
@ExtendWith(MockitoExtension.class)
class TasaCumplimientoServiceTest {

    private static final Instant BASE = Instant.parse("2026-06-21T12:00:00Z");

    @Mock private PedidoRepository pedidoRepository;

    @InjectMocks private TasaCumplimientoService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "graciaCancelacionMinutos", 15L);
        ReflectionTestUtils.setField(service, "minimoPedidos", 3);
    }

    @Test
    @DisplayName("cuenta honrados sobre responsables, ignorando los neutros")
    void calculaTasaConNeutros() {
        List<Pedido> programados = new ArrayList<>();
        // 6 honrados
        for (int i = 0; i < 6; i++) {
            programados.add(estado(EstadoPedido.ENTREGADO));
        }
        // 2 fallas: dejados lapsar sin aceptar
        programados.add(noAtendido());
        programados.add(noAtendido());
        // neutros: no-show, cancelación del cliente, rechazo libre, cancelado dentro de la gracia
        programados.add(estado(EstadoPedido.EXPIRADO));
        programados.add(estado(EstadoPedido.CANCELADO_POR_CLIENTE));
        programados.add(rechazoLibre());
        programados.add(canceladoTrasAceptar(5));   // dentro de los 15 de gracia

        // 6 / (6 + 2) = 75%
        assertThat(service.calcularDesde(programados)).isEqualByComparingTo("75");
    }

    @Test
    @DisplayName("cancelar pasada la gracia tras aceptar cuenta como falla")
    void cancelarPasadaLaGraciaEsFalla() {
        List<Pedido> programados = new ArrayList<>();
        for (int i = 0; i < 4; i++) {
            programados.add(estado(EstadoPedido.ENTREGADO));
        }
        programados.add(canceladoTrasAceptar(30));   // 30 min > 15 de gracia => falla

        // 4 / (4 + 1) = 80%
        assertThat(service.calcularDesde(programados)).isEqualByComparingTo("80");
    }

    @Test
    @DisplayName("cancelar dentro de la gracia no baja la tasa (es neutro)")
    void cancelarDentroDeLaGraciaEsNeutro() {
        List<Pedido> programados = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            programados.add(estado(EstadoPedido.ENTREGADO));
        }
        programados.add(canceladoTrasAceptar(10));   // dentro de los 15 => neutro

        // 3 / (3 + 0) = 100%
        assertThat(service.calcularDesde(programados)).isEqualByComparingTo("100");
    }

    @Test
    @DisplayName("por debajo del mínimo de datos devuelve null (sin datos aún)")
    void bajoElUmbralDevuelveNull() {
        List<Pedido> programados = new ArrayList<>();
        programados.add(estado(EstadoPedido.ENTREGADO));
        programados.add(estado(EstadoPedido.ENTREGADO));   // solo 2 responsables, mínimo 3

        assertThat(service.calcularDesde(programados)).isNull();
    }

    @Test
    @DisplayName("un no-show (EXPIRADO) es neutro: no baja la reputación del comercio")
    void noShowEsNeutro() {
        List<Pedido> programados = new ArrayList<>();
        for (int i = 0; i < 3; i++) {
            programados.add(estado(EstadoPedido.ENTREGADO));
        }
        programados.add(estado(EstadoPedido.EXPIRADO));

        assertThat(service.calcularDesde(programados)).isEqualByComparingTo("100");
    }

    private Pedido estado(EstadoPedido estado) {
        return Pedido.builder()
            .estado(estado)
            .recojoProgramadoAt(BASE)
            .build();
    }

    private Pedido noAtendido() {
        Pedido pedido = estado(EstadoPedido.CANCELADO_POR_COMERCIO);
        pedido.setMotivoCancelacion(MotivoCancelacion.COMERCIO_NO_ATENDIO);
        return pedido;
    }

    /** Rechazo del comercio antes de aceptar: cancelado, con motivo, sin aceptadoAt. Neutro. */
    private Pedido rechazoLibre() {
        Pedido pedido = estado(EstadoPedido.CANCELADO_POR_COMERCIO);
        pedido.setMotivoCancelacion(MotivoCancelacion.PRODUCTO_AGOTADO);
        return pedido;
    }

    /** Aceptado y luego cancelado a los {@code minutosTrasAceptar} minutos. */
    private Pedido canceladoTrasAceptar(int minutosTrasAceptar) {
        Pedido pedido = estado(EstadoPedido.CANCELADO_POR_COMERCIO);
        pedido.setMotivoCancelacion(MotivoCancelacion.PROBLEMA_OPERATIVO);
        pedido.setAceptadoAt(BASE);
        pedido.setCanceladoAt(BASE.plus(minutosTrasAceptar, ChronoUnit.MINUTES));
        return pedido;
    }
}
