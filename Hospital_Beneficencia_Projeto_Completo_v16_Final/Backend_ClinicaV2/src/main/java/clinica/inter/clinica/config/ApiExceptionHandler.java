package clinica.inter.clinica.config;

import java.util.Map;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/**
 * Devolve erros no formato {"mensagem": "..."}, que é o que o front-end exibe nos avisos.
 * Inclui as validações do SQL Server (triggers, procedures e constraints), que antes
 * apareciam como um "Erro 500" genérico.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> tratar(ResponseStatusException ex) {
        String mensagem = ex.getReason() != null ? ex.getReason() : "Não foi possível concluir a operação.";
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("mensagem", mensagem));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String, String>> tratarBanco(DataAccessException ex) {
        Throwable raiz = ex.getMostSpecificCause();
        String original = raiz != null && raiz.getMessage() != null ? raiz.getMessage() : "";
        String minusculo = original.toLowerCase();

        String mensagem;
        HttpStatus status = HttpStatus.BAD_REQUEST;
        if (minusculo.contains("duplicate key") || minusculo.contains("unique key")) {
            mensagem = "Já existe um registro com esses dados (valor duplicado, como CPF, e-mail ou CRM).";
            status = HttpStatus.CONFLICT;
        } else if (minusculo.contains("reference constraint") || minusculo.contains("foreign key")) {
            mensagem = "Não é possível concluir: este item está vinculado a outros registros.";
            status = HttpStatus.CONFLICT;
        } else if (minusculo.contains("check constraint")) {
            mensagem = "Um dos campos contém um valor não permitido.";
        } else if (minusculo.contains("cannot insert the value null") || minusculo.contains("does not allow nulls")) {
            mensagem = "Preencha todos os campos obrigatórios.";
        } else if (!original.isBlank() && original.length() <= 300) {
            // Mensagens escritas nos triggers/procedures (RAISERROR/THROW) já são amigáveis
            mensagem = original;
            if (ex instanceof DataIntegrityViolationException) {
                status = HttpStatus.CONFLICT;
            }
        } else {
            mensagem = "Não foi possível concluir a operação no banco de dados.";
            status = HttpStatus.INTERNAL_SERVER_ERROR;
        }
        return ResponseEntity.status(status).body(Map.of("mensagem", mensagem));
    }
}
