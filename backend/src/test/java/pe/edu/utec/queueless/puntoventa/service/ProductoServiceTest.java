package pe.edu.utec.queueless.puntoventa.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.repository.ProductoRepository;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.storage.StorageService;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
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

    @Mock
    private ModelMapper modelMapper;

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
    void crearEnLocalAjenoFalla() {
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
    void marcarDisponibilidadCambiaFlag() {
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
    void eliminarMarcaNoDisponible() {
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
    void subirFotoTipoInvalidoFalla() {
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
}
