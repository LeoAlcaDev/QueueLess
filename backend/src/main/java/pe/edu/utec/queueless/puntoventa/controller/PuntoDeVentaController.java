package pe.edu.utec.queueless.puntoventa.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;

import java.util.List;

@Tag(name = "Puntos de venta", description = "Catálogo público de comercios del campus")
@RestController
@RequestMapping("/api/puntos-de-venta")
@RequiredArgsConstructor
public class PuntoDeVentaController {

    private final PuntoDeVentaService service;

    @GetMapping
    public ResponseEntity<List<PuntoDeVenta>> listar() {
        return ResponseEntity.ok(service.listarAbiertos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PuntoDeVenta> detalle(@PathVariable Long id) {
        return ResponseEntity.ok(service.findById(id));
    }
}
