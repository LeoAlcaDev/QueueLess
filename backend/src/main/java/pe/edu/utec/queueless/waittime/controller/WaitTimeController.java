package pe.edu.utec.queueless.waittime.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.waittime.dto.TiempoEstimadoResponse;
import pe.edu.utec.queueless.waittime.service.WaitTimeService;

/**
 * Endpoint público del tiempo de espera estimado de un punto de venta. Convive con
 * el controlador del catálogo bajo la misma ruta base, pero en un subpath propio.
 */
@Tag(name = "Tiempo estimado", description = "Tiempo de espera estimado de un punto de venta")
@RestController
@RequestMapping("/api/v1/puntos-de-venta")
@RequiredArgsConstructor
public class WaitTimeController {

    private final WaitTimeService waitTimeService;

    @GetMapping("/{id}/tiempo-estimado")
    public ResponseEntity<TiempoEstimadoResponse> tiempoEstimado(@PathVariable Long id) {
        return ResponseEntity.ok(new TiempoEstimadoResponse(waitTimeService.estimarMinutos(id)));
    }
}
