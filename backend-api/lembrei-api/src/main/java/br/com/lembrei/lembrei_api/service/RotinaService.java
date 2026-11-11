package br.com.lembrei.lembrei_api.service;

import br.com.lembrei.lembrei_api.dto.PaginaDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.ConfirmacaoRequestDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.GeracaoResponseDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.GerarRotinaRequestDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.RegistroResponseDTO;
import br.com.lembrei.lembrei_api.exception.ApiException;
import br.com.lembrei.lembrei_api.repository.RotinaRepository;
import br.com.lembrei.lembrei_api.util.Validacoes;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class RotinaService {
    private final RotinaRepository repo;
    private final UsuarioService usuarioService;
    private final Clock clock;

    @Transactional
    public PaginaDTO<RegistroResponseDTO> rotina(UUID uuid, LocalDate data, int pagina, int tamanho) {
        Validacoes.validarPaginacao(pagina, tamanho);
        data = Validacoes.dataOuHoje(data, clock);
        long usuario = usuarioService.bloquearUsuario(uuid);
        repo.gerarRotina(usuario, data);
        return PaginaDTO.de(repo.rotina(usuario, data, pagina * tamanho, tamanho + 1), pagina, tamanho);
    }

    @Transactional
    public GeracaoResponseDTO gerar(UUID uuid, GerarRotinaRequestDTO r) {
        LocalDate inicio = Validacoes.dataOuHoje(r.getInicio(), clock);
        LocalDate fim = Validacoes.dataOuHoje(r.getFim(), clock);
        long intervalo = ChronoUnit.DAYS.between(inicio, fim);
        if (intervalo < 0 || intervalo > 30) throw new ApiException(422, "Informe um intervalo de 1 a 31 dias em ordem crescente.");
        long usuario = usuarioService.bloquearUsuario(uuid);
        int quantidade = 0;
        for (LocalDate d = inicio; !d.isAfter(fim); d = d.plusDays(1)) quantidade += repo.gerarRotina(usuario, d);
        return new GeracaoResponseDTO(inicio, fim, quantidade);
    }

    public RegistroResponseDTO registro(UUID uuid, long id) {
        return buscarRegistro(usuarioService.usuario(uuid).getIdUsuario(), id);
    }

    private RegistroResponseDTO buscarRegistro(long usuario, long id) {
        return repo.registro(usuario, id).orElseThrow(() -> ApiException.naoEncontrado("Registro"));
    }

    @Transactional
    public RegistroResponseDTO confirmar(UUID uuid, long id, ConfirmacaoRequestDTO r) {
        long usuario = usuarioService.bloquearUsuario(uuid);
        buscarRegistro(usuario, id);
        if (r != null && r.getDtTomada() != null && (r.getDtTomada().getYear() < 1900 || r.getDtTomada().getYear() > 2100))
            throw new ApiException(422, "Data de confirmacao fora do intervalo suportado (1900 a 2100).");
        repo.confirmar(usuario, id, r == null ? null : r.getDtTomada());
        return buscarRegistro(usuario, id);
    }

    @Transactional
    public RegistroResponseDTO esquecer(UUID uuid, long id) {
        long usuario = usuarioService.bloquearUsuario(uuid);
        RegistroResponseDTO registro = buscarRegistro(usuario, id);
        if ("ESQUECIDO".equals(registro.getStatus())) return registro;
        if ("TOMADO".equals(registro.getStatus())) throw new ApiException(409, "Uma ocorrencia confirmada nao pode ser alterada.");
        if (repo.esquecer(usuario, id) == 0) throw new ApiException(422, "Nao e permitido marcar uma ocorrencia futura como esquecida.");
        return buscarRegistro(usuario, id);
    }
}
