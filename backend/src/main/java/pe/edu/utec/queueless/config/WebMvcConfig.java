package pe.edu.utec.queueless.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Expone el directorio de uploads locales como recursos estaticos, para que el
 * frontend pueda mostrar las fotos de productos desde {@code /uploads/...}. En
 * produccion las imagenes viven en S3, asi que esto solo aplica en dev/test.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${queueless.storage.local-base-path:./uploads}")
    private String basePath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadsDir = Paths.get(basePath).toAbsolutePath().normalize();
        String location = uploadsDir.toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(location);
    }
}
