package br.com.lembrei.lembrei_api.dto;

import br.com.lembrei.lembrei_api.model.TipoItem;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class RotinaDTO {
    private RotinaDTO() {}

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ConfirmacaoRequestDTO {

        private LocalDateTime dtTomada;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GerarRotinaRequestDTO {

        @NotNull
        private LocalDate inicio;

        @NotNull
        private LocalDate fim;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeracaoResponseDTO {

        private LocalDate inicio;

        private LocalDate fim;

        private int quantidadeGerada;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegistroResponseDTO {

        private long idRegistro;

        private long idItem;

        private long idHorario;

        private String nome;

        private TipoItem tipo;

        private String dose;

        private int qtdPorDose;

        private LocalDateTime dtPrevista;

        private LocalDateTime dtTomada;

        private String status;
    }
}
