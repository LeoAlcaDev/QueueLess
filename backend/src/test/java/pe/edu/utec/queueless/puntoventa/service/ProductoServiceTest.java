package pe.edu.utec.queueless.puntoventa.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.utec.queueless.puntoventa.dto.ActualizarProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.repository.ProductoRepository;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.storage.StorageService;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas del CRUD de productos. Sin Spring ni DB: colaboradores mockeados.
 * Patron AAA.
 */
@ExtendWith(MockitoExtension.class)
class ProductoServiceTest {

    @Mock
    private ProductoRepository repository;

    @Mock
    private PuntoDeVentaRepository puntoDeVentaRepository;

    @Mock
    private StorageService storageService;

    @InjectMocks
    private ProductoService service;

    private Usuario usuario(Long id) {
        Usuario usuario = Usuario.builder()
            .email("user" + id + "@utec.edu.pe")
            .passwordHash("hash")
            .nombreCompleto("Usuario " + id)
            .build();
        usuario.setId(id);
        return usuario;
    }

    private PuntoDeVenta localDe(Usuario gestor) {
        PuntoDeVenta local = PuntoDeVenta.builder()
            .nombre("Local")
            .ubicacion("Bloque A")
            .gestor(gestor)
            .build();
        local.setId(80L);
        return local;
    }

    private Producto producto(Long id, PuntoDeVenta local, boolean disponible) {
        Producto producto = Producto.builder()
            .puntoDeVenta(local)
            .nombre("Sandwich")
            .precio(new BigDecimal("12.50"))
            .tipoPreparacion(TipoPreparacion.PREPARADO)
            .disponible(disponible)
            .build();
        producto.setId(id);
        return producto;
    }

    private CrearProductoRequest crearRequest(Long puntoDeVentaId) {
        CrearProductoRequest request = new CrearProductoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setNombre("Jugo de fresa");
        request.setPrecio(new BigDecimal("9.00"));
        request.setTipoPreparacion(TipoPreparacion.INSTANTANEO);
        return request;
    }

    @Test
    @DisplayName("crear un producto en un local ajeno lanza BusinessRuleException")
    void shouldFallarWhenCreaEnLocalAjeno() {
        // Arrange
        Usuario comercio = usuario(2L);
        Usuario otro = usuario(3L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(80L)).thenReturn(Optional.of(localDe(otro)));

        // Act + Assert
        assertThatThrownBy(() -> service.crear(comercio, crearRequest(80L)))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("marcarDisponibilidad cambia el flag y guarda, sin borrar el producto")
    void shouldCambiarFlagWhenMarcaDisponibilidad() {
        // Arrange
        Usuario comercio = usuario(2L);
        Producto producto = producto(10L, localDe(comercio), true);
        when(repository.findById(10L)).thenReturn(Optional.of(producto));
        when(repository.save(any(Producto.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        // Act
        service.marcarDisponibilidad(comercio, 10L, false);

        // Assert
        assertThat(producto.getDisponible()).isFalse();
        verify(repository).save(producto);
        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("eliminar marca el producto como no disponible, no lo borra de la base")
    void shouldMarcarNoDisponibleWhenElimina() {
        // Arrange
        Usuario comercio = usuario(2L);
        Producto producto = producto(10L, localDe(comercio), true);
        when(repository.findById(10L)).thenReturn(Optional.of(producto));
        when(repository.save(any(Producto.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        // Act
        service.eliminar(comercio, 10L);

        // Assert
        assertThat(producto.getDisponible()).isFalse();
        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("subir una foto con tipo no permitido lanza BusinessRuleException y no sube nada")
    void shouldFallarWhenFotoTipoInvalido() {
        // Arrange
        Usuario comercio = usuario(2L);
        Producto producto = producto(10L, localDe(comercio), true);
        when(repository.findById(10L)).thenReturn(Optional.of(producto));
        MultipartFile file = new MockMultipartFile("file", "doc.txt", "text/plain", new byte[]{1, 2, 3});

        // Act + Assert
        assertThatThrownBy(() -> service.subirFoto(comercio, 10L, file))
            .isInstanceOf(BusinessRuleException.class);
        verify(storageService, never()).upload(anyString(), any());
    }

    // ----------------------------------------------------------------------
    // Validación de horarios y ventanas al crear / actualizar
    // ----------------------------------------------------------------------

    @Test
    @DisplayName("crear con horario de servicio válido guarda el producto")
    void shouldCrearWhenHorarioServicioValido() {
        // Arrange
        Usuario comercio = usuario(2L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(80L)).thenReturn(Optional.of(localDe(comercio)));
        when(repository.save(any(Producto.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
        CrearProductoRequest request = preparadoRequest();
        request.setHorarioServicioInicio(LocalTime.of(7, 0));
        request.setHorarioServicioFin(LocalTime.of(10, 30));

        // Act
        ProductoResponse response = service.crear(comercio, request);

        // Assert
        assertThat(response.getHorarioServicioInicio()).isEqualTo(LocalTime.of(7, 0));
        verify(repository).save(any(Producto.class));
    }

    @Test
    @DisplayName("crear con horario de servicio incompleto (solo inicio) falla")
    void shouldFallarWhenHorarioServicioParcial() {
        Usuario comercio = usuario(2L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(80L)).thenReturn(Optional.of(localDe(comercio)));
        CrearProductoRequest request = preparadoRequest();
        request.setHorarioServicioInicio(LocalTime.of(7, 0));

        assertThatThrownBy(() -> service.crear(comercio, request))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crear por lote con las cuatro ventanas válidas guarda el producto")
    void shouldCrearWhenVentanaValida() {
        Usuario comercio = usuario(2L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(80L)).thenReturn(Optional.of(localDe(comercio)));
        when(repository.save(any(Producto.class))).thenAnswer(invocacion -> invocacion.getArgument(0));
        CrearProductoRequest request = conVentana(
            LocalTime.of(11, 0), LocalTime.of(13, 0), LocalTime.of(12, 30), LocalTime.of(14, 0));

        ProductoResponse response = service.crear(comercio, request);

        assertThat(response.getTieneVentanaDePedido()).isTrue();
        verify(repository).save(any(Producto.class));
    }

    @Test
    @DisplayName("crear por lote sin las cuatro ventanas falla")
    void shouldFallarWhenVentanaIncompleta() {
        Usuario comercio = usuario(2L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(80L)).thenReturn(Optional.of(localDe(comercio)));
        CrearProductoRequest request = conVentana(
            LocalTime.of(11, 0), LocalTime.of(13, 0), LocalTime.of(12, 30), LocalTime.of(14, 0));
        request.setVentanaRecojoFin(null);

        assertThatThrownBy(() -> service.crear(comercio, request))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crear con recojo que termina antes que el pedido falla")
    void shouldFallarWhenRecojoAntesDePedido() {
        Usuario comercio = usuario(2L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(80L)).thenReturn(Optional.of(localDe(comercio)));
        // recojo_fin 12:30 termina antes que pedido_fin 13:00
        CrearProductoRequest request = conVentana(
            LocalTime.of(11, 0), LocalTime.of(13, 0), LocalTime.of(11, 30), LocalTime.of(12, 30));

        assertThatThrownBy(() -> service.crear(comercio, request))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crear con ventanas pero sin marcar por lote falla")
    void shouldFallarWhenVentanasSinFlag() {
        Usuario comercio = usuario(2L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(80L)).thenReturn(Optional.of(localDe(comercio)));
        CrearProductoRequest request = preparadoRequest();
        request.setTieneVentanaDePedido(false);
        request.setVentanaPedidoInicio(LocalTime.of(11, 0));
        request.setVentanaPedidoFin(LocalTime.of(13, 0));

        assertThatThrownBy(() -> service.crear(comercio, request))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crear un producto instantáneo por lote falla")
    void shouldFallarWhenInstantaneoPorLote() {
        Usuario comercio = usuario(2L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(80L)).thenReturn(Optional.of(localDe(comercio)));
        CrearProductoRequest request = conVentana(
            LocalTime.of(11, 0), LocalTime.of(13, 0), LocalTime.of(12, 30), LocalTime.of(14, 0));
        request.setTipoPreparacion(TipoPreparacion.INSTANTANEO);

        assertThatThrownBy(() -> service.crear(comercio, request))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("actualizar a instantáneo por lote falla")
    void shouldFallarWhenActualizaInstantaneoPorLote() {
        Usuario comercio = usuario(2L);
        Producto producto = producto(10L, localDe(comercio), true);
        when(repository.findById(10L)).thenReturn(Optional.of(producto));
        ActualizarProductoRequest request = new ActualizarProductoRequest();
        request.setNombre("Snack");
        request.setPrecio(new BigDecimal("5.00"));
        request.setTipoPreparacion(TipoPreparacion.INSTANTANEO);
        request.setTieneVentanaDePedido(true);
        request.setVentanaPedidoInicio(LocalTime.of(11, 0));
        request.setVentanaPedidoFin(LocalTime.of(13, 0));
        request.setVentanaRecojoInicio(LocalTime.of(12, 30));
        request.setVentanaRecojoFin(LocalTime.of(14, 0));

        assertThatThrownBy(() -> service.actualizar(comercio, 10L, request))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("calcularRazonNoDisponible: sin restricción devuelve null")
    void shouldEstarDisponibleWhenSinRestriccion() {
        Producto producto = producto(1L, localDe(usuario(2L)), true);
        assertThat(service.calcularRazonNoDisponible(producto, LocalTime.of(9, 0))).isNull();
    }

    @Test
    @DisplayName("calcularRazonNoDisponible: fuera del horario de servicio lo explica")
    void shouldExplicarElHorarioWhenFueraDeServicio() {
        Producto producto = producto(1L, localDe(usuario(2L)), true);
        producto.setHorarioServicioInicio(LocalTime.of(7, 0));
        producto.setHorarioServicioFin(LocalTime.of(10, 30));

        String razon = service.calcularRazonNoDisponible(producto, LocalTime.of(12, 0));

        assertThat(razon).isEqualTo("Disponible de 07:00 a 10:30");
    }

    @Test
    @DisplayName("calcularRazonNoDisponible: por lote fuera de la ventana de pedido lo explica")
    void shouldExplicarLaVentanaWhenFueraDeVentanaPedido() {
        Producto producto = producto(1L, localDe(usuario(2L)), true);
        producto.setTieneVentanaDePedido(true);
        producto.setVentanaPedidoInicio(LocalTime.of(11, 0));
        producto.setVentanaPedidoFin(LocalTime.of(13, 0));

        String razon = service.calcularRazonNoDisponible(producto, LocalTime.of(9, 0));

        assertThat(razon).isEqualTo("Se puede pedir de 11:00 a 13:00");
    }

    private CrearProductoRequest preparadoRequest() {
        CrearProductoRequest request = new CrearProductoRequest();
        request.setPuntoDeVentaId(80L);
        request.setNombre("Desayuno completo");
        request.setPrecio(new BigDecimal("16.00"));
        request.setTipoPreparacion(TipoPreparacion.PREPARADO);
        return request;
    }

    private CrearProductoRequest conVentana(LocalTime pedidoInicio, LocalTime pedidoFin,
                                            LocalTime recojoInicio, LocalTime recojoFin) {
        CrearProductoRequest request = preparadoRequest();
        request.setTieneVentanaDePedido(true);
        request.setVentanaPedidoInicio(pedidoInicio);
        request.setVentanaPedidoFin(pedidoFin);
        request.setVentanaRecojoInicio(recojoInicio);
        request.setVentanaRecojoFin(recojoFin);
        return request;
    }
}
