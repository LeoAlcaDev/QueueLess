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
 * Abre el stream SSE del comercio, por donde recibe en vivo los cambios de estado
 * de los pedidos de sus locales. Las conexiones se agrupan por el id del
 * usuario-comercio (el gestor), que sale del usuario autenticado y no de un
 * parámetro, así el comercio solo ve lo de sus propios locales. Ver ADR-0024.
 */
@Tag(name = "Tiempo real (comercio)", description = "Stream de cambios de estado de los pedidos del comercio")
@RestController
@RequestMapping("/api/v1/comercio/pedidos")
@PreAuthorize("hasRole('COMERCIO')")
@RequiredArgsConstructor
public class ComercioPedidoStreamController {

    private final RegistroSse registro;
    private final UsuarioService usuarioService;

    @GetMapping("/stream")
    public SseEmitter stream(Authentication authentication) {
        Usuario comercio = usuarioService.findByEmail(authentication.getName());
        SseEmitter emitter = new SseEmitter(RegistroSse.TIMEOUT_MS);
        registro.registrarComercio(comercio.getId(), emitter);
        return emitter;
    }
}
