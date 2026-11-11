package br.com.lembrei.lembrei_api.repository;

import br.com.lembrei.lembrei_api.dto.RelatorioDTO.AdesaoResponseDTO;
import br.com.lembrei.lembrei_api.model.TipoItem;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class RelatorioRepository {
    private final JdbcTemplate jdbc;

    private static LocalDateTime instante(ResultSet rs, String coluna) throws SQLException {
        Timestamp valor = rs.getTimestamp(coluna);
        return valor == null ? null : valor.toLocalDateTime();
    }

    public List<AdesaoResponseDTO> relatorio(long usuario, LocalDate data) {
        return jdbc.execute((Connection con) -> {
            try (CallableStatement cs = con.prepareCall("{call pkg_lembrei_relatorio.prc_relatorio_semanal(?, ?, ?)}")) {
                cs.setLong(1, usuario);
                cs.setDate(2, java.sql.Date.valueOf(data));
                cs.registerOutParameter(3, Types.REF_CURSOR);
                cs.execute();
                List<AdesaoResponseDTO> linhas = new ArrayList<>();
                try (ResultSet rs = (ResultSet) cs.getObject(3)) {
                    while (rs.next()) linhas.add(new AdesaoResponseDTO(rs.getLong("id_item"), rs.getString("nome"),
                            TipoItem.valueOf(rs.getString("tipo")), rs.getInt("total_previsto"), rs.getInt("total_tomado"),
                            rs.getInt("total_esquecido"), rs.getInt("total_pendente"), rs.getBigDecimal("percentual_adesao")));
                }
                return linhas;
            }
        });
    }
}
