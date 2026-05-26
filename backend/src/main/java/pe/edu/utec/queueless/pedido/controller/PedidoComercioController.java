package pe.edu.utec.queueless.pedido.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.pedido.dto.MotivoCancelacionRequest;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.List;

@Tag(name = "Pedidos (comercio)", description = "Endpoints para comercios: ver la cola y mover el pedido por sus estados")
@RestController
@RequestMapping("/api/v1/comercio/pedidos")
@RequiredArgsConstructor
public class PedidoComercioController {

    private final PedidoService pedidoService;
    private final UsuarioService usuarioService;

    @GetMapping("/cola")
    public ResponseEntity<ApiResponse<List<PedidoResponse>>> cola(Authentication authentication) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.listarColaDelComercio(gestor)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PedidoResponse>> detalle(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.verDetalleParaComercio(gestor, id)));
    }

    @PostMapping("/{id}/aceptar")
    public ResponseEntity<ApiResponse<PedidoResponse>> aceptar(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.aceptar(gestor, id), "Pedido aceptado"));
    }

    @PostMapping("/{id}/iniciar-preparacion")
    public ResponseEntity<ApiResponse<PedidoResponse>> iniciarPreparacion(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.iniciarPreparacion(gestor, id), "Pedido en preparación"));
    }

    @PostMapping("/{id}/marcar-listo")
    public ResponseEntity<ApiResponse<PedidoResponse>> marcarListo(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.marcarListo(gestor, id), "Pedido listo"));
    }

    @PostMapping("/{id}/marcar-entregado")
    public ResponseEntity<ApiResponse<PedidoResponse>> marcarEntregado(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.marcarEntregado(gestor, id), "Pedido entregado"));
    }

    /** Rechaza un pedido que todavía espera ser aceptado. */
    @PostMapping("/{id}/rechazar")
    public ResponseEntity<ApiResponse<PedidoResponse>> rechazar(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody MotivoCancelacionRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.rechazar(gestor, id, request), "Pedido rechazado"));
    }

    /** Cancela un pedido que el comercio ya había aceptado o estaba preparando. */
    @PostMapping("/{id}/cancelar")
    public ResponseEntity<ApiResponse<PedidoResponse>> cancelar(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody MotivoCancelacionRequest request) {
        Usuario gestor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.cancelarPorComercio(gestor, id, request), "Pedido cancelado"));
    }
}
