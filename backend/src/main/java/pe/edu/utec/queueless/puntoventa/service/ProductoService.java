package pe.edu.utec.queueless.puntoventa.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.shared.storage.StorageService;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.LocalTime;
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
            .horarioServicioInicio(request.getHorarioServicioInicio())
            .horarioServicioFin(request.getHorarioServicioFin())
            .tieneVentanaDePedido(Boolean.TRUE.equals(request.getTieneVentanaDePedido()))
            .ventanaPedidoInicio(request.getVentanaPedidoInicio())
            .ventanaPedidoFin(request.getVentanaPedidoFin())
            .ventanaRecojoInicio(request.getVentanaRecojoInicio())
            .ventanaRecojoFin(request.getVentanaRecojoFin())
            .build();

        validarConfiguracionDeHorarios(producto);

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
        producto.setHorarioServicioInicio(request.getHorarioServicioInicio());
        producto.setHorarioServicioFin(request.getHorarioServicioFin());
        producto.setTieneVentanaDePedido(Boolean.TRUE.equals(request.getTieneVentanaDePedido()));
        producto.setVentanaPedidoInicio(request.getVentanaPedidoInicio());
        producto.setVentanaPedidoFin(request.getVentanaPedidoFin());
        producto.setVentanaRecojoInicio(request.getVentanaRecojoInicio());
        producto.setVentanaRecojoFin(request.getVentanaRecojoFin());

        validarConfiguracionDeHorarios(producto);

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

    // ---------------------------------------------------------------------------
    // Validación de la configuración de horarios (al crear y al actualizar)
    // ---------------------------------------------------------------------------

    private void validarConfiguracionDeHorarios(Producto producto) {
        validarConfiguracionHorarioServicio(producto);
        validarConfiguracionVentanas(producto);
    }

    /** Horario de servicio: o se dan inicio y fin (con inicio antes de fin), o ninguno. */
    private void validarConfiguracionHorarioServicio(Producto producto) {
        LocalTime inicio = producto.getHorarioServicioInicio();
        LocalTime fin = producto.getHorarioServicioFin();
        if (inicio == null && fin == null) {
            return;
        }
        if (inicio == null || fin == null) {
            throw new BusinessRuleException("El horario de servicio requiere inicio y fin, o ninguno");
        }
        if (!inicio.isBefore(fin)) {
            throw new BusinessRuleException("El horario de servicio debe empezar antes de terminar");
        }
    }

    private void validarConfiguracionVentanas(Producto producto) {
        if (!Boolean.TRUE.equals(producto.getTieneVentanaDePedido())) {
            validarSinVentanas(producto);
            return;
        }
        if (producto.getTipoPreparacion() == TipoPreparacion.INSTANTANEO) {
            throw new BusinessRuleException("Un producto instantáneo no puede tener ventana de pedido");
        }
        validarVentanasCompletas(producto);
    }

    /** Sin ventana de pedido, las cuatro franjas deben quedar vacías. */
    private void validarSinVentanas(Producto producto) {
        boolean algunaPresente = producto.getVentanaPedidoInicio() != null
            || producto.getVentanaPedidoFin() != null
            || producto.getVentanaRecojoInicio() != null
            || producto.getVentanaRecojoFin() != null;
        if (algunaPresente) {
            throw new BusinessRuleException("Las ventanas solo aplican cuando tieneVentanaDePedido = true");
        }
    }

    private void validarVentanasCompletas(Producto producto) {
        LocalTime pedidoInicio = producto.getVentanaPedidoInicio();
        LocalTime pedidoFin = producto.getVentanaPedidoFin();
        LocalTime recojoInicio = producto.getVentanaRecojoInicio();
        LocalTime recojoFin = producto.getVentanaRecojoFin();

        if (pedidoInicio == null || pedidoFin == null || recojoInicio == null || recojoFin == null) {
            throw new BusinessRuleException("Un producto por lote necesita las cuatro ventanas");
        }
        if (!pedidoInicio.isBefore(pedidoFin)) {
            throw new BusinessRuleException("La ventana de pedido debe empezar antes de terminar");
        }
        if (!recojoInicio.isBefore(recojoFin)) {
            throw new BusinessRuleException("La ventana de recojo debe empezar antes de terminar");
        }
        if (recojoFin.isBefore(pedidoFin)) {
            throw new BusinessRuleException("La ventana de recojo no puede terminar antes que la de pedido");
        }
    }

    // ---------------------------------------------------------------------------
    // Mapeo a response (con disponibilidad calculada al vuelo)
    // ---------------------------------------------------------------------------

    private ProductoResponse toResponse(Producto producto) {
        return toResponse(producto, TiempoLima.ahora());
    }

    private ProductoResponse toResponse(Producto producto, LocalTime ahora) {
        ProductoResponse response = new ProductoResponse();
        response.setId(producto.getId());
        response.setNombre(producto.getNombre());
        response.setDescripcion(producto.getDescripcion());
        response.setPrecio(producto.getPrecio());
        response.setFotoUrl(producto.getFotoUrl());
        response.setCategoria(producto.getCategoria());
        response.setTipoPreparacion(producto.getTipoPreparacion());
        response.setDisponible(producto.getDisponible());

        response.setHorarioServicioInicio(producto.getHorarioServicioInicio());
        response.setHorarioServicioFin(producto.getHorarioServicioFin());
        response.setTieneVentanaDePedido(producto.getTieneVentanaDePedido());
        response.setVentanaPedidoInicio(producto.getVentanaPedidoInicio());
        response.setVentanaPedidoFin(producto.getVentanaPedidoFin());
        response.setVentanaRecojoInicio(producto.getVentanaRecojoInicio());
        response.setVentanaRecojoFin(producto.getVentanaRecojoFin());

        String razon = calcularRazonNoDisponible(producto, ahora);
        response.setDisponibleAhora(razon == null);
        response.setRazonNoDisponible(razon);
        return response;
    }

    private List<ProductoResponse> toResponseList(List<Producto> productos) {
        LocalTime ahora = TiempoLima.ahora();
        List<ProductoResponse> respuesta = new ArrayList<>();
        for (Producto producto : productos) {
            respuesta.add(toResponse(producto, ahora));
        }
        return respuesta;
    }

    /**
     * Texto de por qué el producto no se puede pedir a la hora dada, o null si sí
     * se puede. Es package-private para probar el cálculo con horas fijas. El
     * horario de servicio tiene prioridad sobre la ventana de pedido en el mensaje.
     */
    String calcularRazonNoDisponible(Producto producto, LocalTime ahora) {
        if (fueraDeHorarioDeServicio(producto, ahora)) {
            return "Disponible de " + producto.getHorarioServicioInicio()
                + " a " + producto.getHorarioServicioFin();
        }
        if (fueraDeVentanaDePedido(producto, ahora)) {
            return "Se puede pedir de " + producto.getVentanaPedidoInicio()
                + " a " + producto.getVentanaPedidoFin();
        }
        return null;
    }

    private boolean fueraDeHorarioDeServicio(Producto producto, LocalTime ahora) {
        LocalTime inicio = producto.getHorarioServicioInicio();
        LocalTime fin = producto.getHorarioServicioFin();
        if (inicio == null || fin == null) {
            return false;
        }
        return ahora.isBefore(inicio) || ahora.isAfter(fin);
    }

    private boolean fueraDeVentanaDePedido(Producto producto, LocalTime ahora) {
        if (!Boolean.TRUE.equals(producto.getTieneVentanaDePedido())) {
            return false;
        }
        LocalTime inicio = producto.getVentanaPedidoInicio();
        LocalTime fin = producto.getVentanaPedidoFin();
        return ahora.isBefore(inicio) || ahora.isAfter(fin);
    }
}
