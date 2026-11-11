package br.com.lembrei.lembrei_api.config;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "lembrei.oracle-check-enabled", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class OracleConnectionCheck implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(OracleConnectionCheck.class);
    private final JdbcTemplate jdbc;

    @Override
    public void run(String... args) {
        try {
            Integer resultado = jdbc.queryForObject("SELECT 1 FROM DUAL", Integer.class);
            if (Integer.valueOf(1).equals(resultado)) {
                log.info("Oracle conectado com sucesso!");
            } else {
                log.warn("Nao foi possivel confirmar a conexao com o Oracle.");
            }
        } catch (DataAccessException ex) {
            log.warn("Falha ao conectar ao Oracle. Verifique a conexao e as credenciais.");
        }
    }
}
