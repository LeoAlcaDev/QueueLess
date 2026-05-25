package pe.edu.utec.queueless.delivery.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.delivery.dto.SolicitudDeliveryResponse;
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.List;

/**
 * Endpoints del repartidor: ver pedidos disponibles, aceptar entrega y
 * confirmar los hitos (recogida del local, entrega al cliente).
 */
@Tag(name = "Delivery (repartidor)",
     description = "Solicitudes disponibles y flujo de aceptación, recogida y entrega")
@RestController
@RequestMapping("/api/repartidor")
@RequiredArgsConstructor
public class SolicitudDeliveryController {

    private final SolicitudDeliveryService service;
    private final UsuarioService usuarioService;

    @GetMapping("/pedidos-disponibles")
    public ResponseEntity<ApiResponse<List<SolicitudDeliveryResponse>>> pedidosDisponibles() {
        return ResponseEntity.ok(ApiResponse.ok(service.listarDisponibles()));
    }

    @GetMapping("/mis-entregas")
    public ResponseEntity<ApiResponse<List<SolicitudDeliveryResponse>>> misEntregas(
            Authentication authentication) {
        Usuario repartidor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(service.listarMisEntregas(repartidor)));
    }

    @GetMapping("/solicitudes/{id}")
    public ResponseEntity<ApiResponse<SolicitudDeliveryResponse>> detalle(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario repartidor = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(service.verDetalleParaRepartidor(repartidor, id)));
    }

    @PostMapping("/solicitudes/{id}/aceptar")
    public ResponseEntity<ApiResponse<SolicitudDeliveryResponse>> aceptar(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario repartidor = usuarioService.findByEmail(authentication.getName());
        SolicitudDeliveryResponse response = service.aceptar(repartidor, id);
        return ResponseEntity.ok(ApiResponse.ok(response, "Solicitud aceptada"));
    }

    @PostMapping("/solicitudes/{id}/confirmar-recogida")
    public ResponseEntity<ApiResponse<SolicitudDeliveryResponse>> confirmarRecogida(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario repartidor = usuarioService.findByEmail(authentication.getName());
        SolicitudDeliveryResponse response = service.confirmarRecogida(repartidor, id);
        return ResponseEntity.ok(ApiResponse.ok(response, "Recogida confirmada"));
    }

    @PostMapping("/solicitudes/{id}/confirmar-entrega")
    public ResponseEntity<ApiResponse<SolicitudDeliveryResponse>> confirmarEntrega(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario repartidor = usuarioService.findByEmail(authentication.getName());
        SolicitudDeliveryResponse response = service.confirmarEntrega(repartidor, id);
        return ResponseEntity.ok(ApiResponse.ok(response, "Entrega confirmada"));
    }
}
