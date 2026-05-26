package pe.edu.utec.queueless.usuario.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.dto.ActivarRolRequest;
import pe.edu.utec.queueless.usuario.dto.UsuarioResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

@Tag(name = "Usuarios", description = "Datos del usuario autenticado y activacion de roles")
@RestController
@RequestMapping("/api/v1/usuarios")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UsuarioResponse>> me(Authentication authentication) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(usuarioService.toResponse(usuario)));
    }

    @PostMapping("/me/activar-rol")
    public ResponseEntity<ApiResponse<UsuarioResponse>> activarRol(
            Authentication authentication,
            @Valid @RequestBody ActivarRolRequest request) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        Usuario actualizado = usuarioService.activarRol(usuario.getId(), request.getRol());
        return ResponseEntity.ok(ApiResponse.ok(usuarioService.toResponse(actualizado)));
    }
}
