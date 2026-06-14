package pe.edu.utec.queueless.pedido.resena.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pedido.resena.dto.ResenaResponse;
import pe.edu.utec.queueless.pedido.resena.service.ResenaService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.shared.dto.PageResponse;

/**
 * Endpoints públicos de lectura de reseñas. Quedan bajo
 * {@code /api/v1/puntos-de-venta/**} y {@code /api/v1/repartidores/**} para que
 * cualquier visitante pueda ver la reputación antes de pedir.
 */
@Tag(name = "Reseñas (público)", description = "Listado público de reseñas por punto de venta y repartidor")
@RestController
@RequiredArgsConstructor
public class ResenaPublicaController {

    private final ResenaService resenaService;

    @GetMapping("/api/v1/puntos-de-venta/{id}/resenas")
    public ResponseEntity<ApiResponse<PageResponse<ResenaResponse>>> deLocal(
            @PathVariable Long id, Pageable pageable) {
        Page<ResenaResponse> pagina = resenaService.listarDePuntoDeVenta(id, pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(pagina)));
    }

    @GetMapping("/api/v1/repartidores/{id}/resenas")
    public ResponseEntity<ApiResponse<PageResponse<ResenaResponse>>> deRepartidor(
            @PathVariable Long id, Pageable pageable) {
        Page<ResenaResponse> pagina = resenaService.listarDeRepartidor(id, pageable);
        return ResponseEntity.ok(ApiResponse.ok(PageResponse.of(pagina)));
    }
}
