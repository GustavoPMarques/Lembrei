package br.com.lembrei.lembrei_api.controller;

import br.com.lembrei.lembrei_api.dto.ItemResponseDTO.HorarioResponseDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO;
import br.com.lembrei.lembrei_api.dto.PaginaDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.IdentificacaoDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.UsuarioResponseDTO;
import br.com.lembrei.lembrei_api.model.TipoItem;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.UUID;
import java.util.List;
import br.com.lembrei.lembrei_api.exception.GlobalExceptionHandler;
import br.com.lembrei.lembrei_api.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.dao.UncategorizedDataAccessException;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class ApiControllerTest {
    private final UsuarioService usuarioService = mock(UsuarioService.class);
    private final ItemService itemService = mock(ItemService.class);
    private final RotinaService rotinaService = mock(RotinaService.class);
    private final EstoqueService estoqueService = mock(EstoqueService.class);
    private final RelatorioService relatorioService = mock(RelatorioService.class);
    private final UUID uuid = UUID.randomUUID();
    private MockMvc mvc;

    @BeforeEach
    void preparar() {
        mvc = MockMvcBuilders.standaloneSetup(new UsuarioController(usuarioService), new ItemController(itemService),
                new RotinaController(rotinaService), new EstoqueController(estoqueService), new RelatorioController(relatorioService))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void identificarNaoExigeHeaderERetorna201() throws Exception {
        var usuario = new UsuarioResponseDTO(1, uuid, "Maria", LocalDateTime.of(2026, 11, 11, 8, 0));
        when(usuarioService.identificar(any())).thenReturn(new IdentificacaoDTO(usuario, true));
        mvc.perform(post("/api/v1/usuarios/identificar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"uuidDispositivo\":\"" + uuid + "\",\"nome\":\"Maria\"}"))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/v1/usuarios/me"))
                .andExpect(jsonPath("$.nome").value("Maria"));
    }

    @Test
    void identificarExistenteRetorna200() throws Exception {
        when(usuarioService.identificar(any())).thenReturn(new IdentificacaoDTO(
                new UsuarioResponseDTO(1, uuid, "Maria", LocalDateTime.now()), false));
        mvc.perform(post("/api/v1/usuarios/identificar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"uuidDispositivo\":\"" + uuid + "\",\"nome\":\"Maria\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void headerObrigatorioEUuidValido() throws Exception {
        mvc.perform(get("/api/v1/itens")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/itens").header("X-Dispositivo-Id", "invalido")).andExpect(status().isBadRequest());
        verifyNoInteractions(usuarioService, itemService, rotinaService, estoqueService, relatorioService);
    }

    @Test
    void rejeitaCadastroSemNome() throws Exception {
        mvc.perform(post("/api/v1/usuarios/identificar").contentType(MediaType.APPLICATION_JSON)
                .content("{\"uuidDispositivo\":\"" + uuid + "\",\"nome\":\" \"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.nome").exists());
        verifyNoInteractions(usuarioService, itemService, rotinaService, estoqueService, relatorioService);
    }

    @Test
    void rejeitaHorarioInvalidoEQuantidadeForaDoLimite() throws Exception {
        mvc.perform(post("/api/v1/itens").header("X-Dispositivo-Id", uuid).contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"tipo":"REMEDIO","nome":"Remedio","qtdPorDose":0,"estoqueInicial":5,
                         "diasSemana":"1111111","horarios":["25:00"]}
                        """))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(usuarioService, itemService, rotinaService, estoqueService, relatorioService);
    }

    @Test
    void rejeitaReposicaoNegativa() throws Exception {
        mvc.perform(post("/api/v1/itens/1/reposicoes").header("X-Dispositivo-Id", uuid)
                .contentType(MediaType.APPLICATION_JSON).content("{\"quantidade\":-1}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(usuarioService, itemService, rotinaService, estoqueService, relatorioService);
    }

    @Test
    void rejeitaDataETipoInvalidos() throws Exception {
        mvc.perform(get("/api/v1/rotina").header("X-Dispositivo-Id", uuid).param("data", "2026-99-99"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/itens").header("X-Dispositivo-Id", uuid).contentType(MediaType.APPLICATION_JSON)
                .content("{\"tipo\":\"OUTRO\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void confirmarAceitaCorpoAusente() throws Exception {
        mvc.perform(post("/api/v1/registros/1/confirmar").header("X-Dispositivo-Id", uuid)).andExpect(status().isOk());
        verify(rotinaService).confirmar(uuid, 1, null);
    }

    @Test
    void erroDeEstoqueDoOracleVira409SemExporSql() throws Exception {
        when(estoqueService.repor(eq(uuid), eq(1L), any())).thenThrow(new UncategorizedDataAccessException("SQL secreto",
                new SQLException("ORA-20024: detalhe interno", "72000", 20024)) {});
        mvc.perform(post("/api/v1/itens/1/reposicoes").header("X-Dispositivo-Id", uuid)
                .contentType(MediaType.APPLICATION_JSON).content("{\"quantidade\":1}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensagem").value("Estoque insuficiente. Reponha antes de confirmar."));
    }

    @Test
    void bancoIndisponivelVira503() throws Exception {
        when(usuarioService.usuario(uuid)).thenThrow(new DataAccessResourceFailureException("senha secreta"));
        mvc.perform(get("/api/v1/usuarios/me").header("X-Dispositivo-Id", uuid))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.mensagem").value("Nao foi possivel acessar o Oracle. Tente novamente mais tarde."));
    }

    @Test
    void metodoEContentTypeIncorretosPreservamStatusHttp() throws Exception {
        mvc.perform(delete("/api/v1/itens/1").header("X-Dispositivo-Id", uuid))
                .andExpect(status().isMethodNotAllowed());
        mvc.perform(post("/api/v1/usuarios/identificar").contentType(MediaType.TEXT_PLAIN).content("texto"))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    void validaCadaHorarioDoDtoConvencional() throws Exception {
        for (String horario : List.of("\"25:00\"", "\"\"", "null")) {
            mvc.perform(post("/api/v1/itens").header("X-Dispositivo-Id", uuid).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"tipo\":\"REMEDIO\",\"nome\":\"Teste\",\"qtdPorDose\":1,\"estoqueInicial\":10,"
                            + "\"diasSemana\":\"1111111\",\"horarios\":[" + horario + "]}"))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(itemService);
    }

    @Test
    void dtoConvencionalPreservaContratoJsonUsadoPeloApp() throws Exception {
        ItemResponseDTO item = new ItemResponseDTO(9, TipoItem.REMEDIO, "Teste", null, 1, 10,
                "1111111", true, LocalDateTime.of(2026, 11, 11, 8, 0), List.of(new HorarioResponseDTO(5, "08:00")));
        when(itemService.itens(uuid, null, 0, 20)).thenReturn(new PaginaDTO<>(List.of(item), 0, 20, false));
        mvc.perform(get("/api/v1/itens").header("X-Dispositivo-Id", uuid))
                .andExpect(status().isOk())
                .andExpect(content().json("""
                        {"conteudo":[{"idItem":9,"tipo":"REMEDIO","nome":"Teste","dose":null,
                        "qtdPorDose":1,"estoqueAtual":10,"diasSemana":"1111111","ativo":true,
                        "dtCriacao":"2026-11-11T08:00:00","horarios":[{"idHorario":5,"hora":"08:00"}]}],
                        "pagina":0,"tamanho":20,"temProxima":false}
                        """));
    }
}
