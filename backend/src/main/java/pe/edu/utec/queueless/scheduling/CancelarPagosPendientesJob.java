package pe.edu.utec.queueless.scheduling;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Cancela los pedidos que quedaron atascados en PENDIENTE_PAGO más allá del tiempo
 * configurado: el cliente abandonó el carrito antes de pagar, así que el sistema
 * cierra el pedido automáticamente. No dispara reembolso porque nunca se pagó.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CancelarPagosPendientesJob {

    private final PedidoRepository pedidoRepository;
    private final PedidoService pedidoService;

    @Value("${queueless.pedido.cancelacion-pago-pendiente-minutos}")
    private int cancelacionMinutos;

    /** Corre cada 5 minutos. */
    @Scheduled(fixedDelayString = "PT5M")
    public void cancelarPendientes() {
        Instant cutoff = Instant.now().minus(cancelacionMinutos, ChronoUnit.MINUTES);
        List<Pedido> abandonados = pedidoRepository.findByEstadoAndCreadoAtBefore(
            EstadoPedido.PENDIENTE_PAGO, cutoff);
        for (Pedido pedido : abandonados) {
            log.info("Cancelando pedido {} sin pagar por exceder el tiempo de espera", pedido.getCodigo());
            pedidoService.cambiarEstado(pedido.getId(), EstadoPedido.CANCELADO_POR_CLIENTE);
        }
    }
}
