package pe.edu.utec.queueless.usuario.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.dto.*;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.PerfilService;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

@Tag(name = "Perfiles", description = "Lectura y actualizacion de los perfiles del usuario autenticado")
@RestController
@RequestMapping("/api/me/perfiles")
@RequiredArgsConstructor
public class PerfilController {

    private final UsuarioService usuarioService;
    private final PerfilService perfilService;

    @GetMapping
    public ResponseEntity<ApiResponse<PerfilesResponse>> misPerfiles(Authentication authentication) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(perfilService.obtenerPerfiles(usuario)));
    }

    @PutMapping("/cliente")
    public ResponseEntity<ApiResponse<PerfilClienteResponse>> actualizarCliente(
            Authentication authentication,
            @Valid @RequestBody ActualizarPerfilClienteRequest request) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(perfilService.actualizarPerfilCliente(usuario, request)));
    }

    @PutMapping("/comercio")
    public ResponseEntity<ApiResponse<PerfilComercioResponse>> actualizarComercio(
            Authentication authentication,
            @Valid @RequestBody ActualizarPerfilComercioRequest request) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(perfilService.actualizarPerfilComercio(usuario, request)));
    }

    @PutMapping("/repartidor")
    public ResponseEntity<ApiResponse<PerfilRepartidorResponse>> actualizarRepartidor(
            Authentication authentication,
            @Valid @RequestBody ActualizarPerfilRepartidorRequest request) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(perfilService.actualizarPerfilRepartidor(usuario, request)));
    }
}
