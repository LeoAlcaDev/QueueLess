package pe.edu.utec.queueless.pedido.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pedido.dto.ConfirmarEntregaRequest;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.ItemPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.ItemPedidoResponse;
import pe.edu.utec.queueless.pedido.dto.MotivoCancelacionRequest;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.ItemPedido;
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;
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
import pe.edu.utec.queueless.shared.qr.GeneradorQr;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PedidoService {

    private static final DateTimeFormatter FORMATO_FECHA_CODIGO = DateTimeFormatter.ofPattern("yyMMdd");
    private static final String ALFABETO_CODIGO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int LONGITUD_SUFIJO_CODIGO = 5;
    private static final int MAX_INTENTOS_CODIGO = 5;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final PedidoRepository pedidoRepository;
    private final ProductoRepository productoRepository;
    private final PuntoDeVentaRepository puntoDeVentaRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final GeneradorQr generadorQr;

    @PersistenceContext
    private EntityManager entityManager;

    // Parámetros de los pedidos programados (ADR-0026).
    @Value("${queueless.programado.horizonte-minimo-horas}")
    private long horizonteMinimoHoras;

    @Value("${queueless.programado.horizonte-maximo-dias}")
    private long horizonteMaximoDias;

    @Value("${queueless.programado.slot-minutos}")
    private int slotMinutos;

    @Value("${queueless.programado.ventana-arrepentimiento-minutos}")
    private long ventanaArrepentimientoMinutos;

    // Lectura
    public Pedido findById(Long id) {
        return pedidoRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido", id));
    }

    /** Pedidos del cliente, del más reciente al más antiguo, paginados (ADR-0023). */
    public Page<PedidoResponse> listarMisPedidos(Usuario cliente, Pageable pageable) {
        // el orden lo fija el repositorio; ignoramos cualquier sort que mande el cliente para
        // no romper la paginación estable (mismo total partido en páginas sin repetir ni saltar)
        Pageable saneado = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize());
        return pedidoRepository.findByClienteIdOrderByCreadoAtDescIdDesc(cliente.getId(), saneado)
            .map(this::toResponse);
    }

    /** Detalle de un pedido propio del cliente. Si es ajeno, se ve como inexistente (404). */
    public PedidoResponse verDetalleDeMiPedido(Usuario cliente, Long pedidoId) {
        Pedido pedido = buscarPedidoDelCliente(cliente, pedidoId);
        return toResponse(pedido);
    }

    /**
     * Genera al vuelo el QR (PNG) que codifica el código del pedido del cliente.
     * Solo el dueño lo obtiene: un pedido ajeno se ve como inexistente (404). El QR
     * no se guarda (ADR-0027).
     */
    public byte[] generarQrDeMiPedido(Usuario cliente, Long pedidoId) {
        Pedido pedido = buscarPedidoDelCliente(cliente, pedidoId);
        return generadorQr.generarPng(pedido.getCodigo());
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
        return toResponseComercioList(cola);
    }

    /** Detalle de un pedido de uno de los locales del comercio. Si es ajeno, 404. */
    public PedidoResponse verDetalleParaComercio(Usuario gestor, Long pedidoId) {
        Pedido pedido = findById(pedidoId);
        if (!esGestorDelLocal(gestor, pedido)) {
            throw new ResourceNotFoundException("Pedido", pedidoId);
        }
        return toResponseComercio(pedido);
    }

    // Acciones del cliente
    @Transactional
    public PedidoResponse crear(Usuario cliente, CrearPedidoRequest request) {
        validarEsCliente(cliente);
        if (request.getRecojoProgramadoAt() != null) {
            return crearProgramado(cliente, request);
        }
        return crearInmediato(cliente, request);
    }

    private PedidoResponse crearInmediato(Usuario cliente, CrearPedidoRequest request) {
        PuntoDeVenta local = buscarLocalAtendiendo(request.getPuntoDeVentaId());
        LocalTime ahora = TiempoLima.ahora();
        validarHorarioDeAtencion(local, ahora);
        validarZonaEntrega(request);

        Pedido pedido = Pedido.builder()
            .cliente(cliente)
            .puntoDeVenta(local)
            .estado(EstadoPedido.PENDIENTE_PAGO)
            .tipoEntrega(request.getTipoEntrega())
            .descuentoQpts(BigDecimal.ZERO)
            .build();

        agregarItems(pedido, local, request.getItems(), ahora);
        return finalizarCreacion(pedido);
    }

    /**
     * Crea un pedido programado: pagar ahora para recoger a una hora futura. Valida
     * que sea recojo en tienda, que la hora caiga en el horizonte y el slot, y que a
     * la hora de recojo el local atienda y cada producto esté disponible y acepte
     * programados. Las comprobaciones de disponibilidad van contra la hora de recojo,
     * no contra ahora (ADR-0026).
     */
    private PedidoResponse crearProgramado(Usuario cliente, CrearPedidoRequest request) {
        if (request.getTipoEntrega() != TipoEntrega.PICKUP) {
            throw new BusinessRuleException("Solo un pedido de recojo en tienda se puede programar");
        }
        Instant recojo = request.getRecojoProgramadoAt();
        validarHorizonte(recojo, Instant.now());
        validarSlot(recojo);

        PuntoDeVenta local = buscarLocalActivo(request.getPuntoDeVentaId());
        LocalTime horaRecojo = TiempoLima.horaDe(recojo);
        LocalDate fechaRecojo = TiempoLima.fechaDe(recojo);
        // validamos contra la hora de recojo: el local puede abrir recién a esa hora
        // y el producto estar disponible recién ese día
        validarHorarioDeAtencion(local, horaRecojo);

        Pedido pedido = Pedido.builder()
            .cliente(cliente)
            .puntoDeVenta(local)
            .estado(EstadoPedido.PENDIENTE_PAGO)
            .tipoEntrega(TipoEntrega.PICKUP)
            .recojoProgramadoAt(recojo)
            .descuentoQpts(BigDecimal.ZERO)
            .build();

        agregarItemsProgramado(pedido, local, request.getItems(), horaRecojo, fechaRecojo);
        return finalizarCreacion(pedido);
    }

    private PedidoResponse finalizarCreacion(Pedido pedido) {
        calcularTotales(pedido);
        pedido.setCodigo(generarCodigoUnico());
        Pedido guardado = pedidoRepository.save(pedido);
        // creado_at lo asigna la base (DEFAULT); recargamos para devolverlo en la respuesta.
        entityManager.refresh(guardado);
        publicarCreacion(guardado);
        return toResponse(guardado);
    }

    /**
     * Cancela un pedido del cliente. Un pedido inmediato se cancela mientras el estado
     * esté en {@link EstadoPedido#CANCELABLES_POR_CLIENTE} (hasta que el comercio lo
     * acepta). Un pedido programado sigue su propia regla: libre mientras no se pagó, y
     * ya pagado solo dentro de la ventana de arrepentimiento (ADR-0026).
     */
    @Transactional
    public PedidoResponse cancelarPorCliente(Usuario cliente, Long pedidoId, String razon) {
        Pedido pedido = buscarPedidoDelCliente(cliente, pedidoId);
        if (pedido.esProgramado()) {
            validarCancelacionProgramada(pedido, Instant.now());
        } else if (!EstadoPedido.CANCELABLES_POR_CLIENTE.contains(pedido.getEstado())) {
            throw new BusinessRuleException(
                "No puedes cancelar un pedido que el comercio ya empezó a atender");
        }

        guardarDetalle(pedido, razon);
        Pedido cancelado = aplicarTransicion(pedido, EstadoPedido.CANCELADO_POR_CLIENTE);
        return toResponse(cancelado);
    }

    /**
     * Reglas de cancelación de un pedido programado. Mientras no se pagó, se cancela
     * libre. Ya pagado, solo dentro de la ventana de arrepentimiento medida desde el
     * pago; pasada la ventana queda comprometido. Es package-private para probar con
     * un instante fijo.
     */
    void validarCancelacionProgramada(Pedido pedido, Instant ahora) {
        EstadoPedido estado = pedido.getEstado();
        if (estado == EstadoPedido.PENDIENTE_PAGO) {
            return;
        }
        if (!EstadoPedido.PROGRAMADO_ARREPENTIMIENTO.contains(estado)) {
            throw new BusinessRuleException("Este pedido programado ya no se puede cancelar");
        }
        Instant limite = pedido.getPagadoAt().plus(ventanaArrepentimientoMinutos, ChronoUnit.MINUTES);
        if (ahora.isAfter(limite)) {
            throw new BusinessRuleException(
                "Pasó la ventana de arrepentimiento; el pedido programado quedó comprometido");
        }
    }

    // Acciones del comercio (cada una valida que el pedido sea de un local del gestor)
    @Transactional
    public PedidoResponse aceptar(Usuario gestor, Long pedidoId) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        Pedido aceptado = aplicarTransicion(pedido, EstadoPedido.ACEPTADO);
        return toResponseComercio(aceptado);
    }

    @Transactional
    public PedidoResponse iniciarPreparacion(Usuario gestor, Long pedidoId) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        Pedido enPreparacion = aplicarTransicion(pedido, EstadoPedido.EN_PREPARACION);
        return toResponseComercio(enPreparacion);
    }

    /** El destino depende del tipo de entrega; el comercio no lo elige. */
    @Transactional
    public PedidoResponse marcarListo(Usuario gestor, Long pedidoId) {
        Pedido pedido = buscarPedidoOperableDelGestor(gestor, pedidoId);
        EstadoPedido destino = estadoListoSegun(pedido.getTipoEntrega());
        Pedido listo = aplicarTransicion(pedido, destino);
        return toResponseComercio(listo);
    }

    /**
     * Entrega en mano (solo PICKUP). La entrega de un pedido DELIVERY la confirma el
     * repartidor (Fase 5), no el comercio, así que acá se bloquea.
     */
    @Transactional
    public PedidoResponse marcarEntregado(Usuario gestor, Long pedidoId, ConfirmarEntregaRequest request) {
        Pedido pedido = buscarPedidoOperableDelGestorConBloqueo(gestor, pedidoId);
        if (pedido.getTipoEntrega() == TipoEntrega.DELIVERY) {
            throw new BusinessRuleException(
                "La entrega de un pedido DELIVERY la confirma el repartidor, no el comercio");
        }
        // El comercio cierra el recojo contra el código que el cliente le muestra. Acá no
        // hay puntos en juego; validar protege que ENTREGADO no se ponga sin que el cliente
        // haya recibido (ADR-0027).
        verificarCodigoEntrega(pedido, request.getCodigo());
        Pedido entregado = aplicarTransicion(pedido, EstadoPedido.ENTREGADO);
        return toResponseComercio(entregado);
    }

    /**
     * Verifica que el código que la contraparte tecleó o escaneó coincide con el del
     * pedido. Lo comparten el recojo (comercio) y el delivery (repartidor): es la única
     * prueba de que el cliente, que porta el código, está presente en la entrega
     * (ADR-0027). Comparamos sin distinguir mayúsculas porque el alfabeto del código
     * (A-Z, 0-9) no las distingue, así toleramos el tecleo manual en minúscula; un QR
     * siempre devuelve el código en mayúsculas tal como se generó.
     */
    public void verificarCodigoEntrega(Pedido pedido, String codigoProvisto) {
        String recibido = codigoProvisto == null ? "" : codigoProvisto.trim();
        if (!pedido.getCodigo().equalsIgnoreCase(recibido)) {
            throw new BusinessRuleException("El código de entrega no coincide con el del pedido");
        }
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

    // Transición de estado (utilidad interna; la usan el job de expiración y, en dev,
    // el endpoint que simula el pago)
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
     * La invoca el job de expiración: relee el pedido con bloqueo y solo lo pasa a
     * EXPIRADO si sigue en LISTO_PARA_RECOGER. Si el comercio ya lo entregó, no lo
     * toca. Devuelve si de verdad lo expiró, para que el job lo loguee solo cuando pasó.
     */
    @Transactional
    public boolean expirarRecojo(Long pedidoId) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido", pedidoId));
        if (pedido.getEstado() != EstadoPedido.LISTO_PARA_RECOGER) {
            return false;
        }
        aplicarTransicion(pedido, EstadoPedido.EXPIRADO);
        return true;
    }

    /**
     * Cancela, en nombre del sistema, un pedido programado que el comercio dejó vencer
     * (lo usa la red de seguridad). Setea el motivo y transiciona a
     * CANCELADO_POR_COMERCIO, que ya gatilla el reembolso por venir de un estado
     * pagado. No valida dueño: lo llama un trabajo programado, no un usuario.
     */
    @Transactional
    public Pedido cancelarProgramadoVencido(Long pedidoId, MotivoCancelacion motivo) {
        Pedido pedido = findById(pedidoId);
        pedido.setMotivoCancelacion(motivo);
        return aplicarTransicion(pedido, EstadoPedido.CANCELADO_POR_COMERCIO);
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

    /**
     * Cambia el tipo de entrega del pedido a recojo en tienda y lo transiciona a
     * PAGADO_ESPERANDO_COMERCIO. NO valida que el pedido sea del cliente que
     * llama: recibe el pedido ya resuelto por el caller (en Fase 5,
     * {@link pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService},
     * que valida el dueño con {@link #buscarPedidoDelCliente}). Solo aplica
     * mientras el pedido está buscando repartidor; en otro estado, o si ya es de
     * recojo en tienda, es un error de negocio.
     */
    @Transactional
    public PedidoResponse cambiarAPickup(Pedido pedido) {
        if (pedido.getEstado() != EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR) {
            throw new BusinessRuleException(
                "Solo se puede cambiar a recojo en tienda mientras se busca repartidor");
        }
        if (pedido.getTipoEntrega() != TipoEntrega.DELIVERY) {
            throw new BusinessRuleException("El pedido ya es de recojo en tienda");
        }
        pedido.setTipoEntrega(TipoEntrega.PICKUP);
        Pedido actualizado = aplicarTransicion(pedido, EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        return toResponse(actualizado);
    }

    private Pedido aplicarTransicion(Pedido pedido, EstadoPedido nuevoEstado) {
        EstadoPedido anterior = pedido.getEstado();
        pedido.transicionarA(nuevoEstado);
        Pedido guardado = pedidoRepository.save(pedido);
        eventPublisher.publishEvent(
            new PedidoEstadoCambiadoEvent(guardado.getId(), anterior, nuevoEstado));
        return guardado;
    }

    // Helpers de creación
    private PuntoDeVenta buscarLocalActivo(Long puntoDeVentaId) {
        return puntoDeVentaRepository.findByIdAndActivoTrue(puntoDeVentaId)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", puntoDeVentaId));
    }

    /**
     * Para un pedido inmediato exigimos además que el local esté abierto ahora. Un
     * programado no pasa por acá: se valida contra la hora de recojo, no contra ahora.
     */
    private PuntoDeVenta buscarLocalAtendiendo(Long puntoDeVentaId) {
        PuntoDeVenta local = buscarLocalActivo(puntoDeVentaId);
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
     * pedido. Soportamos horarios que cruzan medianoche (apertura > cierre, como un café
     * de 12:30 a 01:00): en ese caso el local está abierto si la hora es posterior a la
     * apertura o anterior al cierre del día siguiente.
     */
    void validarHorarioDeAtencion(PuntoDeVenta local, LocalTime ahora) {
        LocalTime apertura = local.getHorarioApertura();
        LocalTime cierre = local.getHorarioCierre();
        if (apertura == null || cierre == null || apertura.equals(cierre)) {
            return;
        }
        boolean abierto;
        if (apertura.isBefore(cierre)) {
            // horario dentro del mismo día, por ejemplo 08:00 a 20:00
            abierto = !ahora.isBefore(apertura) && !ahora.isAfter(cierre);
        } else {
            // horario que cruza medianoche, por ejemplo 12:30 a 01:00
            abierto = !ahora.isBefore(apertura) || !ahora.isAfter(cierre);
        }
        if (!abierto) {
            throw new BusinessRuleException("El local no atiende en este horario");
        }
    }

    /**
     * Si el producto tiene horario de servicio, la hora dada debe caer dentro.
     * Sin horario configurado no restringe. Es package-private para probar con
     * horas fijas, igual que {@link #validarHorarioDeAtencion}.
     */
    void validarHorarioDeServicio(Producto producto, LocalTime ahora) {
        LocalTime inicio = producto.getHorarioServicioInicio();
        LocalTime fin = producto.getHorarioServicioFin();
        if (inicio == null || fin == null) {
            return;
        }
        if (ahora.isBefore(inicio) || ahora.isAfter(fin)) {
            throw new BusinessRuleException(
                "El producto '" + producto.getNombre() + "' solo se sirve de " + inicio + " a " + fin);
        }
    }

    /**
     * Si el producto es por lote, la hora dada debe caer dentro de su ventana de
     * pedido. Si no es por lote, no restringe.
     */
    void validarVentanaDePedido(Producto producto, LocalTime ahora) {
        if (!Boolean.TRUE.equals(producto.getTieneVentanaDePedido())) {
            return;
        }
        LocalTime inicio = producto.getVentanaPedidoInicio();
        LocalTime fin = producto.getVentanaPedidoFin();
        if (ahora.isBefore(inicio) || ahora.isAfter(fin)) {
            throw new BusinessRuleException(
                "El producto '" + producto.getNombre() + "' solo se puede pedir de " + inicio + " a " + fin);
        }
    }

    /** El recojo programado debe caer entre el mínimo y el máximo de antelación. */
    void validarHorizonte(Instant recojo, Instant ahora) {
        Duration antelacion = Duration.between(ahora, recojo);
        if (antelacion.compareTo(Duration.ofHours(horizonteMinimoHoras)) < 0) {
            throw new BusinessRuleException(
                "El recojo programado debe ser al menos " + horizonteMinimoHoras + " horas después");
        }
        if (antelacion.compareTo(Duration.ofDays(horizonteMaximoDias)) > 0) {
            throw new BusinessRuleException(
                "El recojo programado no puede ser más de " + horizonteMaximoDias + " días después");
        }
    }

    /** El recojo programado debe caer en un slot redondo (múltiplo de los minutos configurados). */
    void validarSlot(Instant recojo) {
        LocalDateTime enLima = TiempoLima.enZonaLima(recojo);
        boolean enSlot = enLima.getMinute() % slotMinutos == 0
            && enLima.getSecond() == 0
            && enLima.getNano() == 0;
        if (!enSlot) {
            throw new BusinessRuleException(
                "El recojo programado debe caer en un intervalo de " + slotMinutos + " minutos");
        }
    }

    /** A la fecha de recojo, el producto debe estar dentro de su vigencia (si la tiene). */
    void validarVigencia(Producto producto, LocalDate fechaRecojo) {
        LocalDate inicio = producto.getVigenciaInicio();
        LocalDate fin = producto.getVigenciaFin();
        if (inicio != null && fechaRecojo.isBefore(inicio)) {
            throw new BusinessRuleException(
                "El producto '" + producto.getNombre() + "' aún no está vigente para esa fecha");
        }
        if (fin != null && fechaRecojo.isAfter(fin)) {
            throw new BusinessRuleException(
                "El producto '" + producto.getNombre() + "' ya no está vigente para esa fecha");
        }
    }

    private void validarAceptaProgramado(Producto producto) {
        if (!Boolean.TRUE.equals(producto.getAceptaProgramado())) {
            throw new BusinessRuleException(
                "El producto '" + producto.getNombre() + "' no acepta pedidos programados");
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

    private void agregarItems(Pedido pedido, PuntoDeVenta local, List<ItemPedidoRequest> itemsRequest,
                              LocalTime ahora) {
        for (ItemPedidoRequest itemRequest : itemsRequest) {
            Producto producto = buscarProductoDisponibleDelLocal(local, itemRequest.getProductoId());
            validarHorarioDeServicio(producto, ahora);
            validarVentanaDePedido(producto, ahora);
            ItemPedido item = construirItem(pedido, producto, itemRequest.getCantidad());
            pedido.getItems().add(item);
        }
    }

    /** Items de un programado: cada producto debe aceptar programados y estar disponible a la hora de recojo. */
    private void agregarItemsProgramado(Pedido pedido, PuntoDeVenta local,
                                        List<ItemPedidoRequest> itemsRequest,
                                        LocalTime horaRecojo, LocalDate fechaRecojo) {
        for (ItemPedidoRequest itemRequest : itemsRequest) {
            Producto producto = buscarProductoDisponibleDelLocal(local, itemRequest.getProductoId());
            validarAceptaProgramado(producto);
            validarHorarioDeServicio(producto, horaRecojo);
            validarVigencia(producto, fechaRecojo);
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
        String fecha = LocalDate.now(TiempoLima.ZONA).format(FORMATO_FECHA_CODIGO);
        StringBuilder sufijo = new StringBuilder(LONGITUD_SUFIJO_CODIGO);
        for (int i = 0; i < LONGITUD_SUFIJO_CODIGO; i++) {
            sufijo.append(ALFABETO_CODIGO.charAt(RANDOM.nextInt(ALFABETO_CODIGO.length())));
        }
        return "QL-" + fecha + "-" + sufijo;
    }

    // Helpers de autorización por dueño
    private void validarEsCliente(Usuario usuario) {
        if (!usuario.tieneRol(Rol.CLIENTE)) {
            throw new BusinessRuleException("Solo un usuario con rol CLIENTE puede crear pedidos");
        }
    }

    /**
     * Devuelve el pedido si es del cliente; si es ajeno, 404 (no revelamos que
     * existe). Es público porque el módulo de delivery lo reutiliza para
     * resolver el dueño del pedido antes de reintentar la búsqueda o cambiar a
     * recojo en tienda.
     */
    public Pedido buscarPedidoDelCliente(Usuario cliente, Long pedidoId) {
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

    /** Igual que el anterior pero con la fila bloqueada, para el cierre de entrega que compite con el job de expiración. */
    private Pedido buscarPedidoOperableDelGestorConBloqueo(Usuario gestor, Long pedidoId) {
        Pedido pedido = pedidoRepository.findByIdForUpdate(pedidoId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido", pedidoId));
        if (!esGestorDelLocal(gestor, pedido)) {
            throw new BusinessRuleException("Este pedido no pertenece a uno de tus locales");
        }
        return pedido;
    }

    private boolean esGestorDelLocal(Usuario gestor, Pedido pedido) {
        Long gestorDelLocal = pedido.getPuntoDeVenta().getGestor().getId();
        return gestorDelLocal.equals(gestor.getId());
    }

    // Helpers varios
    /** Lógica común de rechazar/cancelar: guarda motivo + detalle y aplica la transición. */
    private PedidoResponse aplicarCancelacionPorComercio(Pedido pedido, MotivoCancelacionRequest request) {
        pedido.setMotivoCancelacion(request.getMotivo());
        guardarDetalle(pedido, request.getDetalle());
        Pedido cancelado = aplicarTransicion(pedido, EstadoPedido.CANCELADO_POR_COMERCIO);
        return toResponseComercio(cancelado);
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

    // Mapeo a DTO (manual; el response no es 1:1 con la entidad)
    private List<PedidoResponse> toResponseList(List<Pedido> pedidos) {
        List<PedidoResponse> respuesta = new ArrayList<>();
        for (Pedido pedido : pedidos) {
            respuesta.add(toResponse(pedido));
        }
        return respuesta;
    }

    // El comercio valida la entrega contra el código que porta el cliente, así que su
    // vista del pedido va sin el código; si lo viera, exigirlo no probaría nada. Es la
    // misma razón por la que tampoco viaja por SSE (ADR-0027).
    private List<PedidoResponse> toResponseComercioList(List<Pedido> pedidos) {
        List<PedidoResponse> respuesta = new ArrayList<>();
        for (Pedido pedido : pedidos) {
            respuesta.add(toResponseComercio(pedido));
        }
        return respuesta;
    }

    private PedidoResponse toResponse(Pedido pedido) {
        return construirResponse(pedido, true);
    }

    private PedidoResponse toResponseComercio(Pedido pedido) {
        return construirResponse(pedido, false);
    }

    private PedidoResponse construirResponse(Pedido pedido, boolean incluirCodigo) {
        List<ItemPedidoResponse> items = new ArrayList<>();
        for (ItemPedido item : pedido.getItems()) {
            items.add(toItemResponse(item));
        }

        return PedidoResponse.builder()
            .id(pedido.getId())
            .codigo(incluirCodigo ? pedido.getCodigo() : null)
            .estado(pedido.getEstado())
            .tipoEntrega(pedido.getTipoEntrega())
            .recojoProgramadoAt(pedido.getRecojoProgramadoAt())
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
