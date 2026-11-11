package br.com.lembrei.lembrei_api.service;

import br.com.lembrei.lembrei_api.dto.RelatorioDTO.RelatorioResponseDTO;
import br.com.lembrei.lembrei_api.repository.RelatorioRepository;
import br.com.lembrei.lembrei_api.util.Validacoes;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class RelatorioService {
    private final RelatorioRepository repo;
    private final UsuarioService usuarioService;
    private final Clock clock;

    public RelatorioResponseDTO relatorio(UUID uuid, LocalDate referencia) {
        LocalDate inicio = Validacoes.dataOuHoje(referencia, clock).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return new RelatorioResponseDTO(inicio, inicio.plusDays(6), repo.relatorio(usuarioService.usuario(uuid).getIdUsuario(), inicio));
    }
}
