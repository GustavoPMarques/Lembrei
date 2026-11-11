package br.com.lembrei.lembrei_api.dto;

import br.com.lembrei.lembrei_api.model.TipoItem;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class RelatorioDTO {
    private RelatorioDTO() {}

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdesaoResponseDTO {

        private long idItem;

        private String nome;

        private TipoItem tipo;

        private int totalPrevisto;

        private int totalTomado;

        private int totalEsquecido;

        private int totalPendente;

        private BigDecimal percentualAdesao;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelatorioResponseDTO {

        private LocalDate inicioSemana;

        private LocalDate fimSemana;

        private List<AdesaoResponseDTO> itens;
    }
}
