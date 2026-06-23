package pe.edu.utec.queueless.reclamo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.reclamo.dto.AcuseReclamoResponse;
import pe.edu.utec.queueless.reclamo.dto.CrearReclamoRequest;
import pe.edu.utec.queueless.reclamo.dto.ReclamoResponse;
import pe.edu.utec.queueless.reclamo.service.ReclamoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.List;

@Tag(name = "Reclamaciones", description = "Libro de reclamaciones: registrar un reclamo y ver los propios")
@RestController
@RequestMapping("/api/v1/reclamos")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class ReclamoController {

    private final ReclamoService reclamoService;
    private final UsuarioService usuarioService;

    @PostMapping
    public ResponseEntity<ApiResponse<AcuseReclamoResponse>> registrar(
            Authentication authentication,
            @Valid @RequestBody CrearReclamoRequest request) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        AcuseReclamoResponse acuse = reclamoService.registrar(usuario, request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(acuse, "Reclamo registrado"));
    }

    @GetMapping("/mios")
    public ResponseEntity<ApiResponse<List<ReclamoResponse>>> mios(Authentication authentication) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(reclamoService.listarMios(usuario)));
    }
}
