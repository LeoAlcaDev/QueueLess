package pe.edu.utec.queueless.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Activa @Async y define el TaskExecutor que ejecuta los métodos asíncronos.
 *
 * <p>Política de threads:
 * <ul>
 *   <li>core: 4  — siempre disponibles para tareas inmediatas</li>
 *   <li>max:  16 — picos de demanda en hora de almuerzo</li>
 *   <li>queue: 100 — buffer antes de levantar más threads</li>
 * </ul>
 */
@Configuration
@EnableAsync
public class AsyncConfig {

    @Bean(name = "queuelessTaskExecutor")
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("queueless-async-");
        executor.initialize();
        return executor;
    }
}
