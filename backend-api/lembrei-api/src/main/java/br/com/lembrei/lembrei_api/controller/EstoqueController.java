package br.com.lembrei.lembrei_api.controller;

import br.com.lembrei.lembrei_api.dto.EstoqueDTO.EstoqueResponseDTO;
import br.com.lembrei.lembrei_api.dto.EstoqueDTO.MovimentoResponseDTO;
import br.com.lembrei.lembrei_api.dto.EstoqueDTO.ReposicaoRequestDTO;
import br.com.lembrei.lembrei_api.dto.PaginaDTO;
import br.com.lembrei.lembrei_api.service.EstoqueService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@Tag(name = "Estoque")
@RequiredArgsConstructor
public class EstoqueController {
    private final EstoqueService service;

    @GetMapping("/itens/{id}/estoque")
    @Operation(summary = "Consulta saldo, consumo semanal e primeira dose futura sem saldo")
    public EstoqueResponseDTO estoque(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id) {
        return service.estoque(uuid, id);
    }

    @PostMapping("/itens/{id}/reposicoes")
    @Operation(summary = "Repoe estoque e grava movimento na mesma transacao; nao repetir automaticamente")
    public EstoqueResponseDTO repor(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id,
            @Valid @RequestBody ReposicaoRequestDTO r) {
        return service.repor(uuid, id, r);
    }

    @GetMapping("/itens/{id}/movimentos")
    @Operation(summary = "Lista historico de baixas e reposicoes")
    public PaginaDTO<MovimentoResponseDTO> movimentos(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanho) {
        return service.movimentos(uuid, id, pagina, tamanho);
    }

    @GetMapping("/alertas/estoque")
    @Operation(summary = "Lista remedios ativos com previsao de falta de estoque em ate tres dias")
    public PaginaDTO<EstoqueResponseDTO> alertas(@RequestHeader("X-Dispositivo-Id") UUID uuid,
            @RequestParam(defaultValue = "0") int pagina, @RequestParam(defaultValue = "20") int tamanho) {
        return service.alertas(uuid, pagina, tamanho);
    }
}
