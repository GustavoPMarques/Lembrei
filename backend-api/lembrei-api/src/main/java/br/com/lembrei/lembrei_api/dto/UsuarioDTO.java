package br.com.lembrei.lembrei_api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public final class UsuarioDTO {
    private UsuarioDTO() {}

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IdentificarRequestDTO {

        @NotNull
        private UUID uuidDispositivo;

        @NotBlank
        @Size(max = 60)
        private String nome;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class NomeRequestDTO {

        @NotBlank
        @Size(max = 60)
        private String nome;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsuarioResponseDTO {

        private long idUsuario;

        private UUID uuidDispositivo;

        private String nome;

        private LocalDateTime dtCriacao;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class IdentificacaoDTO {

        private UsuarioResponseDTO usuario;

        private boolean criado;
    }
}
