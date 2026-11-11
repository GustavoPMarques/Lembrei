package br.com.lembrei.lembrei_api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "lembrei.oracle-check-enabled=false",
        "spring.datasource.url=jdbc:oracle:thin:@localhost:1521:ORCL",
        "spring.datasource.username=teste",
        "spring.datasource.password=teste"
})
class LembreiApiApplicationTests {
    @LocalServerPort int porta;

    @Test
    void openApiDisponivelComRotasEIdentificacaoDocumentadas() throws Exception {
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(
                URI.create("http://localhost:" + porta + "/v3/api-docs")).GET().build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("/api/v1/usuarios/identificar"));
        assertTrue(response.body().contains("/api/v1/itens/{id}/reposicoes"));
        assertTrue(response.body().contains("X-Dispositivo-Id"));
    }

    @Test
    void camposDesconhecidosSaoRejeitadosPeloJacksonConfigurado() throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + porta + "/api/v1/usuarios/identificar"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("""
                        {"uuidDispositivo":"123e4567-e89b-42d3-a456-426614174000","nome":"Maria","senha":"nao existe"}
                        """)).build();
        var response = HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(400, response.statusCode());
    }

	@Test
	void contextLoads() {
	}

}
