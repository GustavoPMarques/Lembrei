package br.com.lembrei.lembrei_api.util;

import br.com.lembrei.lembrei_api.exception.ApiException;
import java.time.Clock;
import java.time.LocalDate;

public final class Validacoes {
    private Validacoes() {}

    public static void validarPaginacao(int pagina, int tamanho) {
        if (pagina < 0 || pagina > 100000 || tamanho < 1 || tamanho > 100) {
            throw new ApiException(400, "Pagina deve estar entre 0 e 100000; tamanho entre 1 e 100.");
        }
    }

    public static LocalDate dataOuHoje(LocalDate data, Clock clock) {
        LocalDate valor = data == null ? LocalDate.now(clock) : data;
        if (valor.getYear() < 1900 || valor.getYear() > 2100) {
            throw new ApiException(422, "Data fora do intervalo suportado (1900 a 2100).");
        }
        return valor;
    }
}
