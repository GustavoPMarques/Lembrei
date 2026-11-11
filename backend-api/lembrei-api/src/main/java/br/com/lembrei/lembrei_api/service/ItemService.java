package br.com.lembrei.lembrei_api.service;

import br.com.lembrei.lembrei_api.dto.ItemRequestDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO.HorarioResponseDTO;
import br.com.lembrei.lembrei_api.dto.ItemResponseDTO;
import br.com.lembrei.lembrei_api.dto.PaginaDTO;
import br.com.lembrei.lembrei_api.exception.ApiException;
import br.com.lembrei.lembrei_api.model.TipoItem;
import br.com.lembrei.lembrei_api.repository.ItemRepository;
import br.com.lembrei.lembrei_api.util.Validacoes;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ItemService {
    private final ItemRepository repo;
    private final UsuarioService usuarioService;

    public ItemResponseDTO buscarItem(long usuario, long id) {
        return repo.item(usuario, id).orElseThrow(() -> ApiException.naoEncontrado("Item"));
    }

    public PaginaDTO<ItemResponseDTO> itens(UUID uuid, Boolean ativo, int pagina, int tamanho) {
        Validacoes.validarPaginacao(pagina, tamanho);
        return PaginaDTO.de(repo.itens(usuarioService.usuario(uuid).getIdUsuario(), ativo, pagina * tamanho, tamanho + 1), pagina, tamanho);
    }

    public ItemResponseDTO item(UUID uuid, long id) { return buscarItem(usuarioService.usuario(uuid).getIdUsuario(), id); }

    @Transactional
    public ItemResponseDTO criarItem(UUID uuid, ItemRequestDTO r) {
        validarAgenda(r);
        if (r.getTipo() == TipoItem.REMEDIO && r.getEstoqueInicial() == null)
            throw new ApiException(422, "Remedio exige estoqueInicial, inclusive quando zero.");
        if (r.getTipo() == TipoItem.HABITO && r.getEstoqueInicial() != null)
            throw new ApiException(422, "Habito nao possui estoqueInicial.");
        long usuario = usuarioService.bloquearUsuario(uuid);
        long item = repo.criarItem(usuario, r);
        List<String> horarios = new ArrayList<>(r.getHorarios());
        Collections.sort(horarios);
        for (String horario : horarios) {
            repo.adicionarHorario(item, horario);
        }
        return buscarItem(usuario, item);
    }

    @Transactional
    public ItemResponseDTO atualizarItem(UUID uuid, long id, ItemRequestDTO r) {
        validarAgenda(r);
        if (r.getEstoqueInicial() != null)
            throw new ApiException(422, "Na edicao omita estoqueInicial. Para aumentar o saldo use reposicoes.");
        long usuario = usuarioService.bloquearUsuario(uuid);
        ItemResponseDTO atual = buscarItem(usuario, id);
        if (atual.getTipo() != r.getTipo()) throw new ApiException(409, "O tipo do item nao pode ser alterado.");
        Set<String> desejados = new HashSet<>(r.getHorarios());
        Set<String> existentes = new HashSet<>();
        for (HorarioResponseDTO h : atual.getHorarios()) {
            existentes.add(h.getHora());
            if (!desejados.contains(h.getHora()) && repo.horarioUsado(h.getIdHorario()))
                throw new ApiException(409, "Horario possui ocorrencias. Desative o item e crie outro para mudar essa agenda sem perder o historico.");
        }
        for (HorarioResponseDTO h : atual.getHorarios()) {
            if (!desejados.contains(h.getHora())) repo.removerHorario(h.getIdHorario());
        }
        List<String> horarios = new ArrayList<>(desejados);
        Collections.sort(horarios);
        for (String horario : horarios) {
            if (!existentes.contains(horario)) {
                repo.adicionarHorario(id, horario);
            }
        }
        repo.atualizarItem(usuario, id, r);
        return buscarItem(usuario, id);
    }

    @Transactional
    public ItemResponseDTO definirAtivo(UUID uuid, long id, boolean ativo) {
        long usuario = usuarioService.bloquearUsuario(uuid);
        buscarItem(usuario, id);
        repo.definirAtivo(usuario, id, ativo);
        return buscarItem(usuario, id);
    }

    private void validarAgenda(ItemRequestDTO r) {
        if (!r.getDiasSemana().contains("1")) throw new ApiException(422, "Selecione pelo menos um dia da semana.");
        if (new HashSet<>(r.getHorarios()).size() != r.getHorarios().size())
            throw new ApiException(422, "Horarios nao podem se repetir.");
    }
}
