package pe.edu.utec.queueless.notification.email;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import pe.edu.utec.queueless.pedido.entity.ItemPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * Verifica los tres escenarios contemplados en ADR-0021:
 *  1) envío correcto (con escape de HTML y construcción de MIME),
 *  2) servicio deshabilitado cuando no hay {@link JavaMailSender} en el contexto,
 *  3) falla transitoria del proveedor SMTP que no debe propagarse.
 */
@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    private static final String FROM = "no-reply@queueless.local";
    private static final String FROM_NAME = "QueueLess";

    @Mock private ObjectProvider<JavaMailSender> mailSenderProvider;
    @Mock private JavaMailSender mailSender;

    private EmailService emailService;

    @BeforeEach
    void setUp() {
        emailService = new EmailService(mailSenderProvider, FROM, FROM_NAME);
    }

    @Test
    @DisplayName("envía la bienvenida con HTML y escapa el nombre del usuario")
    void enviaBienvenidaConEscapadoXss() throws Exception {
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        when(mailSender.createMimeMessage()).thenReturn(nuevoMimeMessage());

        emailService.sendBienvenida(usuario("Ana <script>alert(1)</script>"));

        MimeMessage enviado = capturarEnviado();
        assertThat(enviado.getAllRecipients()[0].toString()).isEqualTo("ana@ejemplo.com");
        assertThat(enviado.getSubject()).isEqualTo("¡Bienvenido a QueueLess!");
        String html = (String) enviado.getContent();
        assertThat(html).contains("Ana &lt;script&gt;alert(1)&lt;/script&gt;");
        assertThat(html).doesNotContain("<script>alert(1)</script>");
    }

    @Test
    @DisplayName("envía el recibo con items, total y código del pedido")
    void enviaReciboConDetalleDelPedido() throws Exception {
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        when(mailSender.createMimeMessage()).thenReturn(nuevoMimeMessage());

        emailService.sendRecibo(pedidoEntregado());

        MimeMessage enviado = capturarEnviado();
        assertThat(enviado.getAllRecipients()[0].toString()).isEqualTo("ana@ejemplo.com");
        assertThat(enviado.getSubject()).isEqualTo("Recibo de tu pedido QL-260526-ABCDE");
        String html = (String) enviado.getContent();
        assertThat(html).contains("QL-260526-ABCDE");
        assertThat(html).contains("Ceviche");
        assertThat(html).contains("Chicha morada");
        assertThat(html).contains("S/ 55.00"); // total = 35 + 2*10
    }

    @Test
    @DisplayName("queda deshabilitado y no toca al sender si no hay bean configurado")
    void deshabilitadoCuandoNoHaySender() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(null);

        emailService.sendBienvenida(usuario("Ana"));

        verifyNoInteractions(mailSender);
        verify(mailSenderProvider).getIfAvailable();
    }

    @Test
    @DisplayName("una falla transitoria del SMTP no rompe el flujo de quien dispara el evento")
    void noPropagaErrorDeSmtp() {
        when(mailSenderProvider.getIfAvailable()).thenReturn(mailSender);
        when(mailSender.createMimeMessage()).thenReturn(nuevoMimeMessage());
        doThrow(new MailSendException("smtp caido"))
            .when(mailSender).send(any(MimeMessage.class));

        assertThatNoException().isThrownBy(() ->
            emailService.sendBienvenida(usuario("Ana")));

        verify(mailSender).send(any(MimeMessage.class));
    }

    private MimeMessage capturarEnviado() {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        return captor.getValue();
    }

    private static MimeMessage nuevoMimeMessage() {
        Properties props = new Properties();
        Session session = Session.getInstance(props);
        return new MimeMessage(session);
    }

    private static Usuario usuario(String nombre) {
        return Usuario.builder()
            .email("ana@ejemplo.com")
            .nombreCompleto(nombre)
            .passwordHash("hash")
            .build();
    }

    private static Pedido pedidoEntregado() {
        Usuario cliente = usuario("Ana");
        Pedido pedido = Pedido.builder()
            .codigo("QL-260526-ABCDE")
            .cliente(cliente)
            .entregadoAt(Instant.parse("2026-05-26T17:30:00Z"))
            .subtotal(new BigDecimal("55.00"))
            .descuentoQpts(BigDecimal.ZERO)
            .total(new BigDecimal("55.00"))
            .build();
        pedido.setItems(List.of(
            item(pedido, "Ceviche", 1, new BigDecimal("35.00"), new BigDecimal("35.00")),
            item(pedido, "Chicha morada", 2, new BigDecimal("10.00"), new BigDecimal("20.00"))));
        return pedido;
    }

    private static ItemPedido item(Pedido pedido, String nombre, int cantidad,
                                   BigDecimal precioUnitario, BigDecimal subtotal) {
        Producto producto = Producto.builder().nombre(nombre).precio(precioUnitario).build();
        return ItemPedido.builder()
            .pedido(pedido)
            .producto(producto)
            .cantidad(cantidad)
            .precioUnitario(precioUnitario)
            .subtotal(subtotal)
            .build();
    }
}
