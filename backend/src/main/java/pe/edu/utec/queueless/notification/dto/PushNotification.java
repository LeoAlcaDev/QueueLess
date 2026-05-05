package pe.edu.utec.queueless.notification.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.Map;

@Getter
@Builder
@AllArgsConstructor
public class PushNotification {
    private final String topic;          // ej. "user-{id}"
    private final String titulo;
    private final String cuerpo;
    private final Map<String, String> data;
}
