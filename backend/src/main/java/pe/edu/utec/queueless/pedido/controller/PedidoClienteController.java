package pe.edu.utec.queueless.pedido.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.delivery.dto.SolicitudDeliveryResponse;
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;
import pe.edu.utec.queueless.pedido.dto.CancelarPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

import java.util.List;

@Tag(name = "Pedidos (cliente)", description = "Endpoints para clientes: crear, ver y cancelar sus pedidos")
@RestController
@RequestMapping("/api/cliente/pedidos")
@RequiredArgsConstructor
public class PedidoClienteController {

    private final PedidoService pedidoService;
    private final SolicitudDeliveryService solicitudDeliveryService;
    private final UsuarioService usuarioService;

    @PostMapping
    public ResponseEntity<ApiResponse<PedidoResponse>> crear(
            Authentication authentication,
            @Valid @RequestBody CrearPedidoRequest request) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        PedidoResponse creado = pedidoService.crear(cliente, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(creado, "Pedido creado"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<PedidoResponse>>> misPedidos(Authentication authentication) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.listarMisPedidos(cliente)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PedidoResponse>> detalle(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok(pedidoService.verDetalleDeMiPedido(cliente, id)));
    }

    @PostMapping("/{id}/cancelar")
    public ResponseEntity<ApiResponse<PedidoResponse>> cancelar(
            Authentication authentication,
            @PathVariable Long id,
            @RequestBody(required = false) CancelarPedidoRequest request) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        String razon = request == null ? null : request.getRazon();
        PedidoResponse cancelado = pedidoService.cancelarPorCliente(cliente, id, razon);
        return ResponseEntity.ok(ApiResponse.ok(cancelado, "Pedido cancelado"));
    }

    @PostMapping("/{id}/solicitud-delivery/reintentar")
    public ResponseEntity<ApiResponse<SolicitudDeliveryResponse>> reintentarBusqueda(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        SolicitudDeliveryResponse nueva = solicitudDeliveryService.reintentarBusqueda(cliente, id);
        return ResponseEntity.ok(ApiResponse.ok(nueva, "Búsqueda reiniciada"));
    }

    @PostMapping("/{id}/cambiar-a-pickup")
    public ResponseEntity<ApiResponse<PedidoResponse>> cambiarAPickup(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        PedidoResponse actualizado = solicitudDeliveryService.cambiarAPickup(cliente, id);
        return ResponseEntity.ok(ApiResponse.ok(actualizado, "Pedido cambiado a recojo en tienda"));
    }
}
