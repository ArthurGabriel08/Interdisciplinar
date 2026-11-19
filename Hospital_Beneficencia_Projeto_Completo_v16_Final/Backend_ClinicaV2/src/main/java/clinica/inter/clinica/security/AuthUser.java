package clinica.inter.clinica.security;

/**
 * Usuário autenticado extraído do token (id da pessoa + perfil).
 */
public record AuthUser(int id, String perfil) {
}
