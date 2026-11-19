package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.PacienteEntity;
import clinica.inter.clinica.security.AccessGuard;
import clinica.inter.clinica.services.PacienteService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/pacientes")
public class PacienteController {

    private final PacienteService pacienteService;
    private final PasswordEncoder passwordEncoder;
    private final AccessGuard guard;

    public PacienteController(PacienteService pacienteService, PasswordEncoder passwordEncoder,
                              AccessGuard guard) {
        this.pacienteService = pacienteService;
        this.passwordEncoder = passwordEncoder;
        this.guard = guard;
    }

    /** Lista completa: somente ADMIN (regra no SecurityConfig). */
    @GetMapping
    public ResponseEntity<List<PacienteEntity>> listarTodos() {
        return ResponseEntity.ok(pacienteService.listarTodos());
    }

    /** ADMIN vê qualquer paciente; o paciente vê apenas o próprio cadastro. */
    @GetMapping("/{id}")
    public ResponseEntity<PacienteEntity> buscarPorId(@PathVariable Integer id) {
        guard.exigirProprio(id);
        return pacienteService.buscarPorId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Cadastro feito pelo admin: perfil fixo PACIENTE e senha sempre gravada com BCrypt. */
    @PostMapping
    public ResponseEntity<PacienteEntity> salvar(@RequestBody PacienteEntity paciente) {
        if (paciente.getSenha() == null || paciente.getSenha().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Informe uma senha com no mínimo 6 caracteres.");
        }
        paciente.setId(0);
        paciente.setPerfil("PACIENTE");
        paciente.setSexo(AuthController.normalizarSexo(paciente.getSexo()));
        paciente.setSenha(passwordEncoder.encode(paciente.getSenha()));
        return ResponseEntity.ok(pacienteService.salvar(paciente));
    }

    /**
     * ADMIN edita qualquer paciente; o paciente edita só o próprio cadastro.
     * Só os campos editáveis são alterados: senha, perfil e CPF nunca mudam por aqui.
     */
    @PutMapping("/{id}")
    public ResponseEntity<PacienteEntity> atualizar(@PathVariable Integer id,
            @RequestBody PacienteEntity dados) {
        guard.exigirProprio(id);
        return pacienteService.buscarPorId(id).map(paciente -> {
            if (dados.getNome() != null) paciente.setNome(dados.getNome());
            if (dados.getEmail() != null) paciente.setEmail(dados.getEmail());
            if (dados.getTelefone() != null) paciente.setTelefone(dados.getTelefone());
            if (dados.getSexo() != null) paciente.setSexo(AuthController.normalizarSexo(dados.getSexo()));
            if (dados.getDataNascimento() != null) paciente.setDataNascimento(dados.getDataNascimento());
            return ResponseEntity.ok(pacienteService.salvar(paciente));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        if (pacienteService.buscarPorId(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        pacienteService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
