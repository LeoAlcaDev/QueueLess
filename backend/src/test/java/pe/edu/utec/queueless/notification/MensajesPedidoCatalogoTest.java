package pe.edu.utec.queueless.notification;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El catálogo debe tener un mensaje por cada estado que notifica y ninguno para los
 * que no notifican.
 */
class MensajesPedidoCatalogoTest {

    @Test
    @DisplayName("hay un mensaje para cada estado que notifica")
    void hayMensajePorEstadoNotificable() {
        for (EstadoPedido estado : EstadoPedido.values()) {
            if (estado == EstadoPedido.PENDIENTE_PAGO) {
                continue;
            }
            assertThat(MensajesPedidoCatalogo.para(estado))
                .as("el estado %s deberia tener mensaje", estado)
                .isNotNull();
        }
    }

    @Test
    @DisplayName("pendiente de pago no genera mensaje")
    void pendienteDePagoSinMensaje() {
        assertThat(MensajesPedidoCatalogo.para(EstadoPedido.PENDIENTE_PAGO)).isNull();
    }

    @Test
    @DisplayName("el mensaje de entregado invita a dejar una resena")
    void mensajeDeEntregado() {
        MensajePush mensaje = MensajesPedidoCatalogo.para(EstadoPedido.ENTREGADO);

        assertThat(mensaje.titulo()).isEqualTo("Entregado");
        assertThat(mensaje.cuerpo()).contains("reseña");
    }
}
