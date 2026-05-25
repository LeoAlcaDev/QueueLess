package pe.edu.utec.queueless.waittime.strategy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Reglas de la estrategia manual: tiempo declarado más la cola actual. Sin Spring.
 */
class ManualDeclaredStrategyTest {

    private ManualDeclaredStrategy strategy;

    @BeforeEach
    void setUp() {
        strategy = new ManualDeclaredStrategy();
        ReflectionTestUtils.setField(strategy, "minutosPorPedidoEnCola", 3);
    }

    @Test
    @DisplayName("sin cola, el estimado es solo el tiempo declarado del local")
    void sinCola() {
        PuntoDeVenta local = PuntoDeVenta.builder().tiempoPromedioDeclarado(10).build();

        assertThat(strategy.estimarMinutos(local, 0)).isEqualTo(10);
    }

    @Test
    @DisplayName("con cola, suma cada pedido por el multiplicador configurado")
    void conCola() {
        PuntoDeVenta local = PuntoDeVenta.builder().tiempoPromedioDeclarado(10).build();

        // 10 declarado + 4 pedidos en cola * 3 minutos = 22
        assertThat(strategy.estimarMinutos(local, 4)).isEqualTo(22);
    }
}
