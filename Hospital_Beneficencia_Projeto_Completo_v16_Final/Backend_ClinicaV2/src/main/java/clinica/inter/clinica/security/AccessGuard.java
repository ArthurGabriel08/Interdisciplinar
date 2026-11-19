package clinica.inter.clinica.security;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * Regras de posse: garante que paciente/médico só mexam nos próprios dados.
 * O ADMIN pode tudo.
 */
@Component
public class AccessGuard {

    public AuthUser atual() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof AuthUser usuario) {
            return usuario;
        }
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
            "Sessão inválida ou expirada. Faça login novamente.");
    }

    public boolean ehAdmin() {
        return "ADMIN".equals(atual().perfil());
    }

    public boolean ehPaciente() {
        return "PACIENTE".equals(atual().perfil());
    }

    public boolean ehMedico() {
        return "MEDICO".equals(atual().perfil());
    }

    /** Admin passa sempre; os demais só se o id informado for o deles. */
    public void exigirProprio(int idDono) {
        AuthUser usuario = atual();
        if (!"ADMIN".equals(usuario.perfil()) && usuario.id() != idDono) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Acesso negado: você só pode acessar os seus próprios dados.");
        }
    }

    public ResponseStatusException negado(String mensagem) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, mensagem);
    }
}
