package pe.edu.utec.queueless.reclamo.listener;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;
import pe.edu.utec.queueless.notification.email.EmailService;
import pe.edu.utec.queueless.reclamo.entity.DestinatarioReclamo;
import pe.edu.utec.queueless.reclamo.entity.Reclamo;
import pe.edu.utec.queueless.reclamo.event.ReclamoRegistradoEvent;
import pe.edu.utec.queueless.reclamo.event.ReclamoRespondidoEvent;
import pe.edu.utec.queueless.reclamo.service.ReclamoService;

/**
 * Manda los correos del libro de reclamaciones fuera de la transacción del negocio
 * (AFTER_COMMIT + @Async): si el SMTP falla, el reclamo igual quedó registrado y el acuse
 * ya viajó en la respuesta HTTP. Acá vive el enrutamiento: un reclamo contra un comercio se
 * notifica al correo del gestor, uno contra la plataforma al correo de operadores. Ver ADR-0029.
 *
 * <p>{@code @Transactional(REQUIRES_NEW, readOnly)} abre una sesión propia para navegar las
 * asociaciones lazy del reclamo (quién reclama, el local y su gestor) sin
 * {@code LazyInitializationException}, igual que el recibo del pedido entregado (ADR-0021).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ReclamoEmailListener {

    private final EmailService emailService;
    private final ReclamoService reclamoService;

    @Value("${queueless.reclamo.operadores-email}")
    private String operadoresEmail;

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onReclamoRegistrado(ReclamoRegistradoEvent event) {
        try {
            Reclamo reclamo = reclamoService.findById(event.getReclamoId());
            emailService.sendAcuseReclamo(reclamo);

            String destino = (reclamo.getContra() == DestinatarioReclamo.COMERCIO)
                ? reclamo.getPuntoDeVenta().getGestor().getEmail()
                : operadoresEmail;
            emailService.sendNotificacionReclamo(destino, reclamo);
        } catch (Exception ex) {
            log.warn("No se pudo notificar el reclamo {}: {}", event.getReclamoId(), ex.getMessage());
        }
    }

    @Async("queuelessTaskExecutor")
    @TransactionalEventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public void onReclamoRespondido(ReclamoRespondidoEvent event) {
        try {
            Reclamo reclamo = reclamoService.findById(event.getReclamoId());
            emailService.sendRespuestaReclamo(reclamo);
        } catch (Exception ex) {
            log.warn("No se pudo enviar la respuesta del reclamo {}: {}", event.getReclamoId(), ex.getMessage());
        }
    }
}
