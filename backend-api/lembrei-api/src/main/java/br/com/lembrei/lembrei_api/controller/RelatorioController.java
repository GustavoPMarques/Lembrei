package br.com.lembrei.lembrei_api.controller;

import br.com.lembrei.lembrei_api.dto.RelatorioDTO.RelatorioResponseDTO;
import br.com.lembrei.lembrei_api.service.RelatorioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/relatorios")
@Tag(name = "Relatorios")
@RequiredArgsConstructor
public class RelatorioController {
    private final RelatorioService service;

    @GetMapping("/semanal")
    @Operation(summary = "Consulta adesao na semana ISO; somente ocorrencias geradas cujo horario ja chegou")
    public RelatorioResponseDTO relatorio(@RequestHeader("X-Dispositivo-Id") UUID uuid,
            @RequestParam(required = false) LocalDate data) {
        return service.relatorio(uuid, data);
    }
}
