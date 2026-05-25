package pe.edu.utec.queueless.delivery.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.delivery.dto.SolicitudDeliveryResponse;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.event.SolicitudDeliveryCreadaEvent;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

/**
 * Lógica del flujo de SolicitudDelivery. La creación la dispara el listener
 * cuando el pedido tipo DELIVERY queda pagado y en búsqueda de repartidor; al
 * aceptarla, el pedido pasa a esperar al comercio. Las transiciones siguientes
 * (ASIGNADO → RECOGIDO → ENTREGADO) las dispara el repartidor desde su app.
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
    private final ApplicationEventPublisher eventPublisher;

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
    // Creación (la dispara el listener cuando el pedido DELIVERY queda buscando repartidor)
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

        // El matching corre como listener después del commit; así no notificamos
        // repartidores sobre una solicitud cuya transacción todavía podría revertirse.
        eventPublisher.publishEvent(new SolicitudDeliveryCreadaEvent(guardada.getId()));
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

        // Ya hay repartidor confirmado: recién ahora el comercio puede aceptar el
        // pedido, así no prepara comida que después no tendría quién la lleve.
        pedidoService.cambiarEstado(
            solicitud.getPedido().getId(), EstadoPedido.PAGADO_ESPERANDO_COMERCIO);

        log.info("Repartidor {} aceptó solicitud {}", repartidor.getId(), solicitudId);
        return toResponse(actualizada);
    }

    /** Transición ASIGNADO → RECOGIDO; solo el repartidor asignado puede hacerla. */
    @Transactional
    public SolicitudDeliveryResponse confirmarRecogida(Usuario repartidor, Long solicitudId) {
        SolicitudDelivery solicitud = buscarSolicitudDelRepartidor(repartidor, solicitudId);
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
        SolicitudDelivery solicitud = buscarSolicitudDelRepartidor(repartidor, solicitudId);
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
    // Acciones del cliente durante la búsqueda
    // ---------------------------------------------------------------------------

    /**
     * Reactiva la búsqueda de repartidor reusando la misma solicitud (la columna
     * pedido_id es única, así que no se crea otra fila): la deja de nuevo en
     * BUSCANDO con una ventana de timeout nueva y vuelve a publicar el evento
     * para notificar a los repartidores. Solo aplica si la búsqueda anterior ya
     * venció o quedó sin repartidor.
     *
     * <p>No se protege contra reintentos simultáneos del mismo cliente sobre el
     * mismo pedido: dos peticiones a la vez podrían reactivar la solicitud y
     * publicar dos eventos, generando dos rondas de notificaciones. La mitigación
     * (tomar la solicitud con bloqueo al reactivar, o un campo de versión en la
     * entidad) queda para una fase futura; en la práctica, la app deshabilita el
     * botón mientras la primera petición está en curso.
     */
    @Transactional
    public SolicitudDeliveryResponse reintentarBusqueda(Usuario cliente, Long pedidoId) {
        Pedido pedido = pedidoService.buscarPedidoDelCliente(cliente, pedidoId);
        if (pedido.getEstado() != EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR) {
            throw new BusinessRuleException(
                "Solo se puede reintentar mientras el pedido está buscando repartidor");
        }
        SolicitudDelivery solicitud = findByPedidoId(pedidoId);
        boolean busquedaVigente = solicitud.getEstado() == EstadoSolicitudDelivery.BUSCANDO
            && solicitud.getBusquedaFinAt().isAfter(Instant.now());
        if (busquedaVigente) {
            throw new BusinessRuleException(
                "Tu búsqueda actual sigue activa, esperá a que termine");
        }

        Instant ahora = Instant.now();
        solicitud.setEstado(EstadoSolicitudDelivery.BUSCANDO);
        solicitud.setRepartidor(null);
        solicitud.setAsignadoAt(null);
        solicitud.setBusquedaInicioAt(ahora);
        solicitud.setBusquedaFinAt(ahora.plus(timeoutMinutos, ChronoUnit.MINUTES));
        SolicitudDelivery reactivada = repository.save(solicitud);
        log.info("Búsqueda reiniciada para pedido {} (solicitud {})", pedidoId, reactivada.getId());

        eventPublisher.publishEvent(new SolicitudDeliveryCreadaEvent(reactivada.getId()));
        return toResponse(reactivada);
    }

    /**
     * Cambia el pedido a recojo en tienda y cierra la solicitud de delivery, todo
     * en la misma transacción. Valida que el pedido sea del cliente antes de
     * tocar nada; si es ajeno, responde como inexistente.
     */
    @Transactional
    public PedidoResponse cambiarAPickup(Usuario cliente, Long pedidoId) {
        Pedido pedido = pedidoService.buscarPedidoDelCliente(cliente, pedidoId);
        PedidoResponse respuesta = pedidoService.cambiarAPickup(pedido);
        cancelarSolicitudDelPedido(pedidoId);
        return respuesta;
    }

    /**
     * Deja la solicitud del pedido en CANCELADO (la usa el cambio a recojo en
     * tienda). Si el pedido no tuviera solicitud, no hace nada.
     */
    @Transactional
    public void cancelarSolicitudDelPedido(Long pedidoId) {
        SolicitudDelivery solicitud = repository.findByPedidoId(pedidoId).orElse(null);
        if (solicitud == null) {
            return;
        }
        solicitud.setEstado(EstadoSolicitudDelivery.CANCELADO);
        repository.save(solicitud);
        log.info("Solicitud {} cancelada por cambio a recojo en tienda (pedido {})",
            solicitud.getId(), pedidoId);
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
        List<SolicitudDeliveryResponse> respuesta = new ArrayList<>();
        for (SolicitudDelivery solicitud : solicitudes) {
            respuesta.add(toResponse(solicitud));
        }
        return respuesta;
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
