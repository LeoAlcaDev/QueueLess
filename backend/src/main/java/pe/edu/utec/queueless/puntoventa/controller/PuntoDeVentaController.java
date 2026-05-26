package pe.edu.utec.queueless.puntoventa.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;

import java.util.List;

@Tag(name = "Puntos de venta", description = "Catalogo publico de comercios del campus")
@RestController
@RequestMapping("/api/v1/puntos-de-venta")
@RequiredArgsConstructor
public class PuntoDeVentaController {

    private final PuntoDeVentaService service;

    @GetMapping
    public ResponseEntity<ApiResponse<List<PuntoDeVentaResponse>>> listar() {
        return ResponseEntity.ok(ApiResponse.ok(service.listarAbiertos()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PuntoDeVentaResponse>> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(service.obtenerDetallePublico(id)));
    }
}
