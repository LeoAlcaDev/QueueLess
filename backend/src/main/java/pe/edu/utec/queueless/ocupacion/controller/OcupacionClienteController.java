package pe.edu.utec.queueless.ocupacion.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.ocupacion.dto.OcupacionResponse;
import pe.edu.utec.queueless.ocupacion.service.OcupacionService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;

@Tag(name = "Ocupación (cliente)", description = "Curva de afluencia por hora de un local, para elegir cuándo pedir")
@RestController
@RequestMapping("/api/v1/cliente/ocupacion")
@PreAuthorize("hasRole('CLIENTE')")
@RequiredArgsConstructor
public class OcupacionClienteController {

    private final OcupacionService ocupacionService;

    @GetMapping("/{puntoVentaId}")
    public ResponseEntity<ApiResponse<OcupacionResponse>> curva(@PathVariable Long puntoVentaId) {
        return ResponseEntity.ok(ApiResponse.ok(ocupacionService.curvaParaCliente(puntoVentaId)));
    }
}
