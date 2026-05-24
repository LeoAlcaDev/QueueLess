package pe.edu.utec.queueless.pedido.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pedido.dto.PedidoResponse;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;

/**
 * Ayudas solo para el perfil dev. Existe para probar el flujo del comercio por
 * Swagger antes de que el módulo de pagos (Fase 4) haga la transición real.
 * No se carga en los perfiles test ni prod.
 */
@Tag(name = "Dev (solo perfil dev)", description = "Atajos para probar flujos sin el módulo de pagos")
@Profile("dev")
@RestController
@RequestMapping("/api/dev/pedidos")
@RequiredArgsConstructor
public class DevPedidoController {

    private final PedidoService pedidoService;

    @PostMapping("/{id}/simular-pago")
    public ResponseEntity<ApiResponse<PedidoResponse>> simularPago(@PathVariable Long id) {
        PedidoResponse pagado = pedidoService.simularPagoConfirmado(id);
        return ResponseEntity.ok(ApiResponse.ok(pagado, "Pago simulado"));
    }
}
