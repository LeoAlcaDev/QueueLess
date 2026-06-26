package pe.edu.utec.queueless.recomendador.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.recomendador.dto.AsistenteRequest;
import pe.edu.utec.queueless.recomendador.dto.AsistenteResponse;
import pe.edu.utec.queueless.recomendador.service.AsistenteService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

@Tag(name = "Asistente (cliente)", description = "Recomendación conversacional de qué pedir, segura por diseño")
@RestController
@RequestMapping("/api/v1/cliente/asistente")
@PreAuthorize("hasRole('CLIENTE')")
@RequiredArgsConstructor
public class AsistenteClienteController {

    private final UsuarioService usuarioService;
    private final AsistenteService asistenteService;

    @PostMapping
    public ResponseEntity<ApiResponse<AsistenteResponse>> recomendar(
            Authentication authentication,
            @Valid @RequestBody AsistenteRequest request) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(asistenteService.recomendar(usuario, request)));
    }
}
