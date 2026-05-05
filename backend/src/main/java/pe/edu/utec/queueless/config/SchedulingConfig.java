package pe.edu.utec.queueless.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Activa el procesamiento de @Scheduled. Los jobs viven en
 * {@code pe.edu.utec.queueless.scheduling}.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
