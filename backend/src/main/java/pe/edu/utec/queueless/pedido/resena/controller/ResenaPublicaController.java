package pe.edu.utec.queueless.pedido.resena.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pedido.resena.dto.ResenaResponse;
import pe.edu.utec.queueless.pedido.resena.service.ResenaService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;

import java.util.List;

/**
 * Endpoints públicos de lectura de reseñas. Quedan bajo
 * {@code /api/puntos-de-venta/**} y {@code /api/repartidores/**} para que
 * cualquier visitante pueda ver la reputación antes de pedir.
 */
@Tag(name = "Reseñas (público)", description = "Listado público de reseñas por punto de venta y repartidor")
@RestController
@RequiredArgsConstructor
public class ResenaPublicaController {

    private final ResenaService resenaService;

    @GetMapping("/api/puntos-de-venta/{id}/resenas")
    public ResponseEntity<ApiResponse<List<ResenaResponse>>> deLocal(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(resenaService.listarDePuntoDeVenta(id)));
    }

    @GetMapping("/api/repartidores/{id}/resenas")
    public ResponseEntity<ApiResponse<List<ResenaResponse>>> deRepartidor(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(resenaService.listarDeRepartidor(id)));
    }
}
