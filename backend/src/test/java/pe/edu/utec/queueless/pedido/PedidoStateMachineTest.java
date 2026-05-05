package pe.edu.utec.queueless.pedido;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Verifica las reglas de la máquina de estados del Pedido.
 * Patrón AAA (Arrange — Act — Assert), Sem. 4.
 */
class PedidoStateMachineTest {

    @Test
    @DisplayName("Transición legal PENDIENTE_PAGO → PAGADO_ESPERANDO_COMERCIO funciona")
    void transicionLegalFunciona() {
        // Arrange
        Pedido pedido = Pedido.builder().estado(EstadoPedido.PENDIENTE_PAGO).build();

        // Act
        pedido.transicionarA(EstadoPedido.PAGADO_ESPERANDO_COMERCIO);

        // Assert
        assertThat(pedido.getEstado()).isEqualTo(EstadoPedido.PAGADO_ESPERANDO_COMERCIO);
        assertThat(pedido.getPagadoAt()).isNotNull();
    }

    @Test
    @DisplayName("Transición ilegal PENDIENTE_PAGO → ENTREGADO lanza BusinessRuleException")
    void transicionIlegalLanzaExcepcion() {
        Pedido pedido = Pedido.builder().estado(EstadoPedido.PENDIENTE_PAGO).build();

        assertThatThrownBy(() -> pedido.transicionarA(EstadoPedido.ENTREGADO))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("Transición inválida");
    }

    @Test
    @DisplayName("Estado terminal ENTREGADO no permite ninguna transición saliente")
    void terminalNoAceptaTransiciones() {
        Pedido pedido = Pedido.builder().estado(EstadoPedido.ENTREGADO).build();

        for (EstadoPedido destino : EstadoPedido.values()) {
            assertThatThrownBy(() -> pedido.transicionarA(destino))
                .isInstanceOf(BusinessRuleException.class);
        }
    }

    @Test
    @DisplayName("CANCELADO_POR_CLIENTE solo es alcanzable desde estados cancelables por cliente")
    void cancelacionPorClienteRespetaReglas() {
        for (EstadoPedido origen : EstadoPedido.values()) {
            Pedido pedido = Pedido.builder().estado(origen).build();
            boolean esperado = EstadoPedido.CANCELABLES_POR_CLIENTE.contains(origen);

            try {
                pedido.transicionarA(EstadoPedido.CANCELADO_POR_CLIENTE);
                assertThat(esperado).isTrue();
            } catch (BusinessRuleException ex) {
                assertThat(esperado).isFalse();
            }
        }
    }

    @Test
    @DisplayName("Transicionar a un estado terminal marca canceladoAt o entregadoAt")
    void timestampsSeMarcanCorrectamente() {
        Pedido pedido = Pedido.builder().estado(EstadoPedido.LISTO_PARA_RECOGER).build();

        pedido.transicionarA(EstadoPedido.ENTREGADO);

        assertThat(pedido.getEntregadoAt()).isNotNull();
        assertThat(pedido.getCanceladoAt()).isNull();
    }
}
