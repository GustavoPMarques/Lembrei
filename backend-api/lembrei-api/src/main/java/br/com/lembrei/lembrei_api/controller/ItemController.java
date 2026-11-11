package br.com.lembrei.lembrei_api.controller;

import br.com.lembrei.lembrei_api.dto.ItemRequestDTO.AtivoRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO;
import br.com.lembrei.lembrei_api.dto.PaginaDTO;
import br.com.lembrei.lembrei_api.service.ItemService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/itens")
@Tag(name = "Itens", description = "Remedios e habitos")
@RequiredArgsConstructor
public class ItemController {
    private final ItemService service;

    @GetMapping
    @Operation(summary = "Lista itens com seus horarios; ativo e opcional")
    public PaginaDTO<ItemResponseDTO> listar(@RequestHeader("X-Dispositivo-Id") UUID uuid,
            @RequestParam(required = false) Boolean ativo, @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanho) {
        return service.itens(uuid, ativo, pagina, tamanho);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Consulta um item e seus horarios")
    public ItemResponseDTO consultar(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id) {
        return service.item(uuid, id);
    }

    @PostMapping
    @Operation(summary = "Cadastra um remedio ou habito com horarios")
    public ResponseEntity<ItemResponseDTO> criar(@RequestHeader("X-Dispositivo-Id") UUID uuid, @Valid @RequestBody ItemRequestDTO r) {
        ItemResponseDTO item = service.criarItem(uuid, r);
        return ResponseEntity.created(URI.create("/api/v1/itens/" + item.getIdItem())).body(item);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Edita um item; omita estoqueInicial. Horarios com ocorrencias sao preservados")
    public ItemResponseDTO atualizar(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id,
            @Valid @RequestBody ItemRequestDTO r) {
        return service.atualizarItem(uuid, id, r);
    }

    @PatchMapping("/{id}/ativo")
    @Operation(summary = "Ativa ou desativa sem excluir o historico")
    public ItemResponseDTO ativo(@RequestHeader("X-Dispositivo-Id") UUID uuid, @PathVariable @Positive long id,
            @Valid @RequestBody AtivoRequestDTO r) {
        return service.definirAtivo(uuid, id, r.getAtivo());
    }
}
