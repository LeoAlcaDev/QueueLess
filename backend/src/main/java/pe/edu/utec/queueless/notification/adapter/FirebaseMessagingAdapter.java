package pe.edu.utec.queueless.notification.adapter;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.notification.dto.PushNotification;

/**
 * Cliente de Firebase Cloud Messaging.
 *
 * <p>TODO Semana 2: inicializar FirebaseApp con credenciales desde
 * {@code FIREBASE_CREDENTIALS_JSON} (base64) e implementar send().
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "queueless.firebase.enabled", havingValue = "true")
public class FirebaseMessagingAdapter {

    public void send(PushNotification notification) {
        // TODO: usar FirebaseMessaging.getInstance().send(...)
        log.info("[FCM] Enviando push '{}' a {}", notification.getTitulo(), notification.getTopic());
    }
}
