package br.com.lembrei.lembrei_api.repository;

import br.com.lembrei.lembrei_api.dto.UsuarioDTO.UsuarioResponseDTO;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class UsuarioRepository {
    private final JdbcTemplate jdbc;

    private static LocalDateTime instante(ResultSet rs, String coluna) throws SQLException {
        Timestamp valor = rs.getTimestamp(coluna);
        return valor == null ? null : valor.toLocalDateTime();
    }

    private static final RowMapper<UsuarioResponseDTO> USUARIO = (rs, row) -> new UsuarioResponseDTO(
            rs.getLong("id_usuario"), UUID.fromString(rs.getString("uuid_dispositivo")),
            rs.getString("nome"), instante(rs, "dt_criacao"));

    public Optional<UsuarioResponseDTO> usuario(UUID uuid) {
        return jdbc.query("SELECT * FROM usuario_lembrei WHERE uuid_dispositivo = ?", USUARIO, uuid.toString())
                .stream().findFirst();
    }

    public void criarUsuario(UUID uuid, String nome) {
        jdbc.update("INSERT INTO usuario_lembrei (uuid_dispositivo, nome) VALUES (?, ?)", uuid.toString(), nome);
    }

    public void bloquearUsuario(long usuario) {
        jdbc.queryForObject("SELECT id_usuario FROM usuario_lembrei WHERE id_usuario = ? FOR UPDATE", Long.class, usuario);
    }

    public void renomearUsuario(long usuario, String nome) {
        jdbc.update("UPDATE usuario_lembrei SET nome = ? WHERE id_usuario = ?", nome, usuario);
    }

}
