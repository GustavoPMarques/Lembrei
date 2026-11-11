package br.com.lembrei.lembrei_api.repository;

import br.com.lembrei.lembrei_api.dto.RotinaDTO.RegistroResponseDTO;
import br.com.lembrei.lembrei_api.model.TipoItem;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RotinaRepository {
    private final JdbcTemplate jdbc;

    private static LocalDateTime instante(ResultSet rs, String coluna) throws SQLException {
        Timestamp valor = rs.getTimestamp(coluna);
        return valor == null ? null : valor.toLocalDateTime();
    }

    public int gerarRotina(long usuario, LocalDate data) {
        return jdbc.execute((Connection con) -> {
            try (CallableStatement cs = con.prepareCall("{call pkg_lembrei_operacao.prc_gerar_rotina(?, ?, ?)}")) {
                cs.setLong(1, usuario);
                cs.setDate(2, java.sql.Date.valueOf(data));
                cs.registerOutParameter(3, Types.NUMERIC);
                cs.execute();
                return cs.getInt(3);
            }
        });
    }

    private static final String REGISTROS = """
            SELECT r.id_registro, i.id_item, h.id_horario, i.nome, i.tipo, i.dose,
                   i.qtd_por_dose, r.dt_prevista, r.dt_tomada, r.status
            FROM registro_dose_lembrei r
            JOIN horario_lembrei h ON h.id_horario = r.id_horario
            JOIN item_lembrei i ON i.id_item = h.id_item
            WHERE i.id_usuario = ?
            """;
    private static final RowMapper<RegistroResponseDTO> REGISTRO = (rs, row) -> new RegistroResponseDTO(
            rs.getLong("id_registro"), rs.getLong("id_item"), rs.getLong("id_horario"), rs.getString("nome"),
            TipoItem.valueOf(rs.getString("tipo")), rs.getString("dose"), rs.getInt("qtd_por_dose"),
            instante(rs, "dt_prevista"), instante(rs, "dt_tomada"), rs.getString("status"));

    public List<RegistroResponseDTO> rotina(long usuario, LocalDate data, int offset, int limite) {
        return jdbc.query(REGISTROS + """
                 AND r.dt_prevista >= ? AND r.dt_prevista < ?
                 ORDER BY r.dt_prevista, r.id_registro OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """, REGISTRO, usuario, Timestamp.valueOf(data.atStartOfDay()),
                Timestamp.valueOf(data.plusDays(1).atStartOfDay()), offset, limite);
    }

    public Optional<RegistroResponseDTO> registro(long usuario, long registro) {
        return jdbc.query(REGISTROS + " AND r.id_registro = ?", REGISTRO, usuario, registro).stream().findFirst();
    }

    public void confirmar(long usuario, long registro, LocalDateTime tomada) {
        jdbc.execute((Connection con) -> {
            String sql = tomada == null ? "{call pkg_lembrei_operacao.prc_confirmar_dose(?, ?)}"
                    : "{call pkg_lembrei_operacao.prc_confirmar_dose(?, ?, ?)}";
            try (CallableStatement cs = con.prepareCall(sql)) {
                cs.setLong(1, usuario);
                cs.setLong(2, registro);
                if (tomada != null) cs.setTimestamp(3, Timestamp.valueOf(tomada));
                cs.execute();
                return null;
            }
        });
    }

    public int esquecer(long usuario, long registro) {
        return jdbc.update("""
                UPDATE registro_dose_lembrei r SET status = 'ESQUECIDO'
                WHERE r.id_registro = ? AND r.status = 'PENDENTE' AND r.dt_prevista <= LOCALTIMESTAMP
                  AND EXISTS (SELECT 1 FROM horario_lembrei h JOIN item_lembrei i ON i.id_item = h.id_item
                              WHERE h.id_horario = r.id_horario AND i.id_usuario = ?)
                """, registro, usuario);
    }

}
