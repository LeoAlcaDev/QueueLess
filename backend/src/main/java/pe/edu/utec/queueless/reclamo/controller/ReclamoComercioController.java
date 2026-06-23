package pe.edu.utec.queueless.reclamo.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.reclamo.dto.ReclamoResponse;
import pe.edu.utec.queueless.reclamo.dto.ResponderReclamoRequest;
import pe.edu.utec.queueless.reclamo.service.ReclamoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.List;

@Tag(name = "Reclamaciones (comercio)", description = "El comercio ve los reclamos en su contra y los responde")
@RestController
@RequestMapping("/api/v1/comercio/reclamos")
@PreAuthorize("hasRole('COMERCIO')")
@RequiredArgsConstructor
public class ReclamoComercioController {

    private final ReclamoService reclamoService;
    private final UsuarioService usuarioService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ReclamoResponse>>> listar(Authentication authentication) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(reclamoService.listarParaComercio(gestor)));
    }

    @PostMapping("/{id}/responder")
    public ResponseEntity<ApiResponse<ReclamoResponse>> responder(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody ResponderReclamoRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(reclamoService.responder(gestor, id, request), "Reclamo respondido"));
    }
}
