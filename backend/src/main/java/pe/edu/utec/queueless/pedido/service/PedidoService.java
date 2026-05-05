package pe.edu.utec.queueless.pedido.service;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PedidoService {

    private final PedidoRepository pedidoRepository;
    private final ApplicationEventPublisher eventPublisher;

    public Pedido findById(Long id) {
        return pedidoRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
    }

    public List<Pedido> listarMisPedidos(Long clienteId) {
        return pedidoRepository.findByClienteIdOrderByCreadoAtDesc(clienteId);
    }

    @Transactional
    public Pedido crear(Long clienteId, CrearPedidoRequest request) {
        // TODO Semana 2: validar items, calcular subtotal/total, generar código,
        // construir Pedido con items, persistir, publicar evento.
        throw new UnsupportedOperationException("PedidoService.crear pendiente — Semana 2");
    }

    /**
     * Cambia el estado del pedido respetando las reglas de la máquina de
     * estados (validadas dentro de {@link Pedido#transicionarA}).
     * Publica {@link PedidoEstadoCambiadoEvent} para que los listeners
     * (notification, queuepoints, pago) reaccionen.
     */
    @Transactional
    public Pedido cambiarEstado(Long pedidoId, EstadoPedido nuevoEstado) {
        Pedido pedido = findById(pedidoId);
        EstadoPedido anterior = pedido.getEstado();
        pedido.transicionarA(nuevoEstado);
        Pedido guardado = pedidoRepository.save(pedido);
        eventPublisher.publishEvent(
            new PedidoEstadoCambiadoEvent(guardado.getId(), anterior, nuevoEstado));
        return guardado;
    }
}
