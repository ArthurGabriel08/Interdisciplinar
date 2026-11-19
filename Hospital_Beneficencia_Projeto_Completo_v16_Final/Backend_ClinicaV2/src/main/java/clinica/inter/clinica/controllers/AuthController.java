package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.PacienteEntity;
import clinica.inter.clinica.entities.PessoaEntity;
import clinica.inter.clinica.repositories.PacienteRepository;
import clinica.inter.clinica.repositories.PessoaRepository;
import clinica.inter.clinica.security.AccessGuard;
import clinica.inter.clinica.security.AuthUser;
import clinica.inter.clinica.security.TokenService;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final int SENHA_MINIMA = 6;

    private final PessoaRepository pessoaRepository;
    private final PacienteRepository pacienteRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final AccessGuard guard;

    public AuthController(PessoaRepository pessoaRepository,
                          PacienteRepository pacienteRepository,
                          PasswordEncoder passwordEncoder,
                          TokenService tokenService,
                          AccessGuard guard) {
        this.pessoaRepository = pessoaRepository;
        this.pacienteRepository = pacienteRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.guard = guard;
    }

    /**
     * O front envia "Masculino", "Feminino" ou "Outro", mas o banco guarda 1 letra (M, F ou O).
     * Qualquer valor desconhecido vira "O".
     */
    public static String normalizarSexo(String sexo) {
        if (sexo == null || sexo.isBlank()) return null;
        char primeira = Character.toUpperCase(sexo.trim().charAt(0));
        return (primeira == 'M' || primeira == 'F') ? String.valueOf(primeira) : "O";
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credenciais) {
        String email = credenciais.get("email");
        String senha = credenciais.get("senha");
        if (email == null || email.isBlank() || senha == null || senha.isBlank()) {
            return mensagem(HttpStatus.BAD_REQUEST, "E-mail e senha são obrigatórios.");
        }

        // Mesma resposta para "e-mail inexistente" e "senha errada" (não revela quais e-mails existem)
        Optional<PessoaEntity> opt = pessoaRepository.findByEmail(email.trim());
        if (opt.isEmpty() || !passwordEncoder.matches(senha, opt.get().getSenha())) {
            return mensagem(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos.");
        }

        PessoaEntity pessoa = opt.get();
        String perfil = pessoa.getPerfil() != null ? pessoa.getPerfil().toUpperCase() : "PACIENTE";

        Map<String, Object> resp = new HashMap<>();
        resp.put("id", pessoa.getId());
        resp.put("nome", pessoa.getNome());
        resp.put("email", pessoa.getEmail());
        resp.put("cpf", pessoa.getCpf());
        resp.put("telefone", pessoa.getTelefone());
        resp.put("perfil", perfil);
        resp.put("token", tokenService.gerar(pessoa.getId(), perfil));
        return ResponseEntity.ok(resp);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> dados) {
        String email = texto(dados.get("email"));
        String cpf = texto(dados.get("cpf"));
        String nome = texto(dados.get("nome"));
        String senha = dados.get("senha") instanceof String s ? s : null;
        String telefone = texto(dados.get("telefone"));
        String sexo = texto(dados.get("sexo"));
        String dataNasc = texto(dados.get("dataNascimento"));

        if (email == null || cpf == null || nome == null || senha == null) {
            return mensagem(HttpStatus.BAD_REQUEST, "Nome, CPF, E-mail e Senha são obrigatórios.");
        }
        if (senha.length() < SENHA_MINIMA) {
            return mensagem(HttpStatus.BAD_REQUEST,
                "A senha deve ter no mínimo " + SENHA_MINIMA + " caracteres.");
        }
        if (pessoaRepository.findByEmail(email).isPresent()) {
            return mensagem(HttpStatus.BAD_REQUEST, "E-mail já cadastrado no sistema.");
        }
        if (pessoaRepository.findByCpf(cpf).isPresent()) {
            return mensagem(HttpStatus.BAD_REQUEST, "CPF já cadastrado no sistema.");
        }

        PacienteEntity paciente = new PacienteEntity();
        paciente.setNome(nome);
        paciente.setCpf(cpf);
        paciente.setEmail(email);
        paciente.setTelefone(telefone);
        paciente.setSenha(passwordEncoder.encode(senha));
        paciente.setPerfil("PACIENTE"); // cadastro público é SEMPRE paciente
        paciente.setSexo(sexo != null ? normalizarSexo(sexo) : "O");
        if (dataNasc != null) {
            try {
                paciente.setDataNascimento(LocalDate.parse(dataNasc));
            } catch (Exception e) {
                return mensagem(HttpStatus.BAD_REQUEST, "Data de nascimento inválida.");
            }
        }

        PacienteEntity salvo = pacienteRepository.save(paciente);
        Map<String, Object> resp = new HashMap<>();
        resp.put("id", salvo.getId());
        resp.put("nome", salvo.getNome());
        resp.put("email", salvo.getEmail());
        resp.put("perfil", "PACIENTE");
        resp.put("mensagem", "Cadastro realizado com sucesso.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    /**
     * Recuperação de senha: o e-mail só é aceito junto com o CPF do titular.
     * Sem essa confirmação, qualquer pessoa trocaria a senha de qualquer conta.
     */
    @PostMapping("/esqueci-senha")
    public ResponseEntity<?> esqueciSenha(@RequestBody Map<String, String> dados) {
        String email = dados.get("email");
        String cpf = dados.get("cpf");
        String novaSenha = dados.get("novaSenha");
        if (email == null || email.isBlank() || cpf == null || cpf.isBlank()
                || novaSenha == null || novaSenha.isBlank()) {
            return mensagem(HttpStatus.BAD_REQUEST, "E-mail, CPF e nova senha são obrigatórios.");
        }
        if (novaSenha.length() < SENHA_MINIMA) {
            return mensagem(HttpStatus.BAD_REQUEST,
                "A senha deve ter no mínimo " + SENHA_MINIMA + " caracteres.");
        }

        Optional<PessoaEntity> opt = pessoaRepository.findByEmail(email.trim());
        if (opt.isEmpty() || !apenasDigitos(opt.get().getCpf()).equals(apenasDigitos(cpf))) {
            // Mesma resposta nos dois casos: não revela se o e-mail existe
            return mensagem(HttpStatus.BAD_REQUEST, "Não foi possível validar o e-mail e o CPF informados.");
        }

        PessoaEntity pessoa = opt.get();
        pessoa.setSenha(passwordEncoder.encode(novaSenha));
        pessoaRepository.save(pessoa);
        return ResponseEntity.ok(Map.of("mensagem", "Senha redefinida com sucesso."));
    }

    /** Troca de senha do usuário logado: exige a senha atual (conferida com BCrypt). */
    @PostMapping("/alterar-senha")
    public ResponseEntity<?> alterarSenha(@RequestBody Map<String, String> dados) {
        AuthUser usuario = guard.atual();
        String senhaAtual = dados.get("senhaAtual");
        String novaSenha = dados.get("novaSenha");
        if (senhaAtual == null || senhaAtual.isBlank() || novaSenha == null || novaSenha.isBlank()) {
            return mensagem(HttpStatus.BAD_REQUEST, "Informe a senha atual e a nova senha.");
        }
        if (novaSenha.length() < SENHA_MINIMA) {
            return mensagem(HttpStatus.BAD_REQUEST,
                "A senha deve ter no mínimo " + SENHA_MINIMA + " caracteres.");
        }
        Optional<PessoaEntity> opt = pessoaRepository.findById(usuario.id());
        if (opt.isEmpty() || !passwordEncoder.matches(senhaAtual, opt.get().getSenha())) {
            return mensagem(HttpStatus.BAD_REQUEST, "A senha atual informada está incorreta.");
        }
        PessoaEntity pessoa = opt.get();
        pessoa.setSenha(passwordEncoder.encode(novaSenha));
        pessoaRepository.save(pessoa);
        return ResponseEntity.ok(Map.of("mensagem", "Senha alterada com sucesso."));
    }

    private static ResponseEntity<Map<String, String>> mensagem(HttpStatus status, String texto) {
        return ResponseEntity.status(status).body(Map.of("mensagem", texto));
    }

    private static String texto(Object valor) {
        if (!(valor instanceof String s)) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private static String apenasDigitos(String valor) {
        return valor == null ? "" : valor.replaceAll("\\D", "");
    }
}
