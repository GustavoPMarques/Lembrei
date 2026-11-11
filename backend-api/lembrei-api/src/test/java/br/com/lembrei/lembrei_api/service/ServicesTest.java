package br.com.lembrei.lembrei_api.service;

import br.com.lembrei.lembrei_api.dto.EstoqueDTO.ReposicaoRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO.HorarioResponseDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO;
import br.com.lembrei.lembrei_api.dto.PaginaDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.GerarRotinaRequestDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.RegistroResponseDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.IdentificarRequestDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.UsuarioResponseDTO;
import br.com.lembrei.lembrei_api.model.TipoItem;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import br.com.lembrei.lembrei_api.exception.ApiException;
import br.com.lembrei.lembrei_api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;

class ServicesTest {
    private final UsuarioRepository usuarioRepository = mock(UsuarioRepository.class);
    private final ItemRepository itemRepository = mock(ItemRepository.class);
    private final RotinaRepository rotinaRepository = mock(RotinaRepository.class);
    private final EstoqueRepository estoqueRepository = mock(EstoqueRepository.class);
    private final RelatorioRepository relatorioRepository = mock(RelatorioRepository.class);
    private final UUID uuid = UUID.randomUUID();
    private final LocalDate hoje = LocalDate.of(2026, 11, 11);
    private final UsuarioResponseDTO usuario = new UsuarioResponseDTO(7, uuid, "Maria", hoje.atStartOfDay());
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-11T15:00:00Z"), ZoneId.of("America/Sao_Paulo"));
    private final UsuarioService usuarioService = new UsuarioService(usuarioRepository);
    private final ItemService itemService = new ItemService(itemRepository, usuarioService);
    private final RotinaService rotinaService = new RotinaService(rotinaRepository, usuarioService, clock);
    private final EstoqueService estoqueService = new EstoqueService(estoqueRepository, usuarioService, itemService);
    private final RelatorioService relatorioService = new RelatorioService(relatorioRepository, usuarioService, clock);

    @BeforeEach
    void preparar() { when(usuarioRepository.usuario(uuid)).thenReturn(Optional.of(usuario)); }

    private ItemRequestDTO request(TipoItem tipo, Integer estoque, String dias, List<String> horarios) {
        return new ItemRequestDTO(tipo, "Item", null, 1, estoque, dias, horarios);
    }

    private ItemResponseDTO item(TipoItem tipo) {
        return new ItemResponseDTO(9, tipo, "Item", null, 1, tipo == TipoItem.REMEDIO ? 10 : null,
                "1111111", true, hoje.atStartOfDay(), List.of(new HorarioResponseDTO(5, "08:00")));
    }

    @Test
    void identificarExistenteNaoCadastraNemTrocaNome() {
        var resultado = usuarioService.identificar(new IdentificarRequestDTO(uuid, "Outro"));
        assertFalse(resultado.isCriado());
        assertEquals("Maria", resultado.getUsuario().getNome());
        verify(usuarioRepository, never()).criarUsuario(any(), anyString());
    }

    @Test
    void identificarNovoNormalizaNome() {
        when(usuarioRepository.usuario(uuid)).thenReturn(Optional.empty(), Optional.of(usuario));
        assertTrue(usuarioService.identificar(new IdentificarRequestDTO(uuid, " Maria ")).isCriado());
        verify(usuarioRepository).criarUsuario(uuid, "Maria");
    }

    @Test
    void identificarToleraCadastroConcorrente() {
        when(usuarioRepository.usuario(uuid)).thenReturn(Optional.empty(), Optional.of(usuario));
        doThrow(new DuplicateKeyException("UUID")).when(usuarioRepository).criarUsuario(uuid, "Maria");
        assertFalse(usuarioService.identificar(new IdentificarRequestDTO(uuid, "Maria")).isCriado());
    }

    @Test
    void dispositivoDesconhecidoNaoConsultaItens() {
        when(usuarioRepository.usuario(uuid)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ApiException.class, () -> itemService.itens(uuid, null, 0, 20)).getStatus());
        verify(itemRepository, never()).itens(anyLong(), any(), anyInt(), anyInt());
    }

    @Test
    void itemDeOutroUsuarioRetorna404() {
        when(itemRepository.item(7, 9)).thenReturn(Optional.empty());
        assertEquals(404, assertThrows(ApiException.class, () -> itemService.item(uuid, 9)).getStatus());
        verify(itemRepository).item(7, 9);
    }

    @Test
    void remedioExigeEstoqueInicial() {
        assertThrows(ApiException.class, () -> itemService.criarItem(uuid, request(TipoItem.REMEDIO, null, "1111111", List.of("08:00"))));
        verify(itemRepository, never()).criarItem(anyLong(), any());
    }

    @Test
    void habitoNaoAceitaEstoque() {
        assertThrows(ApiException.class, () -> itemService.criarItem(uuid, request(TipoItem.HABITO, 1, "1111111", List.of("08:00"))));
    }

    @Test
    void rejeitaDiasVaziosEHorariosDuplicados() {
        assertThrows(ApiException.class, () -> itemService.criarItem(uuid, request(TipoItem.HABITO, null, "0000000", List.of("08:00"))));
        assertThrows(ApiException.class, () -> itemService.criarItem(uuid, request(TipoItem.HABITO, null, "1111111", List.of("08:00", "08:00"))));
    }

    @Test
    void criacaoInsereHorariosEVinculaUsuarioResolvido() {
        var r = request(TipoItem.REMEDIO, 10, "1111111", List.of("08:00", "20:00"));
        when(itemRepository.criarItem(7, r)).thenReturn(9L);
        when(itemRepository.item(7, 9)).thenReturn(Optional.of(item(TipoItem.REMEDIO)));
        itemService.criarItem(uuid, r);
        verify(usuarioRepository).bloquearUsuario(7);
        verify(itemRepository).adicionarHorario(9, "08:00");
        verify(itemRepository).adicionarHorario(9, "20:00");
    }

    @Test
    void edicaoNaoPodeAlterarEstoque() {
        assertThrows(ApiException.class, () -> itemService.atualizarItem(uuid, 9,
                request(TipoItem.REMEDIO, 10, "1111111", List.of("08:00"))));
        verify(itemRepository, never()).atualizarItem(anyLong(), anyLong(), any());
    }

    @Test
    void edicaoPreservaHorariosComHistorico() {
        when(itemRepository.item(7, 9)).thenReturn(Optional.of(item(TipoItem.REMEDIO)));
        when(itemRepository.horarioUsado(5)).thenReturn(true);
        assertEquals(409, assertThrows(ApiException.class, () -> itemService.atualizarItem(uuid, 9,
                request(TipoItem.REMEDIO, null, "1111111", List.of("09:00")))).getStatus());
        verify(itemRepository, never()).removerHorario(anyLong());
        verify(itemRepository, never()).atualizarItem(anyLong(), anyLong(), any());
    }

    @Test
    void edicaoPreservaIdDeHorarioMantido() {
        when(itemRepository.item(7, 9)).thenReturn(Optional.of(item(TipoItem.REMEDIO)));
        itemService.atualizarItem(uuid, 9, request(TipoItem.REMEDIO, null, "1111100", List.of("08:00", "20:00")));
        verify(itemRepository, never()).removerHorario(anyLong());
        verify(itemRepository).adicionarHorario(9, "20:00");
        verify(itemRepository, never()).adicionarHorario(9, "08:00");
    }

    @Test
    void rotinaGeraAntesDeListarComDataLocalEPaginacao() {
        when(rotinaRepository.rotina(7, hoje, 20, 21)).thenReturn(List.of());
        rotinaService.rotina(uuid, null, 1, 20);
        var ordem = inOrder(rotinaRepository);
        ordem.verify(rotinaRepository).gerarRotina(7, hoje);
        ordem.verify(rotinaRepository).rotina(7, hoje, 20, 21);
    }

    @Test
    void limitaPaginacaoEIntervaloDeGeracao() {
        assertThrows(ApiException.class, () -> itemService.itens(uuid, null, 0, 101));
        assertThrows(ApiException.class, () -> itemService.itens(uuid, null, -1, 20));
        assertThrows(ApiException.class, () -> rotinaService.gerar(uuid, new GerarRotinaRequestDTO(hoje, hoje.plusDays(31))));
        assertThrows(ApiException.class, () -> rotinaService.gerar(uuid, new GerarRotinaRequestDTO(hoje, hoje.minusDays(1))));
        verify(rotinaRepository, never()).gerarRotina(anyLong(), any());
    }

    @Test
    void geraCadaDiaESomaOcorrencias() {
        when(rotinaRepository.gerarRotina(eq(7L), any())).thenReturn(2);
        assertEquals(6, rotinaService.gerar(uuid, new GerarRotinaRequestDTO(hoje, hoje.plusDays(2))).getQuantidadeGerada());
        verify(rotinaRepository, times(3)).gerarRotina(eq(7L), any());
    }

    @Test
    void confirmarDelegaSemBaixaDuplicadaNaApi() {
        var registro = new RegistroResponseDTO(8, 9, 5, "Item", TipoItem.REMEDIO, null, 1,
                hoje.atTime(8, 0), null, "PENDENTE");
        when(rotinaRepository.registro(7, 8)).thenReturn(Optional.of(registro));
        rotinaService.confirmar(uuid, 8, null);
        verify(rotinaRepository).confirmar(7, 8, null);
        verify(estoqueRepository, never()).repor(anyLong(), anyLong(), anyInt());
    }

    @Test
    void naoEsqueceOcorrenciaConfirmada() {
        when(rotinaRepository.registro(7, 8)).thenReturn(Optional.of(new RegistroResponseDTO(8, 9, 5, "Item", TipoItem.HABITO,
                null, 1, hoje.atTime(8, 0), hoje.atTime(8, 1), "TOMADO")));
        assertEquals(409, assertThrows(ApiException.class, () -> rotinaService.esquecer(uuid, 8)).getStatus());
        verify(rotinaRepository, never()).esquecer(anyLong(), anyLong());
    }

    @Test
    void habitoNaoPodeReceberReposicao() {
        when(itemRepository.item(7, 9)).thenReturn(Optional.of(item(TipoItem.HABITO)));
        assertThrows(ApiException.class, () -> estoqueService.repor(uuid, 9, new ReposicaoRequestDTO(10)));
        verify(estoqueRepository, never()).repor(anyLong(), anyLong(), anyInt());
    }

    @Test
    void relatorioUsaSemanaIsoENaoCriaOcorrenciasImplicitamente() {
        LocalDate segunda = LocalDate.of(2026, 11, 9);
        when(relatorioRepository.relatorio(7, segunda)).thenReturn(List.of());
        var resposta = relatorioService.relatorio(uuid, hoje);
        assertEquals(segunda, resposta.getInicioSemana());
        assertEquals(segunda.plusDays(6), resposta.getFimSemana());
        verify(rotinaRepository, never()).gerarRotina(anyLong(), any());
    }

    @Test
    void paginaRecortaLinhaExtra() {
        var pagina = PaginaDTO.de(List.of(1, 2, 3), 0, 2);
        assertEquals(List.of(1, 2), pagina.getConteudo());
        assertTrue(pagina.isTemProxima());
    }
}
