package pe.edu.utec.queueless.pedido.resena.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pedido.resena.dto.CrearResenaRequest;
import pe.edu.utec.queueless.pedido.resena.dto.ResenaResponse;
import pe.edu.utec.queueless.pedido.resena.service.ResenaService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

@Tag(name = "Reseñas (cliente)", description = "Crear reseñas sobre el punto de venta o el repartidor")
@RestController
@RequestMapping("/api/v1/cliente/pedidos/{pedidoId}/resenas")
@PreAuthorize("hasRole('CLIENTE')")
@RequiredArgsConstructor
public class ResenaController {

    private final ResenaService resenaService;
    private final UsuarioService usuarioService;

    @PostMapping
    public ResponseEntity<ApiResponse<ResenaResponse>> crear(
            Authentication authentication,
            @PathVariable Long pedidoId,
            @Valid @RequestBody CrearResenaRequest request) {
        Usuario autor = usuarioService.findByEmail(authentication.getName());
        ResenaResponse response = resenaService.crear(autor, pedidoId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok(response, "Reseña creada"));
    }
}
