package br.com.lembrei.lembrei_api.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class ApiConfig {
    @Bean
    Clock clock() { return Clock.system(ZoneId.of("America/Sao_Paulo")); }

    @Bean
    OpenAPI openAPI() {
        return new OpenAPI().info(new Info().title("Lembrei! API").version("v1")
                .description("API sem login. Identifique o aparelho e informe seu UUID em X-Dispositivo-Id. "
                        + "Datas e horarios locais de America/Sao_Paulo. O UUID identifica a instalacao; nao e autenticacao de identidade."))
                .components(new Components().addSecuritySchemes("dispositivo", new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-Dispositivo-Id")))
                .addSecurityItem(new SecurityRequirement().addList("dispositivo"));
    }

    @Bean
    WebMvcConfigurer cors(@Value("${lembrei.cors-origins}") String origins) {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**").allowedOrigins(origins.split(","))
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "OPTIONS")
                        .allowedHeaders("Content-Type", "X-Dispositivo-Id");
            }
        };
    }
}
