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
 * Marca como EXPIRADO los pedidos LISTO_PARA_RECOGER que llevan más de
 * {@code queueless.pedido.expiracion-minutos} sin ser recogidos.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ExpirarPedidosJob {

    private final PedidoRepository pedidoRepository;
    private final PedidoService pedidoService;

    @Value("${queueless.pedido.expiracion-minutos}")
    private int expiracionMinutos;

    /** Corre cada 5 minutos. */
    @Scheduled(fixedDelayString = "PT5M")
    public void expirarPedidos() {
        Instant cutoff = Instant.now().minus(expiracionMinutos, ChronoUnit.MINUTES);
        List<Pedido> candidatos = pedidoRepository.findByEstadoAndListoAtBefore(
            EstadoPedido.LISTO_PARA_RECOGER, cutoff);
        for (Pedido p : candidatos) {
            log.info("Expirando pedido {}", p.getCodigo());
            pedidoService.cambiarEstado(p.getId(), EstadoPedido.EXPIRADO);
        }
    }
}
