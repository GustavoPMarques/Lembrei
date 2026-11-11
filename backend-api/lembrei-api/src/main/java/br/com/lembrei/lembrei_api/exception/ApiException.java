package br.com.lembrei.lembrei_api.exception;

import lombok.Getter;

@Getter
public class ApiException extends RuntimeException {
    private final int status;

    public ApiException(int status, String mensagem) {
        super(mensagem);
        this.status = status;
    }

    public static ApiException naoEncontrado(String recurso) {
        return new ApiException(404, recurso + " nao encontrado para este dispositivo.");
    }
}
