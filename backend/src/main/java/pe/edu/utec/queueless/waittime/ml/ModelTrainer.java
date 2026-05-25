package pe.edu.utec.queueless.waittime.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;

import java.util.List;

/**
 * Re-entrena el modelo de tiempos de espera con todos los pedidos ya entregados.
 * Corre periódicamente; el cron es configurable vía
 * {@code queueless.waittime.retraining-cron}. Entrena sobre la ventana completa de
 * datos, así un tiempo atípico viejo pesa cada vez menos a medida que entran más.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ModelTrainer {

    private final BinRegressionModel model;
    private final PedidoRepository pedidoRepository;

    @Scheduled(cron = "${queueless.waittime.retraining-cron}")
    @Transactional(readOnly = true)
    public void reEntrenar() {
        List<Pedido> entregados = pedidoRepository
            .findByEstadoAndAceptadoAtIsNotNullAndListoAtIsNotNull(EstadoPedido.ENTREGADO);
        log.debug("Re-entrenando modelo de tiempos con {} pedidos entregados", entregados.size());
        model.entrenarSobrePedidos(entregados);
    }
}
