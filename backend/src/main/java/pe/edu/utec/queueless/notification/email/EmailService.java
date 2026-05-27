package pe.edu.utec.queueless.notification.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import pe.edu.utec.queueless.pedido.entity.ItemPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.shared.util.TiempoLima;

import java.io.UnsupportedEncodingException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Envío de correos transaccionales (bienvenida y recibo de entrega). Complementa
 * — no reemplaza — al canal push de FCM. Ver ADR-0021.
 *
 * <p>Resuelve {@link JavaMailSender} con un {@link ObjectProvider} (mismo patrón
 * que {@link pe.edu.utec.queueless.notification.service.NotificationService}):
 * si no hay {@code spring.mail.host} configurado, Spring no crea el bean y el
 * servicio queda deshabilitado, dejando un aviso en el log con prefijo
 * {@code [EMAIL DEV]}. Una falla del proveedor SMTP loguea {@code WARN} pero no
 * rompe el flujo del registro ni de la entrega del pedido.
 */
@Slf4j
@Service
public class EmailService {

    private static final DateTimeFormatter FORMATO_FECHA_RECIBO =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String from;
    private final String fromName;

    public EmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                        @Value("${queueless.email.from}") String from,
                        @Value("${queueless.email.from-name}") String fromName) {
        this.mailSenderProvider = mailSenderProvider;
        this.from = from;
        this.fromName = fromName;
    }

    /** Correo de bienvenida tras el alta del usuario. */
    public void sendBienvenida(Usuario usuario) {
        String html = String.format(
            PlantillasCorreo.BIENVENIDA_HTML,
            HtmlUtils.htmlEscape(usuario.getNombreCompleto()));
        enviar(usuario.getEmail(), "¡Bienvenido a QueueLess!", html);
    }

    /** Recibo del pedido entregado con items, total y fecha de entrega. */
    public void sendRecibo(Pedido pedido) {
        String filas = construirFilasItems(pedido.getItems());
        String html = String.format(
            PlantillasCorreo.RECIBO_HTML,
            HtmlUtils.htmlEscape(pedido.getCliente().getNombreCompleto()),
            HtmlUtils.htmlEscape(pedido.getCodigo()),
            HtmlUtils.htmlEscape(formatearFecha(pedido.getEntregadoAt())),
            filas,
            formatearMonto(pedido.getTotal()));
        enviar(
            pedido.getCliente().getEmail(),
            "Recibo de tu pedido " + pedido.getCodigo(),
            html);
    }

    private void enviar(String destinatario, String asunto, String cuerpoHtml) {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (sender == null) {
            log.info("[EMAIL DEV] {} -> {}", destinatario, asunto);
            return;
        }
        try {
            MimeMessage mensaje = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                mensaje, false, StandardCharsets.UTF_8.name());
            helper.setFrom(from, fromName);
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(cuerpoHtml, true);
            sender.send(mensaje);
        } catch (MailException | MessagingException | UnsupportedEncodingException ex) {
            log.warn("No se pudo enviar el correo a {}: {}", destinatario, ex.getMessage());
        }
    }

    private String construirFilasItems(List<ItemPedido> items) {
        StringBuilder filas = new StringBuilder();
        for (ItemPedido item : items) {
            filas.append(String.format(
                PlantillasCorreo.FILA_ITEM_HTML,
                HtmlUtils.htmlEscape(item.getProducto().getNombre()),
                item.getCantidad(),
                formatearMonto(item.getSubtotal())));
        }
        return filas.toString();
    }

    private String formatearMonto(BigDecimal monto) {
        // Locale.ROOT garantiza punto decimal en el HTML del correo,
        // independiente del locale del servidor.
        return String.format(Locale.ROOT, "%.2f", monto);
    }

    private String formatearFecha(Instant instante) {
        if (instante == null) {
            return "";
        }
        return LocalDateTime.ofInstant(instante, TiempoLima.ZONA).format(FORMATO_FECHA_RECIBO);
    }
}
