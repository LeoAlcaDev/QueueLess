package pe.edu.utec.queueless.pago.gateway;

import com.mercadopago.MercadoPagoConfig;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.payment.PaymentRefundClient;
import com.mercadopago.client.preference.PreferenceClient;
import com.mercadopago.client.preference.PreferenceItemRequest;
import com.mercadopago.client.preference.PreferenceRequest;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.pago.entity.Pago;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;

import java.util.List;

/**
 * Pasarela MercadoPago (sandbox o prod según el access token configurado).
 *
 * <p>Flujo soportado:
 * <ul>
 *   <li>{@link #iniciarCobro}: crea una Preference con un único item por el
 *       monto total. El {@code externalReference} apunta a {@code pago.id}
 *       para que el webhook pueda resolver el pago local.</li>
 *   <li>{@link #consultarPago}: busca un Payment por id (uso desde el webhook
 *       para obtener el {@code externalReference} y el estado real).</li>
 *   <li>{@link #reembolsar}: emite un refund total contra el payment id
 *       almacenado en {@code referenciaExterna} tras la confirmación.</li>
 * </ul>
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "queueless.pago.gateway", havingValue = "mercadopago")
public class MercadoPagoGateway implements PaymentGateway {

    private final String accessToken;
    private final PreferenceClient preferenceClient = new PreferenceClient();
    private final PaymentClient paymentClient = new PaymentClient();
    private final PaymentRefundClient refundClient = new PaymentRefundClient();

    public MercadoPagoGateway(@Value("${queueless.pago.mercadopago.access-token:}") String accessToken) {
        this.accessToken = accessToken;
    }

    @PostConstruct
    void init() {
        if (accessToken == null || accessToken.isBlank()) {
            throw new IllegalStateException(
                "queueless.pago.mercadopago.access-token vacío. " +
                "Configurá MERCADOPAGO_ACCESS_TOKEN para activar el gateway de MercadoPago.");
        }
        MercadoPagoConfig.setAccessToken(accessToken);
        log.info("MercadoPago gateway inicializado");
    }

    @Override
    public IniciarCobroResult iniciarCobro(Pago pago) {
        PreferenceItemRequest item = PreferenceItemRequest.builder()
            .title("Pedido QueueLess #" + pago.getPedido().getCodigo())
            .quantity(1)
            .unitPrice(pago.getMonto())
            .currencyId("PEN")
            .build();

        PreferenceRequest request = PreferenceRequest.builder()
            .items(List.of(item))
            .externalReference(String.valueOf(pago.getId()))
            .build();

        try {
            Preference preference = preferenceClient.create(request);
            log.info("MP preference creada {} para pago {}", preference.getId(), pago.getId());
            return new IniciarCobroResult(preference.getId(), preference.getInitPoint());
        } catch (MPApiException | MPException ex) {
            log.error("Error creando preferencia MP para pago {}", pago.getId(), ex);
            throw new BusinessRuleException("No se pudo iniciar el cobro con MercadoPago");
        }
    }

    /**
     * Consulta un payment por id. Usado desde el webhook para mapear el
     * payment id recibido al pago local vía {@code externalReference}.
     */
    public Payment consultarPago(String paymentId) {
        try {
            return paymentClient.get(Long.valueOf(paymentId));
        } catch (NumberFormatException | MPApiException | MPException ex) {
            log.error("No se pudo consultar el payment {} en MercadoPago", paymentId, ex);
            throw new BusinessRuleException("No se pudo consultar el pago en MercadoPago");
        }
    }

    @Override
    public String getMetodoPago() {
        return "MERCADOPAGO";
    }

    /**
     * Emite un reembolso total contra MercadoPago.
     *
     * <p><b>Precondición:</b> {@code pago.getReferenciaExterna()} debe contener el
     * <em>payment_id</em> real (no el preference_id inicial). Esto se garantiza
     * llamando a este únicamente sobre pagos en estado CONFIRMADO, ya que la
     * confirmación vía webhook reemplaza la referencia externa con el payment_id.
     * Ver {@link pe.edu.utec.queueless.pago.entity.Pago#getReferenciaExterna()}.
     */
    @Override
    public void reembolsar(Pago pago) {
        String paymentId = pago.getReferenciaExterna();
        if (paymentId == null || paymentId.isBlank()) {
            throw new BusinessRuleException(
                "El pago " + pago.getId() + " no tiene referencia externa para reembolsar");
        }
        try {
            refundClient.refund(Long.valueOf(paymentId));
            log.info("MP reembolso total emitido para payment {} (pago {})", paymentId, pago.getId());
        } catch (NumberFormatException | MPApiException | MPException ex) {
            log.error("Error emitiendo reembolso MP para pago {}", pago.getId(), ex);
            throw new BusinessRuleException("No se pudo emitir el reembolso en MercadoPago");
        }
    }
}
