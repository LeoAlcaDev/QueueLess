package pe.edu.utec.queueless.ocupacion.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.ocupacion.dto.OcupacionResponse;
import pe.edu.utec.queueless.ocupacion.service.OcupacionService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

@Tag(name = "Ocupación (comercio)", description = "Curva de afluencia por hora del local, para anticipar la jornada")
@RestController
@RequestMapping("/api/v1/comercio/ocupacion")
@PreAuthorize("hasRole('COMERCIO')")
@RequiredArgsConstructor
public class OcupacionComercioController {

    private final OcupacionService ocupacionService;
    private final UsuarioService usuarioService;

    @GetMapping("/{puntoVentaId}")
    public ResponseEntity<ApiResponse<OcupacionResponse>> curva(
            Authentication authentication,
            @PathVariable Long puntoVentaId) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(ocupacionService.curvaParaComercio(gestor, puntoVentaId)));
    }
}
