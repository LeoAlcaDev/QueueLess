package pe.edu.utec.queueless.sse;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

/**
 * Abre el stream SSE del cliente, por donde recibe en vivo los cambios de estado
 * de sus propios pedidos. La identidad sale del usuario autenticado, nunca de un
 * parámetro de la URL: así nadie puede engancharse al stream de otro. Ver ADR-0024.
 */
@Tag(name = "Tiempo real (cliente)", description = "Stream de cambios de estado de los pedidos del cliente")
@RestController
@RequestMapping("/api/v1/cliente/pedidos")
@PreAuthorize("hasRole('CLIENTE')")
@RequiredArgsConstructor
public class ClientePedidoStreamController {

    private final RegistroSse registro;
    private final UsuarioService usuarioService;

    @GetMapping("/stream")
    public SseEmitter stream(Authentication authentication) {
        Usuario cliente = usuarioService.findByEmail(authentication.getName());
        SseEmitter emitter = new SseEmitter(RegistroSse.TIMEOUT_MS);
        registro.registrarCliente(cliente.getId(), emitter);
        return emitter;
    }
}
