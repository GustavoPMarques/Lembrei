package br.com.lembrei.lembrei_api.dto;

import br.com.lembrei.lembrei_api.model.TipoItem;
import java.time.LocalDateTime;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ItemResponseDTO {

    private long idItem;

    private TipoItem tipo;

    private String nome;

    private String dose;

    private int qtdPorDose;

    private Integer estoqueAtual;

    private String diasSemana;

    private boolean ativo;

    private LocalDateTime dtCriacao;

    private List<HorarioResponseDTO> horarios;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HorarioResponseDTO {

        private long idHorario;

        private String hora;
    }
}
