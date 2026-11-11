package br.com.lembrei.lembrei_api;

import br.com.lembrei.lembrei_api.dto.EstoqueDTO.ReposicaoRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.GerarRotinaRequestDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.IdentificarRequestDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.NomeRequestDTO;
import br.com.lembrei.lembrei_api.model.TipoItem;
import static org.junit.jupiter.api.Assertions.*;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.HashSet;
import java.util.Set;
import br.com.lembrei.lembrei_api.exception.ApiException;
import br.com.lembrei.lembrei_api.repository.*;
import br.com.lembrei.lembrei_api.service.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.transaction.AfterTransaction;

@SpringBootTest(properties = "lembrei.oracle-check-enabled=false")
@Transactional
@EnabledIfEnvironmentVariable(named = "LEMBREI_ORACLE_TESTS", matches = "true")
class OracleIntegrationTest {
    @Autowired UsuarioService usuarioService;
    @Autowired ItemService itemService;
    @Autowired RotinaService rotinaService;
    @Autowired EstoqueService estoqueService;
    @Autowired RelatorioService relatorioService;
    @Autowired RotinaRepository rotinaRepository;
    @Autowired JdbcTemplate jdbc;
    @Autowired Clock clock;
    private final Set<UUID> aparelhosCriados = new HashSet<>();

    @AfterTransaction
    void confirmaRollbackDosDadosDeTeste() {
        for (UUID uuid : aparelhosCriados) {
            assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM usuario_lembrei WHERE uuid_dispositivo = ?",
                    Integer.class, uuid.toString()), "Usuario de teste deve desaparecer apos rollback");
        }
    }

    private LocalDate hoje() { return LocalDate.now(clock); }

    private UUID aparelho() {
        UUID uuid = UUID.randomUUID();
        aparelhosCriados.add(uuid);
        assertTrue(usuarioService.identificar(new IdentificarRequestDTO(uuid, "Teste API rollback")).isCriado());
        assertFalse(usuarioService.identificar(new IdentificarRequestDTO(uuid, "Outro nome")).isCriado());
        return uuid;
    }

    private ItemResponseDTO criar(UUID uuid, TipoItem tipo, Integer estoque, int dose) {
        var item = itemService.criarItem(uuid, new ItemRequestDTO(tipo, "Teste API", "dose teste", dose,
                estoque, "1111111", List.of("00:00")));
        jdbc.update("UPDATE item_lembrei SET dt_criacao = ? WHERE id_item = ?",
                java.sql.Date.valueOf(hoje().minusDays(1)), item.getIdItem());
        return item;
    }

    @Test
    void fluxoRemedioComBaixaIdempotenteReposicaoEAdesao() {
        UUID uuid = aparelho();
        var item = criar(uuid, TipoItem.REMEDIO, 10, 2);
        assertEquals(1, itemService.itens(uuid, true, 0, 20).getConteudo().size());
        usuarioService.renomear(uuid, new NomeRequestDTO("Nome atualizado"));
        assertEquals("Nome atualizado", usuarioService.usuario(uuid).getNome());
        var rotina = rotinaService.rotina(uuid, hoje(), 0, 20);
        assertEquals(1, rotina.getConteudo().size());
        assertEquals(1, rotinaService.rotina(uuid, hoje(), 0, 20).getConteudo().size());
        long registro = rotina.getConteudo().getFirst().getIdRegistro();
        assertEquals("TOMADO", rotinaService.confirmar(uuid, registro, null).getStatus());
        assertEquals(8, estoqueService.estoque(uuid, item.getIdItem()).getEstoqueAtual());
        rotinaService.confirmar(uuid, registro, null);
        assertEquals(8, estoqueService.estoque(uuid, item.getIdItem()).getEstoqueAtual());
        assertEquals(13, estoqueService.repor(uuid, item.getIdItem(), new ReposicaoRequestDTO(5)).getEstoqueAtual());
        assertEquals(2, estoqueService.movimentos(uuid, item.getIdItem(), 0, 20).getConteudo().size());
        assertEquals(14, estoqueService.estoque(uuid, item.getIdItem()).getConsumoSemanal());
        assertNotNull(estoqueService.estoque(uuid, item.getIdItem()).getPrimeiraDoseSemSaldo());
        assertEquals(1, relatorioService.relatorio(uuid, hoje()).getItens().getFirst().getTotalTomado());
        assertEquals(0, rotinaService.gerar(uuid, new GerarRotinaRequestDTO(hoje(), hoje())).getQuantidadeGerada());
        itemService.definirAtivo(uuid, item.getIdItem(), false);
        assertTrue(itemService.itens(uuid, true, 0, 20).getConteudo().isEmpty());
        assertNotNull(rotinaService.registro(uuid, registro));
        assertEquals(0, rotinaService.gerar(uuid, new GerarRotinaRequestDTO(hoje().plusDays(1), hoje().plusDays(1))).getQuantidadeGerada());
    }

    @Test
    void habitoPodeSerEsquecidoEConfirmadoSemMovimento() {
        UUID uuid = aparelho();
        var item = criar(uuid, TipoItem.HABITO, null, 1);
        long registro = rotinaService.rotina(uuid, hoje(), 0, 20).getConteudo().getFirst().getIdRegistro();
        assertEquals("ESQUECIDO", rotinaService.esquecer(uuid, registro).getStatus());
        assertEquals("ESQUECIDO", rotinaService.esquecer(uuid, registro).getStatus());
        assertEquals("TOMADO", rotinaService.confirmar(uuid, registro, null).getStatus());
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM movimento_estoque_lembrei WHERE id_item = ?",
                Integer.class, item.getIdItem()));
    }

    @Test
    void outroAparelhoNaoAcessaItemOuRegistro() {
        UUID dono = aparelho();
        UUID outro = aparelho();
        var item = criar(dono, TipoItem.HABITO, null, 1);
        long registro = rotinaService.rotina(dono, hoje(), 0, 20).getConteudo().getFirst().getIdRegistro();
        assertTrue(itemService.itens(outro, null, 0, 20).getConteudo().isEmpty());
        assertEquals(404, assertThrows(ApiException.class, () -> itemService.item(outro, item.getIdItem())).getStatus());
        assertEquals(404, assertThrows(ApiException.class, () -> rotinaService.confirmar(outro, registro, null)).getStatus());
    }

    @Test
    void estoqueInsuficienteDesfazConfirmacaoEBaixa() {
        UUID uuid = aparelho();
        var item = criar(uuid, TipoItem.REMEDIO, 0, 1);
        long registro = rotinaService.rotina(uuid, hoje(), 0, 20).getConteudo().getFirst().getIdRegistro();
        assertTrue(estoqueService.estoque(uuid, item.getIdItem()).isPrecisaReposicao());
        assertEquals(1, estoqueService.alertas(uuid, 0, 20).getConteudo().size());
        assertThrows(DataAccessException.class, () -> rotinaService.confirmar(uuid, registro, null));
        assertEquals("PENDENTE", rotinaRepository.registro(usuarioService.usuario(uuid).getIdUsuario(), registro).orElseThrow().getStatus());
        assertEquals(0, estoqueService.estoque(uuid, item.getIdItem()).getEstoqueAtual());
    }

    @Test
    void confirmacaoFuturaERejeitadaPelaTrigger() {
        UUID uuid = aparelho();
        criar(uuid, TipoItem.REMEDIO, 5, 1);
        long registro = rotinaService.rotina(uuid, hoje().plusDays(1), 0, 20).getConteudo().getFirst().getIdRegistro();
        assertThrows(DataAccessException.class, () -> rotinaService.confirmar(uuid, registro, null));
        assertEquals("PENDENTE", rotinaService.registro(uuid, registro).getStatus());
    }

    @Test
    void edicaoDeAgendaPreservaHistorico() {
        UUID uuid = aparelho();
        var item = criar(uuid, TipoItem.HABITO, null, 1);
        rotinaService.rotina(uuid, hoje(), 0, 20);
        var atualizado = itemService.atualizarItem(uuid, item.getIdItem(), new ItemRequestDTO(TipoItem.HABITO,
                "Nome editado", null, 1, null, "1111100", List.of("00:00", "12:00")));
        assertEquals(2, atualizado.getHorarios().size());
        assertEquals(item.getHorarios().getFirst().getIdHorario(), atualizado.getHorarios().getFirst().getIdHorario());
        assertEquals(409, assertThrows(ApiException.class, () -> itemService.atualizarItem(uuid, item.getIdItem(),
                new ItemRequestDTO(TipoItem.HABITO, "Outro", null, 1, null, "1111111", List.of("13:00")))).getStatus());
    }
}
