package pe.edu.utec.queueless.pedido.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.ItemPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.ItemPedidoResponse;
import pe.edu.utec.queueless.pedido.dto.MotivoCancelacionRequest;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.ItemPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.ProductoRepository;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PedidoService {

    private static final ZoneId ZONA_LIMA = ZoneId.of("America/Lima");
    private static final DateTimeFormatter FORMATO_FECHA_CODIGO = DateTimeFormatter.ofPattern("yyMMdd");
    private static final String ALFABETO_CODIGO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int LONGITUD_SUFIJO_CODIGO = 5;
    private static final int MAX_INTENTOS_CODIGO = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PedidoRepository pedidoRepository;
    private final ProductoRepository productoRepository;
    private final PuntoDeVentaRepository puntoDeVentaRepository;
    private final ApplicationEventPublisher eventPublisher;

    @PersistenceContext
    private EntityManager entityManager;

    // ---------------------------------------------------------------------------
    // Lectura
    // ---------------------------------------------------------------------------

    public Pedido findById(Long id) {
        return pedidoRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
    }

    /** Pedidos del cliente, del más reciente al más antiguo. */
    public List<PedidoResponse> listarMisPedidos(Usuario cliente) {
        List<Pedido> pedidos = pedidoRepository.findByClienteIdOrderByCreadoAtDesc(cliente.getId());
        return toResponseList(pedidos);
    }

    /** Detalle de un pedido propio del cliente. Si es ajeno, se ve como inexistente (404). */
    public PedidoResponse verDetalleDeMiPedido(Usuario cliente, Long pedidoId) {
        Pedido pedido = buscarPedidoDelCliente(cliente, pedidoId);
        return toResponse(pedido);
    }

    /** Cola del comercio: pedidos activos de todos sus locales, en orden de llegada. */
    public List<PedidoResponse> listarColaDelComercio(Usuario gestor) {
        List<PuntoDeVenta> locales = puntoDeVentaRepository.findByGestorIdAndActivoTrue(gestor.getId());
        if (locales.isEmpty()) {
            return new ArrayList<>();
        }

        List<Long> localesIds = new ArrayList<>();
        for (PuntoDeVenta local : locales) {
            localesIds.add(local.getId());
        }

        List<Pedido> cola = pedidoRepository.findByPuntoDeVentaIdInAndEstadoInOrderByCreadoAtAsc(
            localesIds, EstadoPedido.ACTIVOS_PARA_COMERCIO);
        return toResponseList(cola);
    }

    /** Detalle de un pedido de uno de los locales del comercio. Si es ajeno, 404. */
    public PedidoResponse verDetalleParaComercio(Usuario gestor, Long pedidoId) {
        Pedido pedido = findById(pedidoId);
        if (!esGestorDelLocal(gestor, pedido)) {
            throw new ResourceNotFoundException("Pedido", pedidoId);
        }
        return toResponse(pedido);
    }

    // ---------------------------------------------------------------------------
    // Acciones del cliente
    // ---------------------------------------------------------------------------

    @Transactional
    public PedidoResponse crear(Usuario cliente, CrearPedidoRequest request) {
        validarEsCliente(cliente);
        PuntoDeVenta local = buscarLocalAtendiendo(request.getPuntoDeVentaId());
        validarHorarioDeAtencion(local, LocalTime.now(ZONA_LIMA));
        validarZonaEntrega(request);

        Pedido pedido = Pedido.builder()
            .cliente(cliente)
            .puntoDeVenta(local)
            .estado(EstadoPedido.PENDIENTE_PAGO)
            .tipoEntrega(request.getTipoEntrega())
            .descuentoQpts(BigDecimal.ZERO)
            .build();

        agregarItems(pedido, local, request.getItems());
        calcularTotales(pedido);
        pedido.setCodigo(generarCodigoUnico());

        Pedido guardado = pedidoRepository.save(pedido);
        // creado_at lo asigna la base (DEFAULT); recargamos para devolverlo en la respuesta.
        entityManager.refresh(guardado);
        publicarCreacion(guardado);
        return toResponse(guardado);
    }

    /**
     * Cancela un pedido del cliente. Solo se permite mientras el comercio todavía no
     * lo aceptó ni se está buscando repartidor, es decir, mientras el estado esté en
     * {@link EstadoPedido#CANCELABLES_POR_CLIENTE}.
     */
    @Transactional
    public PedidoResponse cancelarPorCliente(Usuario cliente, Long pedidoId, String razon) {
        Pedido pedido = buscarPedidoDelCliente(cliente, pedidoId);
        if (!EstadoPedido.CANCELABLES_POR_CLIENTE.contains(pedido.getEstado())) {
            throw new BusinessRuleException(
                "No puedes cancelar un pedido que el comercio ya empezó a atender");
        }

        guardarDetalle(pedido, razon);
        Pedido cancelado = aplicarTransicion(pedido, EstadoPedido.CANCELADO_POR_CLIENTE);
        return toResponse(cancelado);
    }

    // ---------------------------------------------------------------------------
    // Acciones del comercio (cada una valida que el pedido sea de un local del gestor)
    // ---------------------------------------------------------------------------

    @Transactional
    public PedidoResponse aceptar(Usuario gestor, Long pedidoId) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        Pedido aceptado = aplicarTransicion(pedido, EstadoPedido.ACEPTADO);
        return toResponse(aceptado);
    }

    @Transactional
    public PedidoResponse iniciarPreparacion(Usuario gestor, Long pedidoId) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        Pedido enPreparacion = aplicarTransicion(pedido, EstadoPedido.EN_PREPARACION);
        return toResponse(enPreparacion);
    }

    /** El destino depende del tipo de entrega; el comercio no lo elige. */
    @Transactional
    public PedidoResponse marcarListo(Usuario gestor, Long pedidoId) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        EstadoPedido destino = estadoListoSegun(pedido.getTipoEntrega());
        Pedido listo = aplicarTransicion(pedido, destino);
        return toResponse(listo);
    }

    /**
     * Entrega en mano (solo PICKUP). La entrega de un pedido DELIVERY la confirma el
     * repartidor (Fase 5), no el comercio, así que acá se bloquea.
     */
    @Transactional
    public PedidoResponse marcarEntregado(Usuario gestor, Long pedidoId) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        if (pedido.getTipoEntrega() == TipoEntrega.DELIVERY) {
            throw new BusinessRuleException(
                "La entrega de un pedido DELIVERY la confirma el repartidor, no el comercio");
        }
        Pedido entregado = aplicarTransicion(pedido, EstadoPedido.ENTREGADO);
        return toResponse(entregado);
    }

    /** Rechazo: solo cuando el pedido todavía espera que el comercio lo acepte. */
    @Transactional
    public PedidoResponse rechazar(Usuario gestor, Long pedidoId, MotivoCancelacionRequest request) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        if (pedido.getEstado() != EstadoPedido.PAGADO_ESPERANDO_COMERCIO) {
            throw new BusinessRuleException(
                "Solo se puede rechazar un pedido que está esperando que el comercio lo acepte");
        }
        return aplicarCancelacionPorComercio(pedido, request);
    }

    /** Cancelación: cuando el comercio ya había aceptado el pedido o lo estaba preparando. */
    @Transactional
    public PedidoResponse cancelarPorComercio(Usuario gestor, Long pedidoId, MotivoCancelacionRequest request) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        if (pedido.getEstado() != EstadoPedido.ACEPTADO
                && pedido.getEstado() != EstadoPedido.EN_PREPARACION) {
            throw new BusinessRuleException(
                "Solo se puede cancelar un pedido que ya fue aceptado o está en preparación");
        }
        return aplicarCancelacionPorComercio(pedido, request);
    }

    // ---------------------------------------------------------------------------
    // Transición de estado (utilidad interna; la usan el job de expiración y, en dev,
    // el endpoint que simula el pago)
    // ---------------------------------------------------------------------------

    /**
     * Cambia el estado respetando la máquina de estados de {@link Pedido} y publica
     * {@link PedidoEstadoCambiadoEvent} para que los listeners (notificación,
     * queuepoints, pago) reaccionen.
     */
    @Transactional
    public Pedido cambiarEstado(Long pedidoId, EstadoPedido nuevoEstado) {
        Pedido pedido = findById(pedidoId);
        return aplicarTransicion(pedido, nuevoEstado);
    }

    /**
     * Simula la confirmación del pago para poder probar el flujo del comercio antes
     * de que exista el módulo de pagos (Fase 4). Solo se expone en el perfil dev.
     */
    @Transactional
    public PedidoResponse simularPagoConfirmado(Long pedidoId) {
        Pedido pedido = findById(pedidoId);
        EstadoPedido destino = estadoPagadoSegun(pedido.getTipoEntrega());
        Pedido pagado = aplicarTransicion(pedido, destino);
        return toResponse(pagado);
    }

    private Pedido aplicarTransicion(Pedido pedido, EstadoPedido nuevoEstado) {
        EstadoPedido anterior = pedido.getEstado();
        pedido.transicionarA(nuevoEstado);
        Pedido guardado = pedidoRepository.save(pedido);
        eventPublisher.publishEvent(
            new PedidoEstadoCambiadoEvent(guardado.getId(), anterior, nuevoEstado));
        return guardado;
    }

    // ---------------------------------------------------------------------------
    // Helpers de creación
    // ---------------------------------------------------------------------------

    private PuntoDeVenta buscarLocalAtendiendo(Long puntoDeVentaId) {
        PuntoDeVenta local = puntoDeVentaRepository.findByIdAndActivoTrue(puntoDeVentaId)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", puntoDeVentaId));
        if (!local.getAbierto()) {
            throw new BusinessRuleException("El local no está atendiendo en este momento");
        }
        return local;
    }

    /**
     * Valida que el local esté atendiendo a la hora dada. Es package-private (no
     * privado) para poder probar la lógica con horas fijas, sin atar el test al reloj
     * del sistema.
     *
     * <p>Si el local no tiene horario definido (o apertura == cierre) se permite el
     * pedido. Un horario que cruza medianoche (apertura > cierre) no está soportado en
     * esta fase y se trata como configuración inválida.
     */
    void validarHorarioDeAtencion(PuntoDeVenta local, LocalTime ahora) {
        LocalTime apertura = local.getHorarioApertura();
        LocalTime cierre = local.getHorarioCierre();
        if (apertura == null || cierre == null || apertura.equals(cierre)) {
            return;
        }
        if (apertura.isAfter(cierre)) {
            log.warn("El local {} tiene un horario que cruza medianoche ({} - {}), no soportado",
                local.getId(), apertura, cierre);
            throw new BusinessRuleException("Configuración de horario no válida en el local");
        }
        if (ahora.isBefore(apertura) || ahora.isAfter(cierre)) {
            throw new BusinessRuleException("El local no atiende en este horario");
        }
    }

    private void validarZonaEntrega(CrearPedidoRequest request) {
        if (request.getTipoEntrega() != TipoEntrega.DELIVERY) {
            return;
        }
        String zona = request.getZonaEntrega();
        if (zona == null || zona.isBlank()) {
            throw new BusinessRuleException("Un pedido DELIVERY necesita la zona de entrega");
        }
    }

    private void agregarItems(Pedido pedido, PuntoDeVenta local, List<ItemPedidoRequest> itemsRequest) {
        for (ItemPedidoRequest itemRequest : itemsRequest) {
            Producto producto = buscarProductoDisponibleDelLocal(local, itemRequest.getProductoId());
            ItemPedido item = construirItem(pedido, producto, itemRequest.getCantidad());
            pedido.getItems().add(item);
        }
    }

    private Producto buscarProductoDisponibleDelLocal(PuntoDeVenta local, Long productoId) {
        Producto producto = productoRepository.findById(productoId)
            .orElseThrow(() -> new ResourceNotFoundException("Producto", productoId));
        if (!producto.getPuntoDeVenta().getId().equals(local.getId())) {
            throw new BusinessRuleException(
                "El producto '" + producto.getNombre() + "' no pertenece a este local");
        }
        if (!producto.getDisponible()) {
            throw new BusinessRuleException(
                "El producto '" + producto.getNombre() + "' no está disponible");
        }
        return producto;
    }

    /** El precio se congela al momento del pedido, por eso se copia del producto. */
    private ItemPedido construirItem(Pedido pedido, Producto producto, int cantidad) {
        BigDecimal precioUnitario = producto.getPrecio();
        BigDecimal subtotal = precioUnitario.multiply(BigDecimal.valueOf(cantidad));
        return ItemPedido.builder()
            .pedido(pedido)
            .producto(producto)
            .cantidad(cantidad)
            .precioUnitario(precioUnitario)
            .subtotal(subtotal)
            .build();
    }

    private void calcularTotales(Pedido pedido) {
        BigDecimal subtotal = BigDecimal.ZERO;
        for (ItemPedido item : pedido.getItems()) {
            subtotal = subtotal.add(item.getSubtotal());
        }
        pedido.setSubtotal(subtotal);
        // El descuento por QueuePoints es 0 en esta fase (el canje llega en Fase 5).
        pedido.setTotal(subtotal.subtract(pedido.getDescuentoQpts()));
    }

    private String generarCodigoUnico() {
        for (int intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
            String candidato = construirCodigo();
            if (pedidoRepository.findByCodigo(candidato).isEmpty()) {
                return candidato;
            }
        }
        throw new IllegalStateException("No se pudo generar un codigo de pedido unico");
    }

    private String construirCodigo() {
        String fecha = LocalDate.now(ZONA_LIMA).format(FORMATO_FECHA_CODIGO);
        StringBuilder sufijo = new StringBuilder(LONGITUD_SUFIJO_CODIGO);
        for (int i = 0; i < LONGITUD_SUFIJO_CODIGO; i++) {
            sufijo.append(ALFABETO_CODIGO.charAt(RANDOM.nextInt(ALFABETO_CODIGO.length())));
        }
        return "QL-" + fecha + "-" + sufijo;
    }

    // ---------------------------------------------------------------------------
    // Helpers de autorización por dueño
    // ---------------------------------------------------------------------------

    private void validarEsCliente(Usuario usuario) {
        if (!usuario.tieneRol(Rol.CLIENTE)) {
            throw new BusinessRuleException("Solo un usuario con rol CLIENTE puede crear pedidos");
        }
    }

    /** Devuelve el pedido si es del cliente; si es ajeno, 404 (no revelamos que existe). */
    private Pedido buscarPedidoDelCliente(Usuario cliente, Long pedidoId) {
        Pedido pedido = findById(pedidoId);
        if (!pedido.getCliente().getId().equals(cliente.getId())) {
            throw new ResourceNotFoundException("Pedido", pedidoId);
        }
        return pedido;
    }

    /** Devuelve el pedido si es de un local del gestor; si no, es un error de negocio (422). */
    private Pedido buscarPedidoOperableDelGestor(Usuario gestor, Long pedidoId) {
        Pedido pedido = findById(pedidoId);
        if (!esGestorDelLocal(gestor, pedido)) {
            throw new BusinessRuleException("Este pedido no pertenece a uno de tus locales");
        }
        return pedido;
    }

    private boolean esGestorDelLocal(Usuario gestor, Pedido pedido) {
        Long gestorDelLocal = pedido.getPuntoDeVenta().getGestor().getId();
        return gestorDelLocal.equals(gestor.getId());
    }

    // ---------------------------------------------------------------------------
    // Helpers varios
    // ---------------------------------------------------------------------------

    /** Lógica común de rechazar/cancelar: guarda motivo + detalle y aplica la transición. */
    private PedidoResponse aplicarCancelacionPorComercio(Pedido pedido, MotivoCancelacionRequest request) {
        pedido.setMotivoCancelacion(request.getMotivo());
        guardarDetalle(pedido, request.getDetalle());
        Pedido cancelado = aplicarTransicion(pedido, EstadoPedido.CANCELADO_POR_COMERCIO);
        return toResponse(cancelado);
    }

    private void guardarDetalle(Pedido pedido, String detalle) {
        if (detalle != null && !detalle.isBlank()) {
            pedido.setDetalleCancelacion(detalle);
        }
    }

    private EstadoPedido estadoListoSegun(TipoEntrega tipoEntrega) {
        if (tipoEntrega == TipoEntrega.PICKUP) {
            return EstadoPedido.LISTO_PARA_RECOGER;
        }
        return EstadoPedido.LISTO_PARA_DELIVERY;
    }

    private EstadoPedido estadoPagadoSegun(TipoEntrega tipoEntrega) {
        if (tipoEntrega == TipoEntrega.PICKUP) {
            return EstadoPedido.PAGADO_ESPERANDO_COMERCIO;
        }
        return EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR;
    }

    private void publicarCreacion(Pedido pedido) {
        // estadoAnterior = null indica que el pedido recién nace; los listeners filtran
        // por estadoNuevo, así que reutilizamos el mismo evento de cambio de estado.
        eventPublisher.publishEvent(
            new PedidoEstadoCambiadoEvent(pedido.getId(), null, pedido.getEstado()));
    }

    // ---------------------------------------------------------------------------
    // Mapeo a DTO (manual; el response no es 1:1 con la entidad)
    // ---------------------------------------------------------------------------

    private List<PedidoResponse> toResponseList(List<Pedido> pedidos) {
        List<PedidoResponse> respuesta = new ArrayList<>();
        for (Pedido pedido : pedidos) {
            respuesta.add(toResponse(pedido));
        }
        return respuesta;
    }

    private PedidoResponse toResponse(Pedido pedido) {
        List<ItemPedidoResponse> items = new ArrayList<>();
        for (ItemPedido item : pedido.getItems()) {
            items.add(toItemResponse(item));
        }

        return PedidoResponse.builder()
            .id(pedido.getId())
            .codigo(pedido.getCodigo())
            .estado(pedido.getEstado())
            .tipoEntrega(pedido.getTipoEntrega())
            .puntoDeVentaId(pedido.getPuntoDeVenta().getId())
            .subtotal(pedido.getSubtotal())
            .descuentoQpts(pedido.getDescuentoQpts())
            .total(pedido.getTotal())
            .items(items)
            .creadoAt(pedido.getCreadoAt())
            .pagadoAt(pedido.getPagadoAt())
            .aceptadoAt(pedido.getAceptadoAt())
            .listoAt(pedido.getListoAt())
            .entregadoAt(pedido.getEntregadoAt())
            .canceladoAt(pedido.getCanceladoAt())
            .motivoCancelacion(pedido.getMotivoCancelacion())
            .detalleCancelacion(pedido.getDetalleCancelacion())
            .build();
    }

    private ItemPedidoResponse toItemResponse(ItemPedido item) {
        Producto producto = item.getProducto();
        return ItemPedidoResponse.builder()
            .id(item.getId())
            .productoId(producto.getId())
            .nombre(producto.getNombre())
            .cantidad(item.getCantidad())
            .precioUnitario(item.getPrecioUnitario())
            .subtotal(item.getSubtotal())
            .build();
    }
}
