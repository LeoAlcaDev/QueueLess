package pe.edu.utec.queueless.puntoventa.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;

import java.util.List;

@Tag(name = "Productos", description = "Menú de cada punto de venta")
@RestController
@RequestMapping("/api/puntos-de-venta/{puntoDeVentaId}/productos")
@RequiredArgsConstructor
public class ProductoController {

    private final ProductoService service;

    @GetMapping
    public ResponseEntity<List<Producto>> listar(@PathVariable Long puntoDeVentaId) {
        return ResponseEntity.ok(service.listarPorPuntoDeVenta(puntoDeVentaId));
    }
}
