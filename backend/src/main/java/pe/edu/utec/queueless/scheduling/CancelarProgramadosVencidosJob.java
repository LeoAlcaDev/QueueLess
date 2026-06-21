package pe.edu.utec.queueless.scheduling;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Red de seguridad de los pedidos programados (ADR-0026). Cada minuto cancela con
 * reembolso los programados que el comercio no cumplió, en sus dos formas: los que
 * nunca aceptó, y los que aceptó y dejó vencer sin preparar. Deja en paz los que
 * están en preparación, donde el comercio sí está cumpliendo.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CancelarProgramadosVencidosJob {

    private final PedidoRepository pedidoRepository;
    private final PedidoService pedidoService;

    @Value("${queueless.programado.gracia-recojo-vencido-minutos}")
    private int graciaRecojoVencidoMinutos;

    /** Corre cada minuto: el reembolso debe sentirse inmediato. */
    @Scheduled(fixedDelayString = "PT1M")
    public void cancelarVencidos() {
        Instant ahora = Instant.now();
        cancelarNoAtendidos(ahora);
        cancelarAbandonados(ahora);
    }

    /** El comercio nunca aceptó: la hora de recojo ya pasó y sigue esperando. Sin gracia. */
    private void cancelarNoAtendidos(Instant ahora) {
        List<Pedido> vencidos = pedidoRepository.findByEstadoAndRecojoProgramadoAtBefore(
            EstadoPedido.PAGADO_ESPERANDO_COMERCIO, ahora);
        for (Pedido pedido : vencidos) {
            log.info("Cancelando programado {} que el comercio no atendió", pedido.getCodigo());
            pedidoService.cancelarProgramadoVencido(pedido.getId(), MotivoCancelacion.COMERCIO_NO_ATENDIO);
        }
    }

    /** El comercio aceptó pero abandonó: pasó la hora de recojo más el margen de gracia. */
    private void cancelarAbandonados(Instant ahora) {
        Instant corteConGracia = ahora.minus(graciaRecojoVencidoMinutos, ChronoUnit.MINUTES);
        List<Pedido> abandonados = pedidoRepository.findByEstadoAndRecojoProgramadoAtBefore(
            EstadoPedido.ACEPTADO, corteConGracia);
        for (Pedido pedido : abandonados) {
            log.info("Cancelando programado {} que el comercio aceptó pero no preparó", pedido.getCodigo());
            pedidoService.cancelarProgramadoVencido(pedido.getId(), MotivoCancelacion.COMERCIO_NO_PREPARO);
        }
    }
}
