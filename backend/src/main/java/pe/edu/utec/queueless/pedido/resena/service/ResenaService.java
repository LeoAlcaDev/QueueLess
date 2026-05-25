package pe.edu.utec.queueless.pedido.resena.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.resena.dto.CrearResenaRequest;
import pe.edu.utec.queueless.pedido.resena.dto.ResenaResponse;
import pe.edu.utec.queueless.pedido.resena.entity.ObjetivoResena;
import pe.edu.utec.queueless.pedido.resena.entity.Resena;
import pe.edu.utec.queueless.pedido.resena.repository.ResenaRepository;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.List;

/**
 * Reseñas que el cliente deja sobre el punto de venta o el repartidor del
 * pedido. Reglas: el pedido debe estar ENTREGADO, el cliente debe ser el
 * dueño, y no puede haber dos reseñas del mismo {@code objetivoTipo} para el
 * mismo pedido.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ResenaService {

    private final ResenaRepository resenaRepository;
    private final PedidoService pedidoService;
    private final SolicitudDeliveryRepository solicitudDeliveryRepository;

    // ---------------------------------------------------------------------------
    // Escritura
    // ---------------------------------------------------------------------------

    @Transactional
    public ResenaResponse crear(Usuario autor, CrearResenaRequest request) {
        Pedido pedido = pedidoService.findById(request.getPedidoId());
        validarAutorDelPedido(autor, pedido);
        validarPedidoEntregado(pedido);
        validarNoDuplicada(pedido.getId(), request.getObjetivoTipo());

        Long objetivoId = resolverObjetivoId(pedido, request.getObjetivoTipo());
        Resena resena = Resena.builder()
            .pedido(pedido)
            .autor(autor)
            .objetivoTipo(request.getObjetivoTipo())
            .objetivoId(objetivoId)
            .calificacion(request.getCalificacion())
            .comentario(normalizar(request.getComentario()))
            .build();
        Resena guardada = resenaRepository.save(resena);
        log.info("Reseña {} creada por usuario {} sobre {} #{} (pedido {})",
            guardada.getId(), autor.getId(), request.getObjetivoTipo(), objetivoId, pedido.getId());
        return ResenaResponse.from(guardada);
    }

    // ---------------------------------------------------------------------------
    // Lectura pública
    // ---------------------------------------------------------------------------

    public List<ResenaResponse> listarDePuntoDeVenta(Long puntoDeVentaId) {
        return mapList(resenaRepository
            .findByObjetivoTipoAndObjetivoIdOrderByCreatedAtDesc(
                ObjetivoResena.PUNTO_DE_VENTA, puntoDeVentaId));
    }

    public List<ResenaResponse> listarDeRepartidor(Long repartidorId) {
        return mapList(resenaRepository
            .findByObjetivoTipoAndObjetivoIdOrderByCreatedAtDesc(
                ObjetivoResena.REPARTIDOR, repartidorId));
    }

    // ---------------------------------------------------------------------------
    // Validaciones
    // ---------------------------------------------------------------------------

    private void validarAutorDelPedido(Usuario autor, Pedido pedido) {
        if (!pedido.getCliente().getId().equals(autor.getId())) {
            throw new BusinessRuleException("Solo el cliente del pedido puede reseñarlo");
        }
    }

    private void validarPedidoEntregado(Pedido pedido) {
        if (pedido.getEstado() != EstadoPedido.ENTREGADO) {
            throw new BusinessRuleException(
                "Solo se puede reseñar un pedido ENTREGADO (estado actual: "
                    + pedido.getEstado() + ")");
        }
    }

    private void validarNoDuplicada(Long pedidoId, ObjetivoResena objetivoTipo) {
        if (resenaRepository.existsByPedidoIdAndObjetivoTipo(pedidoId, objetivoTipo)) {
            throw new BusinessRuleException(
                "Ya existe una reseña de tipo " + objetivoTipo + " para este pedido");
        }
    }

    /**
     * El cliente no elige a quién reseñar: si es PUNTO_DE_VENTA el objetivo es
     * el local del pedido; si es REPARTIDOR, sale del repartidor que confirmó
     * la entrega. Para PICKUP no aplica reseñar al repartidor.
     */
    private Long resolverObjetivoId(Pedido pedido, ObjetivoResena objetivoTipo) {
        if (objetivoTipo == ObjetivoResena.PUNTO_DE_VENTA) {
            return pedido.getPuntoDeVenta().getId();
        }
        if (pedido.getTipoEntrega() != TipoEntrega.DELIVERY) {
            throw new BusinessRuleException(
                "Solo se puede reseñar al repartidor en pedidos con entrega DELIVERY");
        }
        SolicitudDelivery solicitud = solicitudDeliveryRepository.findByPedidoId(pedido.getId())
            .orElseThrow(() -> new BusinessRuleException(
                "Este pedido no tuvo entrega por repartidor; no se puede reseñar a un repartidor"));
        if (solicitud.getEstado() != EstadoSolicitudDelivery.ENTREGADO
                || solicitud.getRepartidor() == null) {
            throw new BusinessRuleException(
                "La entrega del pedido " + pedido.getId() + " aún no fue completada por un repartidor");
        }
        return solicitud.getRepartidor().getId();
    }

    private String normalizar(String comentario) {
        if (comentario == null) {
            return null;
        }
        String trim = comentario.trim();
        return trim.isEmpty() ? null : trim;
    }

    private List<ResenaResponse> mapList(List<Resena> resenas) {
        return resenas.stream().map(ResenaResponse::from).toList();
    }
}
