package pe.edu.utec.queueless.puntoventa.service;

import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.utec.queueless.puntoventa.dto.ActualizarProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.ProductoRepository;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.shared.storage.StorageService;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductoService {

    private static final String CARPETA_FOTOS = "productos";
    private static final Set<String> TIPOS_IMAGEN_PERMITIDOS =
        Set.of("image/jpeg", "image/png", "image/webp");

    private final ProductoRepository repository;
    private final PuntoDeVentaRepository puntoDeVentaRepository;
    private final StorageService storageService;
    private final ModelMapper modelMapper;

    // ---------------------------------------------------------------------------
    // Lectura
    // ---------------------------------------------------------------------------

    /** Catalogo publico de un local: solo los productos disponibles. */
    public List<ProductoResponse> listarPorPuntoDeVenta(Long puntoDeVentaId) {
        List<Producto> productos = repository.findByPuntoDeVentaIdAndDisponibleTrue(puntoDeVentaId);
        return toResponseList(productos);
    }

    /** Dashboard del comercio: todos los productos del local, incluidos los no disponibles. */
    public List<ProductoResponse> listarTodosDelLocal(Usuario gestor, Long puntoDeVentaId) {
        buscarLocalActivoDelGestor(gestor, puntoDeVentaId);
        List<Producto> productos = repository.findByPuntoDeVentaId(puntoDeVentaId);
        return toResponseList(productos);
    }

    public Producto findById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Producto", id));
    }

    // ---------------------------------------------------------------------------
    // Gestion por el comercio
    // ---------------------------------------------------------------------------

    @Transactional
    public ProductoResponse crear(Usuario gestor, CrearProductoRequest request) {
        PuntoDeVenta puntoDeVenta = buscarLocalActivoDelGestor(gestor, request.getPuntoDeVentaId());

        Producto producto = Producto.builder()
            .puntoDeVenta(puntoDeVenta)
            .nombre(request.getNombre())
            .descripcion(request.getDescripcion())
            .precio(request.getPrecio())
            .categoria(request.getCategoria())
            .tipoPreparacion(request.getTipoPreparacion())
            .disponible(true)
            .build();

        Producto guardado = repository.save(producto);
        return toResponse(guardado);
    }

    @Transactional
    public ProductoResponse actualizar(Usuario gestor, Long productoId, ActualizarProductoRequest request) {
        Producto producto = buscarProductoDelGestor(gestor, productoId);

        producto.setNombre(request.getNombre());
        producto.setDescripcion(request.getDescripcion());
        producto.setPrecio(request.getPrecio());
        producto.setCategoria(request.getCategoria());
        producto.setTipoPreparacion(request.getTipoPreparacion());

        Producto actualizado = repository.save(producto);
        return toResponse(actualizado);
    }

    @Transactional
    public ProductoResponse marcarDisponibilidad(Usuario gestor, Long productoId, boolean disponible) {
        Producto producto = buscarProductoDelGestor(gestor, productoId);
        producto.setDisponible(disponible);
        Producto actualizado = repository.save(producto);
        return toResponse(actualizado);
    }

    /**
     * "Borra" un producto marcandolo como no disponible; la fila se conserva para no
     * romper los pedidos historicos. Es idempotente: borrar uno ya no disponible no falla.
     */
    @Transactional
    public void eliminar(Usuario gestor, Long productoId) {
        marcarDisponibilidad(gestor, productoId, false);
    }

    @Transactional
    public ProductoResponse subirFoto(Usuario gestor, Long productoId, MultipartFile file) {
        Producto producto = buscarProductoDelGestor(gestor, productoId);
        validarImagen(file);

        String url = storageService.upload(CARPETA_FOTOS, file);
        producto.setFotoUrl(url);

        Producto actualizado = repository.save(producto);
        return toResponse(actualizado);
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private PuntoDeVenta buscarLocalActivoDelGestor(Usuario gestor, Long puntoDeVentaId) {
        PuntoDeVenta puntoDeVenta = puntoDeVentaRepository.findByIdAndActivoTrue(puntoDeVentaId)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", puntoDeVentaId));
        if (!puntoDeVenta.getGestor().getId().equals(gestor.getId())) {
            throw new BusinessRuleException("El punto de venta no pertenece a este comercio");
        }
        return puntoDeVenta;
    }

    private Producto buscarProductoDelGestor(Usuario gestor, Long productoId) {
        Producto producto = findById(productoId);
        Long gestorDelLocal = producto.getPuntoDeVenta().getGestor().getId();
        if (!gestorDelLocal.equals(gestor.getId())) {
            throw new BusinessRuleException("El producto no pertenece a este comercio");
        }
        return producto;
    }

    private void validarImagen(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessRuleException("La foto no puede estar vacia");
        }
        String contentType = file.getContentType();
        if (contentType == null || !TIPOS_IMAGEN_PERMITIDOS.contains(contentType)) {
            throw new BusinessRuleException("Formato de imagen no permitido. Usa JPEG, PNG o WEBP");
        }
    }

    private ProductoResponse toResponse(Producto producto) {
        return modelMapper.map(producto, ProductoResponse.class);
    }

    private List<ProductoResponse> toResponseList(List<Producto> productos) {
        List<ProductoResponse> respuesta = new ArrayList<>();
        for (Producto producto : productos) {
            respuesta.add(toResponse(producto));
        }
        return respuesta;
    }
}
