package br.com.lembrei.lembrei_api.repository;

import br.com.lembrei.lembrei_api.dto.ItemRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO.HorarioResponseDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO;
import br.com.lembrei.lembrei_api.model.TipoItem;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ItemRepository {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate named;

    private static LocalDateTime instante(ResultSet rs, String coluna) throws SQLException {
        Timestamp valor = rs.getTimestamp(coluna);
        return valor == null ? null : valor.toLocalDateTime();
    }

    private static final RowMapper<ItemResponseDTO> ITEM = (rs, row) -> new ItemResponseDTO(
            rs.getLong("id_item"), TipoItem.valueOf(rs.getString("tipo")), rs.getString("nome"), rs.getString("dose"),
            rs.getInt("qtd_por_dose"), rs.getObject("estoque_atual", Integer.class), rs.getString("dias_semana"),
            "S".equals(rs.getString("ativo")), instante(rs, "dt_criacao"), List.of());

    public List<ItemResponseDTO> itens(long usuario, Boolean ativo, int offset, int limite) {
        String filtro = ativo == null ? "" : " AND ativo = ?";
        List<Object> args = new ArrayList<>();
        args.add(usuario);
        if (ativo != null) args.add(ativo ? "S" : "N");
        args.add(offset);
        args.add(limite);
        return comHorarios(jdbc.query("SELECT * FROM item_lembrei WHERE id_usuario = ?" + filtro
                + " ORDER BY id_item OFFSET ? ROWS FETCH NEXT ? ROWS ONLY", ITEM, args.toArray()));
    }

    public Optional<ItemResponseDTO> item(long usuario, long item) {
        return comHorarios(jdbc.query("SELECT * FROM item_lembrei WHERE id_usuario = ? AND id_item = ?", ITEM, usuario, item))
                .stream().findFirst();
    }

    private List<ItemResponseDTO> comHorarios(List<ItemResponseDTO> itens) {
        if (itens.isEmpty()) return itens;
        Map<Long, List<HorarioResponseDTO>> horarios = new HashMap<>();
        List<Long> ids = new ArrayList<>();
        for (ItemResponseDTO item : itens) {
            ids.add(item.getIdItem());
        }
        named.query("SELECT id_item, id_horario, hora FROM horario_lembrei WHERE id_item IN (:ids) ORDER BY hora",
                Map.of("ids", ids), rs -> {
                    long idItem = rs.getLong("id_item");
                    if (!horarios.containsKey(idItem)) {
                        horarios.put(idItem, new ArrayList<>());
                    }
                    HorarioResponseDTO horario = new HorarioResponseDTO(rs.getLong("id_horario"), rs.getString("hora"));
                    horarios.get(idItem).add(horario);
                });
        for (ItemResponseDTO item : itens) {
            item.setHorarios(horarios.getOrDefault(item.getIdItem(), new ArrayList<>()));
        }
        return itens;
    }

    public long criarItem(long usuario, ItemRequestDTO r) {
        return jdbc.execute((Connection con) -> {
            try (CallableStatement cs = con.prepareCall("""
                    BEGIN
                      INSERT INTO item_lembrei
                        (id_usuario, tipo, nome, dose, qtd_por_dose, estoque_atual, dias_semana)
                      VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id_item INTO ?;
                    END;
                    """)) {
                cs.setLong(1, usuario);
                cs.setString(2, r.getTipo().name());
                cs.setString(3, r.getNome().strip());
                cs.setString(4, r.getDose() == null ? null : r.getDose().strip());
                cs.setInt(5, r.getQtdPorDose());
                if (r.getEstoqueInicial() == null) cs.setNull(6, Types.NUMERIC);
                else cs.setInt(6, r.getEstoqueInicial());
                cs.setString(7, r.getDiasSemana());
                cs.registerOutParameter(8, Types.NUMERIC);
                cs.execute();
                return cs.getLong(8);
            }
        });
    }

    public void atualizarItem(long usuario, long item, ItemRequestDTO r) {
        jdbc.update("""
                UPDATE item_lembrei SET nome = ?, dose = ?, qtd_por_dose = ?, dias_semana = ?
                WHERE id_usuario = ? AND id_item = ?
                """, r.getNome().strip(), r.getDose() == null ? null : r.getDose().strip(), r.getQtdPorDose(), r.getDiasSemana(), usuario, item);
    }

    public void adicionarHorario(long item, String hora) {
        jdbc.update("INSERT INTO horario_lembrei (id_item, hora) VALUES (?, ?)", item, hora);
    }

    public boolean horarioUsado(long horario) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM registro_dose_lembrei WHERE id_horario = ?", Integer.class, horario) > 0;
    }

    public void removerHorario(long horario) {
        jdbc.update("DELETE FROM horario_lembrei WHERE id_horario = ?", horario);
    }

    public void definirAtivo(long usuario, long item, boolean ativo) {
        jdbc.update("UPDATE item_lembrei SET ativo = ? WHERE id_usuario = ? AND id_item = ?", ativo ? "S" : "N", usuario, item);
    }

}
