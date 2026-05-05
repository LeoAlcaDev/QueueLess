package pe.edu.utec.queueless.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI queuelessOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("QueueLess API")
                .description("API REST de QueueLess — proyecto CS2031 DBP 2026-1")
                .version("v0.0.1")
                .contact(new Contact().name("Equipo QueueLess")))
            .addSecurityItem(new SecurityRequirement().addList(BEARER))
            .components(new Components().addSecuritySchemes(BEARER,
                new SecurityScheme()
                    .name(BEARER)
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")));
    }
}
