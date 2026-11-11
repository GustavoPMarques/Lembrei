package br.com.lembrei.lembrei_api.controller;

import br.com.lembrei.lembrei_api.dto.PaginaDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.ConfirmacaoRequestDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.GeracaoResponseDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.GerarRotinaRequestDTO;
import br.com.lembrei.lembrei_api.dto.RotinaDTO.RegistroResponseDTO;
import br.com.lembrei.lembrei_api.service.RotinaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Rotina")
@RequiredArgsConstructor
public class RotinaController {
    private final RotinaService service;

    @GetMapping("/rotina")
    @Operation(summary = "Gera ocorrencias ausentes e lista a rotina; data padrao: hoje")
    public PaginaDTO<RegistroResponseDTO> rotina(@RequestHeader("X-Dispositivo-Id") UUID uuid,
            @RequestParam(required = false) LocalDate data, @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanho) {
        return service.rotina(uuid, data, pagina, tamanho);
    }

    @PostMapping("/rotina/gerar")
    @Operation(summary = "Gera ocorrencias de um intervalo de ate 31 dias, sem duplicatas")
    public GeracaoResponseDTO gerar(@RequestHeader("X-Dispositivo-Id") UUID uuid, @Valid @RequestBody GerarRotinaRequestDTO r) {
        return service.gerar(uuid, r);
    }

    @GetMapping("/registros/{id}")
    @Operation(summary = "Consulta uma ocorrencia")
    public RegistroResponseDTO registro(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id) {
        return service.registro(uuid, id);
    }

    @PostMapping("/registros/{id}/confirmar")
    @Operation(summary = "Confirma dose ou habito; corpo opcional. Repetir nao desconta estoque novamente")
    public RegistroResponseDTO confirmar(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id,
            @Valid @RequestBody(required = false) ConfirmacaoRequestDTO r) {
        return service.confirmar(uuid, id, r);
    }

    @PostMapping("/registros/{id}/esquecer")
    @Operation(summary = "Marca uma ocorrencia vencida como esquecida; pode ser confirmada depois")
    public RegistroResponseDTO esquecer(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id) {
        return service.esquecer(uuid, id);
    }

}
