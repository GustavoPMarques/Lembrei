package br.com.lembrei.lembrei_api.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PaginaDTO<T> {

    private List<T> conteudo;

    private int pagina;

    private int tamanho;

    private boolean temProxima;

    public static <T> PaginaDTO<T> de(List<T> resultados, int pagina, int tamanho) {
        int limite = Math.min(resultados.size(), tamanho);
        List<T> conteudo = new ArrayList<>(resultados.subList(0, limite));
        return new PaginaDTO<>(conteudo, pagina, tamanho, resultados.size() > tamanho);
    }
}
