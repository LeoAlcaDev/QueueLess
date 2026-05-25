package pe.edu.utec.queueless.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.delivery.dto.SolicitudDeliveryResponse;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Lógica del flujo de SolicitudDelivery. La creación la dispara el listener
 * cuando el pedido tipo DELIVERY queda pagado y aceptado por el comercio; las
 * transiciones siguientes (ASIGNADO → RECOGIDO → ENTREGADO) las dispara el
 * repartidor desde su app.
 *
 * <p>La entrega final delega en {@link PedidoService#cambiarEstado} para que
 * los listeners de QueuePoints y notificaciones reaccionen.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SolicitudDeliveryService {

    private final SolicitudDeliveryRepository repository;
    private final PedidoService pedidoService;
    private final RepartidorMatchingService matchingService;

    @Value("${queueless.delivery.busqueda-timeout-minutos}")
    private int timeoutMinutos;

    // ---------------------------------------------------------------------------
    // Lectura
    // ---------------------------------------------------------------------------

    /** Solicitudes esperando repartidor: lo que el repartidor ve en su feed. */
    public List<SolicitudDeliveryResponse> listarDisponibles() {
        List<SolicitudDelivery> solicitudes =
            repository.findByEstado(EstadoSolicitudDelivery.BUSCANDO);
        return mapList(solicitudes);
    }

    /** Historial de entregas del repartidor autenticado, de la más nueva a la más vieja. */
    public List<SolicitudDeliveryResponse> listarMisEntregas(Usuario repartidor) {
        validarEsRepartidor(repartidor);
        List<SolicitudDelivery> solicitudes =
            repository.findByRepartidorIdOrderByAsignadoAtDesc(repartidor.getId());
        return mapList(solicitudes);
    }

    public SolicitudDeliveryResponse verDetalleParaRepartidor(Usuario repartidor, Long solicitudId) {
        SolicitudDelivery solicitud = buscarSolicitudDelRepartidor(repartidor, solicitudId);
        return toResponse(solicitud);
    }

    // ---------------------------------------------------------------------------
    // Creación (la dispara el listener cuando el pedido DELIVERY queda aceptado)
    // ---------------------------------------------------------------------------

    /**
     * Crea la SolicitudDelivery del pedido si todavía no existe. Es idempotente
     * porque la columna {@code pedido_id} de {@code solicitud_delivery} tiene
     * UNIQUE en el schema; igual chequeamos antes para no gastar un INSERT
     * fallido si el listener corre dos veces.
     */
    @Transactional
    public SolicitudDelivery crearParaPedido(Pedido pedido) {
        if (pedido.getTipoEntrega() != TipoEntrega.DELIVERY) {
            throw new BusinessRuleException(
                "Solo los pedidos DELIVERY requieren solicitud de delivery");
        }
        return repository.findByPedidoId(pedido.getId())
            .orElseGet(() -> insertarSolicitud(pedido));
    }

    private SolicitudDelivery insertarSolicitud(Pedido pedido) {
        Instant ahora = Instant.now();
        SolicitudDelivery solicitud = SolicitudDelivery.builder()
            .pedido(pedido)
            .zonaEntrega(resolverZonaEntrega(pedido))
            .estado(EstadoSolicitudDelivery.BUSCANDO)
            .busquedaInicioAt(ahora)
            .busquedaFinAt(ahora.plus(timeoutMinutos, ChronoUnit.MINUTES))
            .build();
        SolicitudDelivery guardada = repository.save(solicitud);
        log.info("Solicitud de delivery {} creada para pedido {} (timeout {} min)",
            guardada.getId(), pedido.getId(), timeoutMinutos);
        // Diferir la notificación hasta AFTER_COMMIT para que la fila ya sea
        // visible en la DB cuando el repartidor responda a la push y llame /aceptar.
        Long solicitudId = guardada.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                matchingService.iniciarBusqueda(solicitudId);
            }
        });
        return guardada;
    }

    // ---------------------------------------------------------------------------
    // Acciones del repartidor
    // ---------------------------------------------------------------------------

    /** Transición BUSCANDO → ASIGNADO. La primera aceptación gana; el resto recibe 422. */
    @Transactional
    public SolicitudDeliveryResponse aceptar(Usuario repartidor, Long solicitudId) {
        validarEsRepartidor(repartidor);
        SolicitudDelivery solicitud = repository.findByIdForUpdate(solicitudId)
            .orElseThrow(() -> new ResourceNotFoundException("SolicitudDelivery", solicitudId));
        if (solicitud.getEstado() != EstadoSolicitudDelivery.BUSCANDO) {
            throw new BusinessRuleException(
                "La solicitud ya no está disponible (estado actual: " + solicitud.getEstado() + ")");
        }
        solicitud.setRepartidor(repartidor);
        solicitud.setEstado(EstadoSolicitudDelivery.ASIGNADO);
        solicitud.setAsignadoAt(Instant.now());
        SolicitudDelivery actualizada = repository.save(solicitud);
        log.info("Repartidor {} aceptó solicitud {}", repartidor.getId(), solicitudId);
        return toResponse(actualizada);
    }

    /** Transición ASIGNADO → RECOGIDO; solo el repartidor asignado puede hacerla. */
    @Transactional
    public SolicitudDeliveryResponse confirmarRecogida(Usuario repartidor, Long solicitudId) {
        SolicitudDelivery solicitud = buscarConLockParaRepartidor(repartidor, solicitudId);
        if (solicitud.getEstado() != EstadoSolicitudDelivery.ASIGNADO) {
            throw new BusinessRuleException(
                "Solo se puede confirmar recogida desde ASIGNADO (estado actual: "
                    + solicitud.getEstado() + ")");
        }
        solicitud.setEstado(EstadoSolicitudDelivery.RECOGIDO);
        solicitud.setRecogidoAt(Instant.now());
        SolicitudDelivery actualizada = repository.save(solicitud);
        log.info("Repartidor {} confirmó recogida de solicitud {}", repartidor.getId(), solicitudId);
        return toResponse(actualizada);
    }

    /**
     * Transición RECOGIDO → ENTREGADO. Además mueve el pedido a ENTREGADO para
     * que los listeners (QueuePoints, notificación) reaccionen.
     */
    @Transactional
    public SolicitudDeliveryResponse confirmarEntrega(Usuario repartidor, Long solicitudId) {
        SolicitudDelivery solicitud = buscarConLockParaRepartidor(repartidor, solicitudId);
        if (solicitud.getEstado() != EstadoSolicitudDelivery.RECOGIDO) {
            throw new BusinessRuleException(
                "Solo se puede confirmar entrega desde RECOGIDO (estado actual: "
                    + solicitud.getEstado() + ")");
        }
        solicitud.setEstado(EstadoSolicitudDelivery.ENTREGADO);
        solicitud.setEntregadoAt(Instant.now());
        SolicitudDelivery actualizada = repository.save(solicitud);

        pedidoService.cambiarEstado(solicitud.getPedido().getId(), EstadoPedido.ENTREGADO);
        log.info("Repartidor {} confirmó entrega de solicitud {} (pedido {})",
            repartidor.getId(), solicitudId, solicitud.getPedido().getId());
        return toResponse(actualizada);
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    public SolicitudDelivery findByPedidoId(Long pedidoId) {
        return repository.findByPedidoId(pedidoId)
            .orElseThrow(() -> new ResourceNotFoundException(
                "SolicitudDelivery del pedido " + pedidoId));
    }

    private SolicitudDelivery buscarSolicitud(Long solicitudId) {
        return repository.findById(solicitudId)
            .orElseThrow(() -> new ResourceNotFoundException("SolicitudDelivery", solicitudId));
    }

    /** Versión con SELECT FOR UPDATE: usada en transiciones de escritura para evitar double-submit. */
    private SolicitudDelivery buscarConLockParaRepartidor(Usuario repartidor, Long solicitudId) {
        validarEsRepartidor(repartidor);
        SolicitudDelivery solicitud = repository.findByIdForUpdate(solicitudId)
            .orElseThrow(() -> new ResourceNotFoundException("SolicitudDelivery", solicitudId));
        if (solicitud.getRepartidor() == null
                || !solicitud.getRepartidor().getId().equals(repartidor.getId())) {
            throw new BusinessRuleException("Esta solicitud no está asignada a vos");
        }
        return solicitud;
    }

    /** Versión sin lock: usada en lecturas (verDetalleParaRepartidor, listarMisEntregas). */
    private SolicitudDelivery buscarSolicitudDelRepartidor(Usuario repartidor, Long solicitudId) {
        validarEsRepartidor(repartidor);
        SolicitudDelivery solicitud = buscarSolicitud(solicitudId);
        if (solicitud.getRepartidor() == null
                || !solicitud.getRepartidor().getId().equals(repartidor.getId())) {
            throw new BusinessRuleException("Esta solicitud no está asignada a vos");
        }
        return solicitud;
    }

    private void validarEsRepartidor(Usuario usuario) {
        if (!usuario.tieneRol(Rol.REPARTIDOR)) {
            throw new BusinessRuleException("Solo un usuario con rol REPARTIDOR puede operar entregas");
        }
    }

    /**
     * La zona del pedido no se persiste en la entidad Pedido; usamos la
     * ubicación del local como fallback razonable para el MVP. Cuando el cliente
     * pueda elegir dirección de entrega, este leerá ese dato.
     */
    private String resolverZonaEntrega(Pedido pedido) {
        PuntoDeVenta local = pedido.getPuntoDeVenta();
        return local.getUbicacion();
    }

    private List<SolicitudDeliveryResponse> mapList(List<SolicitudDelivery> solicitudes) {
        return solicitudes.stream().map(this::toResponse).toList();
    }

    private SolicitudDeliveryResponse toResponse(SolicitudDelivery solicitud) {
        Pedido pedido = solicitud.getPedido();
        PuntoDeVenta local = pedido.getPuntoDeVenta();
        Long repartidorId = solicitud.getRepartidor() == null
            ? null : solicitud.getRepartidor().getId();
        return SolicitudDeliveryResponse.builder()
            .id(solicitud.getId())
            .pedidoId(pedido.getId())
            .pedidoCodigo(pedido.getCodigo())
            .puntoDeVentaId(local.getId())
            .puntoDeVentaNombre(local.getNombre())
            .puntoDeVentaUbicacion(local.getUbicacion())
            .zonaEntrega(solicitud.getZonaEntrega())
            .estado(solicitud.getEstado())
            .repartidorId(repartidorId)
            .busquedaInicioAt(solicitud.getBusquedaInicioAt())
            .busquedaFinAt(solicitud.getBusquedaFinAt())
            .asignadoAt(solicitud.getAsignadoAt())
            .recogidoAt(solicitud.getRecogidoAt())
            .entregadoAt(solicitud.getEntregadoAt())
            .build();
    }
}
