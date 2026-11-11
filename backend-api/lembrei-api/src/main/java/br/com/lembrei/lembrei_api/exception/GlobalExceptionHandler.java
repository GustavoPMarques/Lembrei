package br.com.lembrei.lembrei_api.exception;

import java.sql.SQLException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> negocio(ApiException ex) {
        return erro(ex.getStatus(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validacao(MethodArgumentNotValidException ex) {
        Map<String, String> campos = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors().forEach(e -> campos.put(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.badRequest().body(Map.of("status", 400, "mensagem", "Dados invalidos.", "campos", campos));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
            ServletRequestBindingException.class, HandlerMethodValidationException.class})
    ResponseEntity<?> formato(Exception ex) {
        return erro(400, "Requisicao invalida. Confira UUID, campos, limites, datas ISO e o cabecalho X-Dispositivo-Id.");
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<?> banco(DataAccessException ex) {
        for (Throwable causa = ex; causa != null; causa = causa.getCause()) {
            if (causa instanceof SQLException sql) {
                int codigo = sql.getErrorCode();
                return switch (codigo) {
                    case 20011 -> erro(404, "Usuario nao encontrado para este dispositivo.");
                    case 20013 -> erro(404, "Registro nao encontrado para este dispositivo.");
                    case 20017, 20031 -> erro(404, "Item nao encontrado para este dispositivo.");
                    case 20024 -> erro(409, "Estoque insuficiente. Reponha antes de confirmar.");
                    case 20016 -> erro(409, "Reposicao excede o limite de estoque (99999).");
                    case 20020, 20021 -> erro(409, "Uma ocorrencia confirmada nao pode ser alterada.");
                    case 20022 -> erro(422, "Nao e permitido confirmar uma ocorrencia futura.");
                    case 20010, 20012, 20014, 20015, 20018, 20023, 20030, 20032, 20034 ->
                        erro(422, "Operacao rejeitada pelas regras do banco. Confira os dados enviados.");
                    case 1, 2290, 2291, 2292, 1438, 12899 -> erro(409, "Operacao conflita com os dados ou limites existentes.");
                    default -> falhaBanco(ex);
                };
            }
        }
        if (ex instanceof DataIntegrityViolationException) return erro(409, "Conflito com os dados existentes.");
        return falhaBanco(ex);
    }

    private ResponseEntity<?> falhaBanco(Exception ex) {
        log.error("Falha no acesso ao Oracle ({})", ex.getClass().getSimpleName());
        return erro(503, "Nao foi possivel acessar o Oracle. Tente novamente mais tarde.");
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<?> inesperado(Exception ex) {
        if (ex instanceof ErrorResponse erroHttp) {
            return erro(erroHttp.getStatusCode().value(), "Requisicao nao suportada. Confira o caminho, metodo e Content-Type.");
        }
        log.error("Falha interna ({})", ex.getClass().getSimpleName());
        return erro(500, "Erro interno ao processar a operacao.");
    }

    private ResponseEntity<?> erro(int status, String mensagem) {
        return ResponseEntity.status(status).body(Map.of("status", status, "mensagem", mensagem));
    }
}
