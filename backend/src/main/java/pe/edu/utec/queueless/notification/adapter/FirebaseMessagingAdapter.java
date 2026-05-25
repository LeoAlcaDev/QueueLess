package pe.edu.utec.queueless.notification.adapter;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.notification.dto.PushNotification;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Base64;

/**
 * Cliente de Firebase Cloud Messaging. Solo se carga cuando las notificaciones push
 * están activadas (queueless.firebase.enabled=true), es decir en producción.
 *
 * <p>Al arrancar inicializa Firebase con las credenciales del service account, que
 * llegan en base64 por la variable de entorno FIREBASE_CREDENTIALS_JSON. Si faltan o
 * no se pueden leer, corta el arranque con un mensaje que dice qué revisar: preferimos
 * que el backend no levante a que ande sin avisar que las notificaciones no salen.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "queueless.firebase.enabled", havingValue = "true")
public class FirebaseMessagingAdapter {

    private final String credencialesBase64;

    public FirebaseMessagingAdapter(
            @Value("${queueless.firebase.credentials-base64:}") String credencialesBase64) {
        this.credencialesBase64 = credencialesBase64;
    }

    @PostConstruct
    void inicializarFirebase() {
        if (credencialesBase64 == null || credencialesBase64.isBlank()) {
            throw new IllegalStateException(
                "FIREBASE_CREDENTIALS_JSON vacío con las notificaciones activadas. "
                + "Configurá esa variable con el JSON del service account de Firebase "
                + "codificado en base64.");
        }
        try {
            byte[] json = Base64.getDecoder().decode(credencialesBase64);
            GoogleCredentials credenciales = GoogleCredentials.fromStream(new ByteArrayInputStream(json));
            FirebaseOptions opciones = FirebaseOptions.builder()
                .setCredentials(credenciales)
                .build();
            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(opciones);
            }
            log.info("Firebase inicializado para el envío de notificaciones push");
        } catch (IllegalArgumentException | IOException ex) {
            throw new IllegalStateException(
                "No se pudieron leer las credenciales de Firebase. Revisá que "
                + "FIREBASE_CREDENTIALS_JSON tenga el JSON del service account en base64.", ex);
        }
    }

    /**
     * Envía la notificación al topic indicado. El envío es best-effort: si Firebase
     * falla, lo registra y termina sin propagar, para no romper el flujo del pedido.
     */
    public void send(PushNotification notification) {
        Notification contenido = Notification.builder()
            .setTitle(notification.getTitulo())
            .setBody(notification.getCuerpo())
            .build();
        Message.Builder mensaje = Message.builder()
            .setTopic(notification.getTopic())
            .setNotification(contenido);
        if (notification.getData() != null) {
            mensaje.putAllData(notification.getData());
        }
        try {
            FirebaseMessaging.getInstance().send(mensaje.build());
        } catch (FirebaseMessagingException ex) {
            log.warn("No se pudo enviar la notificación push a {}: {}",
                notification.getTopic(), ex.getMessage());
        }
    }
}
