package br.com.lembrei.lembrei_api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class EstoqueDTO {
    private EstoqueDTO() {}

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReposicaoRequestDTO {

        @NotNull
        @Min(1)
        @Max(99999)
        private Integer quantidade;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EstoqueResponseDTO {

        private long idItem;

        private String nome;

        private int estoqueAtual;

        private int consumoSemanal;

        private LocalDateTime primeiraDoseSemSaldo;

        private boolean precisaReposicao;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MovimentoResponseDTO {

        private long idMovimento;

        private long idItem;

        private Long idRegistro;

        private String tipo;

        private int quantidade;

        private LocalDateTime dtMovimento;
    }
}
