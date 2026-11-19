package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.MedicoEntity;
import clinica.inter.clinica.security.AccessGuard;
import clinica.inter.clinica.services.MedicoService;
import java.math.BigDecimal;
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
@RequestMapping("/medicos")
public class MedicoController {

    /** Dados do médico que qualquer usuário logado pode ver (sem CPF, e-mail ou telefone). */
    public record EspecialidadePublica(int id, String descricao) { }

    public record MedicoPublico(int id, String nome, String numeroRegistro, String descricao,
                                BigDecimal valorConsulta, String turno,
                                List<EspecialidadePublica> especialidades) { }

    private final MedicoService medicoService;
    private final PasswordEncoder passwordEncoder;
    private final AccessGuard guard;

    public MedicoController(MedicoService medicoService, PasswordEncoder passwordEncoder,
                            AccessGuard guard) {
        this.medicoService = medicoService;
        this.passwordEncoder = passwordEncoder;
        this.guard = guard;
    }

    /** Catálogo de médicos para o agendamento (paciente) e para as telas do médico. */
    @GetMapping("/publico")
    public ResponseEntity<List<MedicoPublico>> listarPublico() {
        List<MedicoPublico> lista = medicoService.listarTodos().stream()
            .map(m -> new MedicoPublico(m.getId(), m.getNome(), m.getNumeroRegistro(), m.getDescricao(),
                m.getValorConsulta(), m.getTurno(),
                m.getEspecialidades().stream()
                    .map(e -> new EspecialidadePublica(e.getId(), e.getDescricao()))
                    .toList()))
            .toList();
        return ResponseEntity.ok(lista);
    }

    @GetMapping
    public ResponseEntity<List<MedicoEntity>> listarTodos() {
        return ResponseEntity.ok(medicoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MedicoEntity> buscarPorId(@PathVariable Integer id) {
        return medicoService.buscarPorId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** Cadastro feito pelo admin: perfil fixo MEDICO e senha sempre gravada com BCrypt. */
    @PostMapping
    public ResponseEntity<MedicoEntity> salvar(@RequestBody MedicoEntity medico) {
        if (medico.getSenha() == null || medico.getSenha().length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Informe uma senha com no mínimo 6 caracteres.");
        }
        medico.setId(0);
        medico.setPerfil("MEDICO");
        medico.setSenha(passwordEncoder.encode(medico.getSenha()));
        return ResponseEntity.ok(medicoService.salvar(medico));
    }

    /**
     * Atualiza somente os campos editáveis do registro existente.
     * Senha, perfil, CPF, agenda e consultas nunca são sobrescritos por esta rota.
     */
    @PutMapping("/{id}")
    public ResponseEntity<MedicoEntity> atualizar(@PathVariable Integer id,
            @RequestBody MedicoEntity dados) {
        guard.exigirProprio(id); // médico só edita o próprio perfil; admin edita qualquer um
        boolean admin = guard.ehAdmin();
        return medicoService.buscarPorId(id).map(medico -> {
            if (dados.getNome() != null) medico.setNome(dados.getNome());
            if (dados.getEmail() != null) medico.setEmail(dados.getEmail());
            if (dados.getTelefone() != null) medico.setTelefone(dados.getTelefone());
            if (dados.getDescricao() != null) medico.setDescricao(dados.getDescricao());
            // O médico define o próprio valor de consulta e pode atualizar seu CRM
            if (dados.getValorConsulta() != null) medico.setValorConsulta(dados.getValorConsulta());
            if (dados.getNumeroRegistro() != null && !dados.getNumeroRegistro().isBlank()) {
                medico.setNumeroRegistro(dados.getNumeroRegistro().trim());
            }
            // Turno e especialidades só o admin altera
            if (admin) {
                if (dados.getTurno() != null) medico.setTurno(dados.getTurno());
                if (dados.getEspecialidades() != null) medico.setEspecialidades(dados.getEspecialidades());
            }
            return ResponseEntity.ok(medicoService.salvar(medico));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        if (medicoService.buscarPorId(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        medicoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
