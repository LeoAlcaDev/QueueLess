package pe.edu.utec.queueless.waittime.ml;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Re-entrena el modelo periódicamente con los datos más recientes.
 * Cron configurable vía {@code queueless.waittime.retraining-cron}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ModelTrainer {

    private final BinRegressionModel model;

    @Scheduled(cron = "${queueless.waittime.retraining-cron}")
    public void reEntrenar() {
        log.debug("Re-entrenando modelo de tiempos de espera");
        model.entrenar();
    }
}
