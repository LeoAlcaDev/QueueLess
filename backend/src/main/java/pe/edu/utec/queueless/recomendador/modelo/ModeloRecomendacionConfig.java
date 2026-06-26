package pe.edu.utec.queueless.recomendador.modelo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Red de seguridad de configuración, calcada de la pasarela de pagos (ADR-0013): si la
 * propiedad queueless.recomendador.proveedor trae un valor que no calza con ninguna
 * implementación, no se carga ninguna; este bean se crea en su lugar y aborta el arranque con
 * un mensaje accionable, en vez del críptico "no bean of type ModeloRecomendacion".
 */
@Configuration
public class ModeloRecomendacionConfig {

    @Bean
    @ConditionalOnMissingBean(ModeloRecomendacion.class)
    ModeloRecomendacion modeloNoDisponible(@Value("${queueless.recomendador.proveedor:}") String valorConfigurado) {
        throw new IllegalStateException(
            "Proveedor de recomendación desconocido: '" + valorConfigurado + "'. " +
            "Valores válidos: gemini, fake. Revisá la variable RECOMENDADOR_PROVEEDOR.");
    }
}
