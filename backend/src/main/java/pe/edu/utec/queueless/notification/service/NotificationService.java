package pe.edu.utec.queueless.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import pe.edu.utec.queueless.notification.adapter.FirebaseMessagingAdapter;
import pe.edu.utec.queueless.notification.dto.PushNotification;

/**
 * Fachada para envío de notificaciones push. Resuelve el adapter de FCM como
 * opcional (en dev/test el bean no existe y notificamos con un log).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final ObjectProvider<FirebaseMessagingAdapter> firebaseProvider;

    public void notificar(PushNotification notification) {
        FirebaseMessagingAdapter fcm = firebaseProvider.getIfAvailable();
        if (fcm == null) {
            log.info("[NOTIF DEV] {} -> {} ({})",
                notification.getTopic(), notification.getTitulo(), notification.getCuerpo());
            return;
        }
        fcm.send(notification);
    }
}
