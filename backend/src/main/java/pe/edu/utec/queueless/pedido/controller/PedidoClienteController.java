package pe.edu.utec.queueless.pedido.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.pedido.dto.CrearPedidoRequest;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.service.PedidoService;

import java.util.List;

@Tag(name = "Pedidos (cliente)", description = "Endpoints para clientes: crear pedido, ver mis pedidos")
@RestController
@RequestMapping("/api/cliente/pedidos")
@RequiredArgsConstructor
public class PedidoClienteController {

    private final PedidoService pedidoService;

    @PostMapping
    public ResponseEntity<Pedido> crear(@Valid @RequestBody CrearPedidoRequest request) {
        // TODO Semana 2: extraer clienteId del SecurityContext
        Long clienteId = 0L;
        return ResponseEntity.ok(pedidoService.crear(clienteId, request));
    }

    @GetMapping
    public ResponseEntity<List<Pedido>> misPedidos() {
        Long clienteId = 0L;  // TODO
        return ResponseEntity.ok(pedidoService.listarMisPedidos(clienteId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pedido> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(pedidoService.findById(id));
    }
}
