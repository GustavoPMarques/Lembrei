package br.com.lembrei.lembrei_api.dto;

import br.com.lembrei.lembrei_api.model.TipoItem;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ItemRequestDTO {

    @NotNull
    private TipoItem tipo;

    @NotBlank
    @Size(max = 80)
    private String nome;

    @Size(max = 40)
    private String dose;

    @NotNull
    @Min(1)
    @Max(999)
    private Integer qtdPorDose;

    @Min(0)
    @Max(99999)
    private Integer estoqueInicial;

    @NotNull
    @Pattern(regexp = "[01]{7}")
    private String diasSemana;

    @NotNull
    @Size(min = 1, max = 24)
    private List<@NotNull @Pattern(regexp = "([01][0-9]|2[0-3]):[0-5][0-9]") String> horarios;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AtivoRequestDTO {

        @NotNull
        private Boolean ativo;
    }
}
