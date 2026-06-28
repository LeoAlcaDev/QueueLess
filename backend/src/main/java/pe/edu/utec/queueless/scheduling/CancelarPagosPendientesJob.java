package pe.edu.utec.queueless.scheduling;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.notification.dto.PushNotification;
import pe.edu.utec.queueless.notification.service.NotificationService;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;

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
    private final NotificationService notificationService;

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
            // La transición usa CANCELADO_POR_CLIENTE, que el listener de pedidos silencia
            // al venir de PENDIENTE_PAGO; avisamos acá porque esta cancelación la hace el sistema.
            notificarCancelacion(pedido);
        }
    }

    private void notificarCancelacion(Pedido pedido) {
        Long clienteId = pedido.getCliente().getId();
        notificationService.notificar(PushNotification.builder()
            .topic("cliente-" + clienteId)
            .titulo("Pedido cancelado")
            .cuerpo("Cancelamos tu pedido porque no se completó el pago a tiempo.")
            .data(Map.of("pedidoId", pedido.getId().toString()))
            .build());
    }
}
