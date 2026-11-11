package br.com.lembrei.lembrei_api.repository;

import br.com.lembrei.lembrei_api.dto.EstoqueDTO.EstoqueResponseDTO;
import br.com.lembrei.lembrei_api.dto.EstoqueDTO.MovimentoResponseDTO;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class EstoqueRepository {
    private final JdbcTemplate jdbc;

    private static LocalDateTime instante(ResultSet rs, String coluna) throws SQLException {
        Timestamp valor = rs.getTimestamp(coluna);
        return valor == null ? null : valor.toLocalDateTime();
    }

    public void repor(long usuario, long item, int quantidade) {
        jdbc.execute((Connection con) -> {
            try (CallableStatement cs = con.prepareCall("{call pkg_lembrei_operacao.prc_repor_estoque(?, ?, ?)}")) {
                cs.setLong(1, usuario);
                cs.setLong(2, item);
                cs.setInt(3, quantidade);
                cs.execute();
                return null;
            }
        });
    }

    private static final String ESTOQUES = """
            SELECT i.id_item, i.nome, i.estoque_atual,
                   pkg_lembrei_calculo.fun_consumo_semanal(i.id_usuario, i.id_item) AS consumo,
                   pkg_lembrei_calculo.fun_previsao_termino(i.id_usuario, i.id_item) AS termino,
                   pkg_lembrei_calculo.fun_precisa_reposicao(i.id_usuario, i.id_item) AS repor
            FROM item_lembrei i WHERE i.id_usuario = ? AND i.tipo = 'REMEDIO'
            """;
    private static final RowMapper<EstoqueResponseDTO> ESTOQUE = (rs, row) -> new EstoqueResponseDTO(
            rs.getLong("id_item"), rs.getString("nome"), rs.getInt("estoque_atual"), rs.getInt("consumo"),
            instante(rs, "termino"), "S".equals(rs.getString("repor")));

    public EstoqueResponseDTO estoque(long usuario, long item) {
        return jdbc.queryForObject(ESTOQUES + " AND i.id_item = ?", ESTOQUE, usuario, item);
    }

    public List<EstoqueResponseDTO> alertas(long usuario, int offset, int limite) {
        return jdbc.query(ESTOQUES + """
                 AND i.ativo = 'S'
                 AND pkg_lembrei_calculo.fun_precisa_reposicao(i.id_usuario, i.id_item) = 'S'
                 ORDER BY i.id_item OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """, ESTOQUE, usuario, offset, limite);
    }

    public List<MovimentoResponseDTO> movimentos(long usuario, long item, int offset, int limite) {
        return jdbc.query("""
                SELECT m.* FROM movimento_estoque_lembrei m JOIN item_lembrei i ON i.id_item = m.id_item
                WHERE i.id_usuario = ? AND i.id_item = ?
                ORDER BY m.dt_movimento DESC, m.id_movimento DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """, (rs, row) -> new MovimentoResponseDTO(rs.getLong("id_movimento"), rs.getLong("id_item"),
                rs.getObject("id_registro", Long.class), rs.getString("tipo"), rs.getInt("quantidade"),
                instante(rs, "dt_movimento")), usuario, item, offset, limite);
    }

}
