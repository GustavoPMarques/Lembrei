package br.com.lembrei.lembrei_api.service;

import br.com.lembrei.lembrei_api.dto.UsuarioDTO.IdentificacaoDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.IdentificarRequestDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.NomeRequestDTO;
import br.com.lembrei.lembrei_api.dto.UsuarioDTO.UsuarioResponseDTO;
import br.com.lembrei.lembrei_api.exception.ApiException;
import br.com.lembrei.lembrei_api.repository.UsuarioRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class UsuarioService {
    private final UsuarioRepository repo;

    @Transactional
    public IdentificacaoDTO identificar(IdentificarRequestDTO r) {
        Optional<UsuarioResponseDTO> existente = repo.usuario(r.getUuidDispositivo());
        if (existente.isPresent()) return new IdentificacaoDTO(existente.get(), false);
        try {
            repo.criarUsuario(r.getUuidDispositivo(), r.getNome().strip());
            return new IdentificacaoDTO(usuario(r.getUuidDispositivo()), true);
        } catch (DuplicateKeyException ex) {
            return new IdentificacaoDTO(usuario(r.getUuidDispositivo()), false);
        }
    }

    public UsuarioResponseDTO usuario(UUID uuid) {
        return repo.usuario(uuid).orElseThrow(() -> ApiException.naoEncontrado("Usuario"));
    }

    @Transactional
    public UsuarioResponseDTO renomear(UUID uuid, NomeRequestDTO r) {
        long id = bloquearUsuario(uuid);
        repo.renomearUsuario(id, r.getNome().strip());
        return usuario(uuid);
    }

    @Transactional
    public long bloquearUsuario(UUID uuid) {
        long id = usuario(uuid).getIdUsuario();
        repo.bloquearUsuario(id);
        return id;
    }
}
