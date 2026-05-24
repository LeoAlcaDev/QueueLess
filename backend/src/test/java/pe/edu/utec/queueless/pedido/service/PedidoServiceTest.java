package pe.edu.utec.queueless.pedido.service;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.ItemPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.MotivoCancelacionRequest;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.repository.ProductoRepository;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas de creación, cancelación y acciones del comercio sobre el pedido.
 * Sin Spring ni DB: colaboradores mockeados. Patrón AAA.
 */
@ExtendWith(MockitoExtension.class)
class PedidoServiceTest {

    @Mock
    private PedidoRepository pedidoRepository;

    @Mock
    private ProductoRepository productoRepository;

    @Mock
    private PuntoDeVentaRepository puntoDeVentaRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private EntityManager entityManager;

    @InjectMocks
    private PedidoService service;

    // @InjectMocks usa el constructor (campos final); el EntityManager se inyecta por
    // @PersistenceContext en producción, así que acá lo seteamos a mano.
    @BeforeEach
    void inyectarEntityManager() {
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
    }

    // ----------------------------------------------------------------------
    // Creación
    // ----------------------------------------------------------------------

    @Test
    @DisplayName("crear un pedido válido calcula el subtotal y el total a partir de los productos")
    void crearCalculaTotales() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);
        PuntoDeVenta local = local(10L, usuario(2L, Rol.COMERCIO), true);
        Producto sandwich = producto(100L, local, "10.00", true);
        Producto jugo = producto(101L, local, "7.50", true);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(10L)).thenReturn(Optional.of(local));
        when(productoRepository.findById(100L)).thenReturn(Optional.of(sandwich));
        when(productoRepository.findById(101L)).thenReturn(Optional.of(jugo));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocacion -> {
            Pedido p = invocacion.getArgument(0);
            p.setId(99L);
            return p;
        });
        CrearPedidoRequest request = crearRequest(10L, TipoEntrega.PICKUP, null,
            itemRequest(100L, 2), itemRequest(101L, 1));

        // Act
        PedidoResponse response = service.crear(cliente, request);

        // Assert
        assertThat(response.getSubtotal()).isEqualByComparingTo("27.50");   // 10.00*2 + 7.50
        assertThat(response.getTotal()).isEqualByComparingTo("27.50");
        assertThat(response.getDescuentoQpts()).isEqualByComparingTo("0");
        assertThat(response.getEstado()).isEqualTo(EstadoPedido.PENDIENTE_PAGO);
        assertThat(response.getItems()).hasSize(2);
        assertThat(response.getCodigo()).startsWith("QL-");

        ArgumentCaptor<PedidoEstadoCambiadoEvent> captor =
            ArgumentCaptor.forClass(PedidoEstadoCambiadoEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().getEstadoAnterior()).isNull();
        assertThat(captor.getValue().getEstadoNuevo()).isEqualTo(EstadoPedido.PENDIENTE_PAGO);
    }

    @Test
    @DisplayName("crear con el local cerrado lanza BusinessRuleException")
    void crearConLocalCerradoFalla() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);
        PuntoDeVenta cerrado = local(10L, usuario(2L, Rol.COMERCIO), false);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(10L)).thenReturn(Optional.of(cerrado));
        CrearPedidoRequest request = crearRequest(10L, TipoEntrega.PICKUP, null, itemRequest(100L, 1));

        // Act + Assert
        assertThatThrownBy(() -> service.crear(cliente, request))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no está atendiendo");
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    @DisplayName("crear con un producto no disponible lanza BusinessRuleException")
    void crearConProductoNoDisponibleFalla() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);
        PuntoDeVenta local = local(10L, usuario(2L, Rol.COMERCIO), true);
        Producto agotado = producto(100L, local, "10.00", false);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(10L)).thenReturn(Optional.of(local));
        when(productoRepository.findById(100L)).thenReturn(Optional.of(agotado));
        CrearPedidoRequest request = crearRequest(10L, TipoEntrega.PICKUP, null, itemRequest(100L, 1));

        // Act + Assert
        assertThatThrownBy(() -> service.crear(cliente, request))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no está disponible");
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    @DisplayName("crear con un producto de otro local lanza BusinessRuleException")
    void crearConProductoDeOtroLocalFalla() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);
        PuntoDeVenta local = local(10L, usuario(2L, Rol.COMERCIO), true);
        PuntoDeVenta otroLocal = local(20L, usuario(3L, Rol.COMERCIO), true);
        Producto deOtroLocal = producto(100L, otroLocal, "10.00", true);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(10L)).thenReturn(Optional.of(local));
        when(productoRepository.findById(100L)).thenReturn(Optional.of(deOtroLocal));
        CrearPedidoRequest request = crearRequest(10L, TipoEntrega.PICKUP, null, itemRequest(100L, 1));

        // Act + Assert
        assertThatThrownBy(() -> service.crear(cliente, request))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no pertenece a este local");
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    @DisplayName("crear DELIVERY sin zona de entrega lanza BusinessRuleException")
    void crearDeliverySinZonaFalla() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);
        PuntoDeVenta local = local(10L, usuario(2L, Rol.COMERCIO), true);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(10L)).thenReturn(Optional.of(local));
        CrearPedidoRequest request = crearRequest(10L, TipoEntrega.DELIVERY, "   ", itemRequest(100L, 1));

        // Act + Assert
        assertThatThrownBy(() -> service.crear(cliente, request))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("zona de entrega");
        verify(pedidoRepository, never()).save(any());
    }

    // ----------------------------------------------------------------------
    // Cancelación del cliente
    // ----------------------------------------------------------------------

    @Test
    @DisplayName("el cliente puede cancelar un pedido que sigue en PENDIENTE_PAGO")
    void cancelarClienteDesdePendientePagoFunciona() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);
        PuntoDeVenta local = local(10L, usuario(2L, Rol.COMERCIO), true);
        Pedido pedido = pedido(50L, cliente, local, EstadoPedido.PENDIENTE_PAGO, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        // Act
        PedidoResponse response = service.cancelarPorCliente(cliente, 50L, "Ya no lo quiero");

        // Assert
        assertThat(response.getEstado()).isEqualTo(EstadoPedido.CANCELADO_POR_CLIENTE);
        assertThat(response.getDetalleCancelacion()).isEqualTo("Ya no lo quiero");
        verify(eventPublisher).publishEvent(any(PedidoEstadoCambiadoEvent.class));
    }

    @Test
    @DisplayName("el cliente no puede cancelar un pedido que el comercio ya aceptó")
    void cancelarClienteDesdeAceptadoFalla() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);
        PuntoDeVenta local = local(10L, usuario(2L, Rol.COMERCIO), true);
        Pedido pedido = pedido(50L, cliente, local, EstadoPedido.ACEPTADO, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));

        // Act + Assert
        assertThatThrownBy(() -> service.cancelarPorCliente(cliente, 50L, null))
            .isInstanceOf(BusinessRuleException.class);
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    @DisplayName("cancelar un pedido ajeno se ve como inexistente (404)")
    void cancelarPedidoAjenoDevuelve404() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);
        Usuario otroCliente = usuario(2L, Rol.CLIENTE);
        PuntoDeVenta local = local(10L, usuario(3L, Rol.COMERCIO), true);
        Pedido ajeno = pedido(50L, otroCliente, local, EstadoPedido.PENDIENTE_PAGO, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(ajeno));

        // Act + Assert
        assertThatThrownBy(() -> service.cancelarPorCliente(cliente, 50L, null))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(pedidoRepository, never()).save(any());
    }

    // ----------------------------------------------------------------------
    // Acciones del comercio
    // ----------------------------------------------------------------------

    @Test
    @DisplayName("aceptar un pedido de un local ajeno lanza BusinessRuleException")
    void aceptarComoComercioAjenoFalla() {
        // Arrange
        Usuario gestorReal = usuario(2L, Rol.COMERCIO);
        Usuario otroGestor = usuario(3L, Rol.COMERCIO);
        PuntoDeVenta local = local(10L, gestorReal, true);
        Pedido pedido = pedido(50L, usuario(1L, Rol.CLIENTE), local,
            EstadoPedido.PAGADO_ESPERANDO_COMERCIO, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));

        // Act + Assert
        assertThatThrownBy(() -> service.aceptar(otroGestor, 50L))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no pertenece a uno de tus locales");
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    @DisplayName("marcar listo un pedido PICKUP lo deja LISTO_PARA_RECOGER")
    void marcarListoPickupVaARecoger() {
        // Arrange
        Usuario gestor = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta local = local(10L, gestor, true);
        Pedido pedido = pedido(50L, usuario(1L, Rol.CLIENTE), local,
            EstadoPedido.EN_PREPARACION, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        // Act
        PedidoResponse response = service.marcarListo(gestor, 50L);

        // Assert
        assertThat(response.getEstado()).isEqualTo(EstadoPedido.LISTO_PARA_RECOGER);
    }

    @Test
    @DisplayName("marcar listo un pedido DELIVERY lo deja LISTO_PARA_DELIVERY")
    void marcarListoDeliveryVaADelivery() {
        // Arrange
        Usuario gestor = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta local = local(10L, gestor, true);
        Pedido pedido = pedido(50L, usuario(1L, Rol.CLIENTE), local,
            EstadoPedido.EN_PREPARACION, TipoEntrega.DELIVERY);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        // Act
        PedidoResponse response = service.marcarListo(gestor, 50L);

        // Assert
        assertThat(response.getEstado()).isEqualTo(EstadoPedido.LISTO_PARA_DELIVERY);
    }

    @Test
    @DisplayName("el comercio no puede marcar entregado un pedido DELIVERY (eso lo hace el repartidor)")
    void marcarEntregadoDeliveryFalla() {
        // Arrange
        Usuario gestor = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta local = local(10L, gestor, true);
        Pedido pedido = pedido(50L, usuario(1L, Rol.CLIENTE), local,
            EstadoPedido.LISTO_PARA_DELIVERY, TipoEntrega.DELIVERY);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));

        // Act + Assert
        assertThatThrownBy(() -> service.marcarEntregado(gestor, 50L))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("repartidor");
        verify(pedidoRepository, never()).save(any());
    }

    // ----------------------------------------------------------------------
    // Rechazo y cancelación del comercio
    // ----------------------------------------------------------------------

    @Test
    @DisplayName("rechazar un pedido que espera al comercio guarda el motivo")
    void rechazarGuardaMotivo() {
        // Arrange
        Usuario gestor = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta local = local(10L, gestor, true);
        Pedido pedido = pedido(50L, usuario(1L, Rol.CLIENTE), local,
            EstadoPedido.PAGADO_ESPERANDO_COMERCIO, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        // Act
        PedidoResponse response = service.rechazar(gestor, 50L,
            motivoRequest(MotivoCancelacion.PRODUCTO_AGOTADO, null));

        // Assert
        assertThat(response.getEstado()).isEqualTo(EstadoPedido.CANCELADO_POR_COMERCIO);
        assertThat(response.getMotivoCancelacion()).isEqualTo(MotivoCancelacion.PRODUCTO_AGOTADO);
    }

    @Test
    @DisplayName("rechazar un pedido que el comercio ya aceptó falla (para eso está cancelar)")
    void rechazarPedidoAceptadoFalla() {
        // Arrange
        Usuario gestor = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta local = local(10L, gestor, true);
        Pedido pedido = pedido(50L, usuario(1L, Rol.CLIENTE), local,
            EstadoPedido.ACEPTADO, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));

        // Act + Assert
        assertThatThrownBy(() -> service.rechazar(gestor, 50L,
                motivoRequest(MotivoCancelacion.PRODUCTO_AGOTADO, null)))
            .isInstanceOf(BusinessRuleException.class);
        verify(pedidoRepository, never()).save(any());
    }

    @Test
    @DisplayName("el comercio cancela un pedido que ya estaba en preparación y guarda motivo y detalle")
    void cancelarPorComercioDesdeEnPreparacionFunciona() {
        // Arrange
        Usuario gestor = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta local = local(10L, gestor, true);
        Pedido pedido = pedido(50L, usuario(1L, Rol.CLIENTE), local,
            EstadoPedido.EN_PREPARACION, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));
        when(pedidoRepository.save(any(Pedido.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        // Act
        PedidoResponse response = service.cancelarPorComercio(gestor, 50L,
            motivoRequest(MotivoCancelacion.LOCAL_SATURADO, "Demasiados pedidos en cola"));

        // Assert
        assertThat(response.getEstado()).isEqualTo(EstadoPedido.CANCELADO_POR_COMERCIO);
        assertThat(response.getMotivoCancelacion()).isEqualTo(MotivoCancelacion.LOCAL_SATURADO);
        assertThat(response.getDetalleCancelacion()).isEqualTo("Demasiados pedidos en cola");
    }

    @Test
    @DisplayName("el comercio no puede usar cancelar sobre un pedido que todavía no aceptó")
    void cancelarPorComercioAntesDeAceptarFalla() {
        // Arrange
        Usuario gestor = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta local = local(10L, gestor, true);
        Pedido pedido = pedido(50L, usuario(1L, Rol.CLIENTE), local,
            EstadoPedido.PAGADO_ESPERANDO_COMERCIO, TipoEntrega.PICKUP);
        when(pedidoRepository.findById(50L)).thenReturn(Optional.of(pedido));

        // Act + Assert
        assertThatThrownBy(() -> service.cancelarPorComercio(gestor, 50L,
                motivoRequest(MotivoCancelacion.PROBLEMA_OPERATIVO, null)))
            .isInstanceOf(BusinessRuleException.class);
        verify(pedidoRepository, never()).save(any());
    }

    // ----------------------------------------------------------------------
    // Horario de atención del local (lógica pura, con horas fijas)
    // ----------------------------------------------------------------------

    @Test
    @DisplayName("dentro del horario del local no lanza excepción")
    void horarioDentroPermite() {
        PuntoDeVenta local = localConHorario(LocalTime.of(8, 0), LocalTime.of(20, 0));
        assertThatCode(() -> service.validarHorarioDeAtencion(local, LocalTime.of(12, 0)))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("antes de abrir o después de cerrar lanza BusinessRuleException")
    void horarioFueraFalla() {
        PuntoDeVenta local = localConHorario(LocalTime.of(8, 0), LocalTime.of(20, 0));
        assertThatThrownBy(() -> service.validarHorarioDeAtencion(local, LocalTime.of(7, 0)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("no atiende");
        assertThatThrownBy(() -> service.validarHorarioDeAtencion(local, LocalTime.of(21, 0)))
            .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    @DisplayName("un local sin horario definido (null) permite el pedido")
    void horarioNullPermite() {
        PuntoDeVenta local = localConHorario(null, null);
        assertThatCode(() -> service.validarHorarioDeAtencion(local, LocalTime.of(3, 0)))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("apertura igual a cierre se trata como sin horario (permite)")
    void horarioIgualPermite() {
        PuntoDeVenta local = localConHorario(LocalTime.of(9, 0), LocalTime.of(9, 0));
        assertThatCode(() -> service.validarHorarioDeAtencion(local, LocalTime.of(18, 0)))
            .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("un horario que cruza medianoche se rechaza como configuración inválida")
    void horarioNocturnoFalla() {
        PuntoDeVenta local = localConHorario(LocalTime.of(18, 0), LocalTime.of(2, 0));
        assertThatThrownBy(() -> service.validarHorarioDeAtencion(local, LocalTime.of(20, 0)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("Configuración de horario no válida");
    }

    // ----------------------------------------------------------------------
    // Factories
    // ----------------------------------------------------------------------

    private Usuario usuario(Long id, Rol... roles) {
        Usuario usuario = Usuario.builder()
            .email("user" + id + "@utec.edu.pe")
            .passwordHash("hash")
            .nombreCompleto("Usuario " + id)
            .roles(new HashSet<>(Set.of(roles)))
            .build();
        usuario.setId(id);
        return usuario;
    }

    private PuntoDeVenta local(Long id, Usuario gestor, boolean abierto) {
        PuntoDeVenta local = PuntoDeVenta.builder()
            .nombre("Local " + id)
            .ubicacion("Bloque A")
            .gestor(gestor)
            .abierto(abierto)
            .activo(true)
            .build();
        local.setId(id);
        return local;
    }

    private Producto producto(Long id, PuntoDeVenta local, String precio, boolean disponible) {
        Producto producto = Producto.builder()
            .puntoDeVenta(local)
            .nombre("Producto " + id)
            .precio(new BigDecimal(precio))
            .tipoPreparacion(TipoPreparacion.PREPARADO)
            .disponible(disponible)
            .build();
        producto.setId(id);
        return producto;
    }

    private Pedido pedido(Long id, Usuario cliente, PuntoDeVenta local,
                          EstadoPedido estado, TipoEntrega tipoEntrega) {
        Pedido pedido = Pedido.builder()
            .codigo("QL-260524-AB123")
            .cliente(cliente)
            .puntoDeVenta(local)
            .estado(estado)
            .tipoEntrega(tipoEntrega)
            .subtotal(new BigDecimal("10.00"))
            .descuentoQpts(BigDecimal.ZERO)
            .total(new BigDecimal("10.00"))
            .build();
        pedido.setId(id);
        return pedido;
    }

    private ItemPedidoRequest itemRequest(Long productoId, int cantidad) {
        ItemPedidoRequest item = new ItemPedidoRequest();
        item.setProductoId(productoId);
        item.setCantidad(cantidad);
        return item;
    }

    private CrearPedidoRequest crearRequest(Long puntoDeVentaId, TipoEntrega tipoEntrega,
                                            String zonaEntrega, ItemPedidoRequest... items) {
        CrearPedidoRequest request = new CrearPedidoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setTipoEntrega(tipoEntrega);
        request.setZonaEntrega(zonaEntrega);
        request.setItems(new ArrayList<>(List.of(items)));
        return request;
    }

    private PuntoDeVenta localConHorario(LocalTime apertura, LocalTime cierre) {
        PuntoDeVenta local = local(10L, usuario(2L, Rol.COMERCIO), true);
        local.setHorarioApertura(apertura);
        local.setHorarioCierre(cierre);
        return local;
    }

    private MotivoCancelacionRequest motivoRequest(MotivoCancelacion motivo, String detalle) {
        MotivoCancelacionRequest request = new MotivoCancelacionRequest();
        request.setMotivo(motivo);
        request.setDetalle(detalle);
        return request;
    }
}
