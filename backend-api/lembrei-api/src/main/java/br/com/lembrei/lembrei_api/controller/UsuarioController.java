package br.com.lembrei.lembrei_api.controller;

import br.com.lembrei.lembrei_api.dto.UsuarioDTO.IdentificacaoDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.IdentificarRequestDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.NomeRequestDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.UsuarioResponseDTO;
import br.com.lembrei.lembrei_api.service.UsuarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/usuarios")
@Tag(name = "Dispositivo", description = "Identificacao automatica sem login")
@RequiredArgsConstructor
public class UsuarioController {
    private final UsuarioService service;

    @PostMapping("/identificar")
    @SecurityRequirements
    @Operation(summary = "Cria ou recupera o usuario pelo UUID do aparelho")
    public ResponseEntity<UsuarioResponseDTO> identificar(@Valid @RequestBody IdentificarRequestDTO r) {
        var resultado = service.identificar(r);
        return resultado.isCriado() ? ResponseEntity.created(URI.create("/api/v1/usuarios/me")).body(resultado.getUsuario())
                : ResponseEntity.ok(resultado.getUsuario());
    }

    @GetMapping("/me")
    @Operation(summary = "Consulta o usuario do aparelho")
    public UsuarioResponseDTO me(@RequestHeader("X-Dispositivo-Id") UUID uuid) { return service.usuario(uuid); }

    @PutMapping("/me")
    @Operation(summary = "Atualiza o nome do usuario")
    public UsuarioResponseDTO renomear(@RequestHeader("X-Dispositivo-Id") UUID uuid, @Valid @RequestBody NomeRequestDTO r) {
        return service.renomear(uuid, r);
    }
}
