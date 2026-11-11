package br.com.lembrei.lembrei_api.service;

import br.com.lembrei.lembrei_api.dto.EstoqueDTO.EstoqueResponseDTO;
import br.com.lembrei.lembrei_api.dto.EstoqueDTO.MovimentoResponseDTO;
import br.com.lembrei.lembrei_api.dto.EstoqueDTO.ReposicaoRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO;
import br.com.lembrei.lembrei_api.dto.PaginaDTO;
import br.com.lembrei.lembrei_api.exception.ApiException;
import br.com.lembrei.lembrei_api.model.TipoItem;
import br.com.lembrei.lembrei_api.repository.EstoqueRepository;
import br.com.lembrei.lembrei_api.util.Validacoes;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class EstoqueService {
    private final EstoqueRepository repo;
    private final UsuarioService usuarioService;
    private final ItemService itemService;

    private ItemResponseDTO remedio(long usuario, long id) {
        ItemResponseDTO item = itemService.buscarItem(usuario, id);
        if (item.getTipo() != TipoItem.REMEDIO) throw new ApiException(422, "Somente remedios possuem estoque.");
        return item;
    }

    public EstoqueResponseDTO estoque(UUID uuid, long id) {
        long usuario = usuarioService.usuario(uuid).getIdUsuario();
        remedio(usuario, id);
        return repo.estoque(usuario, id);
    }

    @Transactional
    public EstoqueResponseDTO repor(UUID uuid, long id, ReposicaoRequestDTO r) {
        long usuario = usuarioService.bloquearUsuario(uuid);
        remedio(usuario, id);
        repo.repor(usuario, id, r.getQuantidade());
        return repo.estoque(usuario, id);
    }

    public PaginaDTO<MovimentoResponseDTO> movimentos(UUID uuid, long id, int pagina, int tamanho) {
        Validacoes.validarPaginacao(pagina, tamanho);
        long usuario = usuarioService.usuario(uuid).getIdUsuario();
        remedio(usuario, id);
        return PaginaDTO.de(repo.movimentos(usuario, id, pagina * tamanho, tamanho + 1), pagina, tamanho);
    }

    public PaginaDTO<EstoqueResponseDTO> alertas(UUID uuid, int pagina, int tamanho) {
        Validacoes.validarPaginacao(pagina, tamanho);
        return PaginaDTO.de(repo.alertas(usuarioService.usuario(uuid).getIdUsuario(), pagina * tamanho, tamanho + 1), pagina, tamanho);
    }
}
