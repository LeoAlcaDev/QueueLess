package pe.edu.utec.queueless.notification.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.event.UsuarioRegistradoEvent;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

/**
 * Manda el correo de bienvenida después de un alta exitosa. Corre fuera de la
 * transacción del registro (AFTER_COMMIT por default + @Async): si SMTP falla,
 * la cuenta del usuario igual queda creada. Ver ADR-0021.
 *
 * <p>Cualquier excepción se atrapa y queda en WARN para no propagarse al
 * executor async (mantiene la observabilidad localizada y respeta best-effort).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UsuarioRegistradoEmailListener {

    private final EmailService emailService;
    private final UsuarioService usuarioService;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    public void onUsuarioRegistrado(UsuarioRegistradoEvent event) {
        try {
            Usuario usuario = usuarioService.findById(event.getUsuarioId());
            emailService.sendBienvenida(usuario);
        } catch (Exception ex) {
            log.warn("No se pudo enviar la bienvenida al usuario {}: {}",
                event.getUsuarioId(), ex.getMessage());
        }
    }
}
