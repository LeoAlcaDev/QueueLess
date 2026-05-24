package pe.edu.utec.queueless.puntoventa.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;

import java.util.List;

@Tag(name = "Productos", description = "Menu publico de cada punto de venta")
@RestController
@RequestMapping("/api/puntos-de-venta/{puntoDeVentaId}/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductoResponse>>> listar(@PathVariable Long puntoDeVentaId) {
        return ResponseEntity.ok(ApiResponse.ok(service.listarPorPuntoDeVenta(puntoDeVentaId)));
    }
}
