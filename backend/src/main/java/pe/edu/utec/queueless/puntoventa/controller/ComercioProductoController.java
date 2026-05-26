package pe.edu.utec.queueless.puntoventa.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.utec.queueless.puntoventa.dto.ActualizarProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CambiarDisponibilidadRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.List;

@Tag(name = "Productos (comercio)", description = "Gestion de los productos del comercio autenticado")
@RestController
@RequestMapping("/api/comercio/productos")
@RequiredArgsConstructor
public class ComercioProductoController {

    private final ProductoService productoService;
    private final UsuarioService usuarioService;

    @PostMapping
    public ResponseEntity<ApiResponse<ProductoResponse>> crear(
            Authentication authentication,
            @Valid @RequestBody CrearProductoRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        ProductoResponse creado = productoService.crear(gestor, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(creado, "Producto creado"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductoResponse>>> listar(
            Authentication authentication,
            @RequestParam Long puntoDeVentaId) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(productoService.listarTodosDelLocal(gestor, puntoDeVentaId)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductoResponse>> actualizar(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ActualizarProductoRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        ProductoResponse actualizado = productoService.actualizar(gestor, id, request);
        return ResponseEntity.ok(ApiResponse.ok(actualizado));
    }

    @PatchMapping("/{id}/disponibilidad")
    public ResponseEntity<ApiResponse<ProductoResponse>> cambiarDisponibilidad(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody CambiarDisponibilidadRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        ProductoResponse actualizado = productoService.marcarDisponibilidad(gestor, id, request.getDisponible());
        return ResponseEntity.ok(ApiResponse.ok(actualizado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        productoService.eliminar(gestor, id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping(value = "/{id}/foto", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<ProductoResponse>> subirFoto(
            Authentication authentication,
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        ProductoResponse actualizado = productoService.subirFoto(gestor, id, file);
        return ResponseEntity.ok(ApiResponse.ok(actualizado, "Foto actualizada"));
    }
}
