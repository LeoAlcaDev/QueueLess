package pe.edu.utec.queueless.puntoventa.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.puntoventa.dto.ActualizarPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.CambiarEstadoLocalRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.List;

@Tag(name = "Puntos de venta (comercio)", description = "Gestion de los locales del comercio autenticado")
@RestController
@RequestMapping("/api/v1/comercio/puntos-de-venta")
@PreAuthorize("hasRole('COMERCIO')")
@RequiredArgsConstructor
public class ComercioPuntoDeVentaController {

    private final PuntoDeVentaService puntoDeVentaService;
    private final UsuarioService usuarioService;

    @PostMapping
    public ResponseEntity<ApiResponse<PuntoDeVentaResponse>> crear(
            Authentication authentication,
            @Valid @RequestBody CrearPuntoDeVentaRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        PuntoDeVentaResponse creado = puntoDeVentaService.crearComoComercio(gestor, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(creado, "Punto de venta creado"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PuntoDeVentaResponse>>> listar(Authentication authentication) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(puntoDeVentaService.listarPorGestor(gestor)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PuntoDeVentaResponse>> actualizar(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ActualizarPuntoDeVentaRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        PuntoDeVentaResponse actualizado = puntoDeVentaService.actualizar(gestor, id, request);
        return ResponseEntity.ok(ApiResponse.ok(actualizado));
    }

    @PatchMapping("/{id}/estado")
    public ResponseEntity<ApiResponse<PuntoDeVentaResponse>> cambiarEstado(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody CambiarEstadoLocalRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        PuntoDeVentaResponse actualizado = puntoDeVentaService.cambiarEstado(gestor, id, request.getAbierto());
        return ResponseEntity.ok(ApiResponse.ok(actualizado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        puntoDeVentaService.eliminar(gestor, id);
        return ResponseEntity.noContent().build();
    }
}
