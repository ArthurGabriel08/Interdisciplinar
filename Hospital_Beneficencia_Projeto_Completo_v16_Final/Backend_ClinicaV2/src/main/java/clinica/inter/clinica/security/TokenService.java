package clinica.inter.clinica.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Gera e valida tokens de sessão assinados com HMAC-SHA256 (sem dependências extras).
 * Formato: base64url("id|perfil|expiracao") + "." + base64url(assinatura).
 * Qualquer alteração no conteúdo invalida a assinatura; o token expira sozinho.
 */
@Component
public class TokenService {

    private static final Set<String> PERFIS = Set.of("ADMIN", "MEDICO", "PACIENTE");
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64D = Base64.getUrlDecoder();

    private final byte[] segredo;
    private final long validadeSegundos;

    public TokenService(@Value("${app.security.token-secret}") String segredo,
                        @Value("${app.security.token-ttl-minutes:480}") long validadeMinutos) {
        if (segredo == null || segredo.length() < 32) {
            throw new IllegalStateException(
                "app.security.token-secret precisa ter pelo menos 32 caracteres.");
        }
        this.segredo = segredo.getBytes(StandardCharsets.UTF_8);
        this.validadeSegundos = validadeMinutos * 60;
    }

    public String gerar(int id, String perfil) {
        long expira = Instant.now().getEpochSecond() + validadeSegundos;
        String corpo = B64.encodeToString(
            (id + "|" + perfil + "|" + expira).getBytes(StandardCharsets.UTF_8));
        return corpo + "." + B64.encodeToString(assinar(corpo));
    }

    public Optional<AuthUser> validar(String token) {
        try {
            if (token == null) return Optional.empty();
            int ponto = token.indexOf('.');
            if (ponto <= 0 || ponto == token.length() - 1) return Optional.empty();
            String corpo = token.substring(0, ponto);
            byte[] assinaturaRecebida = B64D.decode(token.substring(ponto + 1));
            if (!MessageDigest.isEqual(assinar(corpo), assinaturaRecebida)) return Optional.empty();

            String[] partes = new String(B64D.decode(corpo), StandardCharsets.UTF_8).split("\\|");
            if (partes.length != 3) return Optional.empty();
            int id = Integer.parseInt(partes[0]);
            String perfil = partes[1];
            long expira = Long.parseLong(partes[2]);
            if (!PERFIS.contains(perfil)) return Optional.empty();
            if (Instant.now().getEpochSecond() > expira) return Optional.empty();
            return Optional.of(new AuthUser(id, perfil));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private byte[] assinar(String corpo) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(segredo, "HmacSHA256"));
            return mac.doFinal(corpo.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Falha ao assinar token", e);
        }
    }
}
