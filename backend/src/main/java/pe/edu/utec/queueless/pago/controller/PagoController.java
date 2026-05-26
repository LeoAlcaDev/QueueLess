package pe.edu.utec.queueless.pago.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pago.dto.IniciarPagoRequest;
import pe.edu.utec.queueless.pago.dto.IniciarPagoResponse;
import pe.edu.utec.queueless.pago.dto.PagoResponse;
import pe.edu.utec.queueless.pago.entity.Pago;
import pe.edu.utec.queueless.pago.service.PagoService;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

@Tag(name = "Pagos (cliente)", description = "Iniciar y consultar pagos propios")
@RestController
@RequestMapping("/api/v1/cliente/pagos")
@RequiredArgsConstructor
public class PagoController {

    private final PagoService pagoService;
    private final UsuarioService usuarioService;

    @PostMapping("/iniciar")
    public ResponseEntity<ApiResponse<IniciarPagoResponse>> iniciar(
            Authentication authentication,
            @Valid @RequestBody IniciarPagoRequest request) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        IniciarPagoResponse response = pagoService.iniciar(request.getPedidoId(), cliente.getId());
        return ResponseEntity.ok(ApiResponse.ok(response, "Pago iniciado"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PagoResponse>> consultar(
            Authentication authentication,
            @PathVariable Long id) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        Pago pago = pagoService.findById(id);
        if (!pago.getPedido().getCliente().getId().equals(cliente.getId())) {
            throw new ResourceNotFoundException("Pago", id);
        }
        return ResponseEntity.ok(ApiResponse.ok(PagoResponse.from(pago)));
    }
}
