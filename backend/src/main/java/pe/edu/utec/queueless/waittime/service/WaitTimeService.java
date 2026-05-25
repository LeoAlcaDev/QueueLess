package pe.edu.utec.queueless.waittime.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.waittime.strategy.ManualDeclaredStrategy;
import pe.edu.utec.queueless.waittime.strategy.PredictiveStrategy;
import pe.edu.utec.queueless.waittime.strategy.WaitTimeStrategy;

/**
 * Calcula el tiempo de espera estimado de un local y decide qué estrategia usar
 * (manual o predictiva) según cuántos pedidos entregados acumuló ese local.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WaitTimeService {

    private final ManualDeclaredStrategy manual;
    private final PredictiveStrategy predictive;
    private final PuntoDeVentaRepository puntoDeVentaRepository;
    private final PedidoRepository pedidoRepository;

    @Value("${queueless.waittime.pedidos-minimos-fase2}")
    private int umbralFase2;

    public int estimarMinutos(Long puntoDeVentaId) {
        PuntoDeVenta puntoDeVenta = puntoDeVentaRepository.findByIdAndActivoTrue(puntoDeVentaId)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", puntoDeVentaId));

        int pedidosEnCola = pedidoRepository.countByPuntoDeVentaIdAndEstado(
            puntoDeVentaId, EstadoPedido.EN_PREPARACION);
        int entregados = pedidoRepository.countByPuntoDeVentaIdAndEstado(
            puntoDeVentaId, EstadoPedido.ENTREGADO);

        WaitTimeStrategy estrategia = (entregados >= umbralFase2) ? predictive : manual;
        return estrategia.estimarMinutos(puntoDeVenta, pedidosEnCola);
    }
}
