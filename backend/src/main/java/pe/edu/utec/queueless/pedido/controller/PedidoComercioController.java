package pe.edu.utec.queueless.pedido.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.pedido.dto.CambiarEstadoRequest;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.service.PedidoService;

@Tag(name = "Pedidos (comercio)", description = "Endpoints para comercios: ver cola, aceptar, marcar listo")
@RestController
@RequestMapping("/api/comercio/pedidos")
@RequiredArgsConstructor
public class PedidoComercioController {

    private final PedidoService pedidoService;

    @PatchMapping("/{id}/estado")
    public ResponseEntity<Pedido> cambiarEstado(@PathVariable Long id,
                                                @Valid @RequestBody CambiarEstadoRequest request) {
        return ResponseEntity.ok(pedidoService.cambiarEstado(id, request.getNuevoEstado()));
    }

    // TODO Semana 2: GET /cola (pedidos pendientes/preparación/listos del comercio del usuario)
}
