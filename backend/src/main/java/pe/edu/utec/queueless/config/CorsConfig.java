package pe.edu.utec.queueless.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Configuración CORS expuesta como bean para que Spring Security la tome dentro
 * de su cadena de filtros. Así el preflight se resuelve antes de las reglas de
 * autorización por rol y un navegador puede llamar a la API desde los frontends.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuracion = new CorsConfiguration();
        // Usamos patrones para que el frontend desplegado en Vercel pueda llamar a la API: el
        // dominio de produccion y los previews viven bajo *.vercel.app. En dev seguimos con
        // localhost. El navegador manda el Origin tambien cuando el front pega via un proxy, asi
        // que sin el dominio real de Vercel el backend respondia 403 "Invalid CORS request".
        configuracion.setAllowedOriginPatterns(List.of(
            "http://localhost:3000",   // web dev
            "http://localhost:5173",   // Vite dev
            "http://localhost:8081",   // Expo
            "http://localhost:19006",  // Expo web
            "https://*.vercel.app"     // frontend en Vercel (produccion y previews)
        ));
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuracion.setAllowedHeaders(List.of("*"));
        configuracion.setAllowCredentials(true);
        configuracion.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuracion);
        return source;
    }
}
