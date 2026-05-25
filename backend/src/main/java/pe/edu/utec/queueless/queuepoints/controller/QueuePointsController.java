package pe.edu.utec.queueless.queuepoints.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.queuepoints.dto.CanjearPuntosRequest;
import pe.edu.utec.queueless.queuepoints.dto.MovimientoResponse;
import pe.edu.utec.queueless.queuepoints.dto.SaldoResponse;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.service.QueuePointsService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.List;

/**
 * Saldo, historial y canje de QueuePoints del usuario autenticado.
 */
@Tag(name = "QueuePoints", description = "Saldo e historial de QueuePoints del usuario autenticado")
@RestController
@RequestMapping("/api/me/queuepoints")
@RequiredArgsConstructor
public class QueuePointsController {

    private final QueuePointsService service;
    private final UsuarioService usuarioService;

    @GetMapping("/saldo")
    public ResponseEntity<ApiResponse<SaldoResponse>> saldo(Authentication authentication) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(service.saldoDe(usuario)));
    }

    @GetMapping("/movimientos")
    public ResponseEntity<ApiResponse<List<MovimientoResponse>>> movimientos(
            Authentication authentication) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(service.historialDe(usuario)));
    }

    @PostMapping("/canjear")
    public ResponseEntity<ApiResponse<MovimientoResponse>> canjear(
            Authentication authentication,
            @Valid @RequestBody CanjearPuntosRequest request) {
        Usuario usuario = usuarioService.findByEmail(authentication.getName());
        MovimientoQueuePoints movimiento = service.canjear(
            usuario, request.getMonto(), request.getReferenciaTipo(),
            request.getReferenciaId(), request.getDescripcion());
        return ResponseEntity.ok(
            ApiResponse.ok(MovimientoResponse.from(movimiento), "Puntos canjeados"));
    }
}
