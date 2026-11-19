package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.AgendaEntity;
import clinica.inter.clinica.security.AccessGuard;
import clinica.inter.clinica.services.AgendaService;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/agendas")
public class AgendaController {

    private final AgendaService agendaService;
    private final AccessGuard guard;

    public AgendaController(AgendaService agendaService, AccessGuard guard) {
        this.agendaService = agendaService;
        this.guard = guard;
    }

    @GetMapping
    public ResponseEntity<List<AgendaEntity>> listarTodos() {
        return ResponseEntity.ok(agendaService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgendaEntity> buscarPorId(@PathVariable Integer id) {
        return agendaService.buscarPorId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** O médico só cria horários na própria agenda; o admin cria para qualquer médico. */
    @PostMapping
    public ResponseEntity<AgendaEntity> salvar(@RequestBody AgendaEntity agenda) {
        if (guard.ehMedico()
                && (agenda.getMedico() == null || agenda.getMedico().getId() != guard.atual().id())) {
            throw guard.negado("Você só pode cadastrar horários na sua própria agenda.");
        }
        agenda.setId(0);
        return ResponseEntity.ok(agendaService.salvar(agenda));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AgendaEntity> atualizar(@PathVariable Integer id, @RequestBody AgendaEntity agenda) {
        AgendaEntity existente = agendaService.buscarPorId(id).orElse(null);
        if (existente == null) {
            return ResponseEntity.notFound().build();
        }
        if (guard.ehMedico()) {
            exigirDonoDaAgenda(existente);
        } else if (agenda.getMedico() != null) {
            existente.setMedico(agenda.getMedico());
        }
        if (agenda.getData() != null) existente.setData(agenda.getData());
        if (agenda.getHora_inicio() != null) existente.setHora_inicio(agenda.getHora_inicio());
        if (agenda.getHora_fim() != null) existente.setHora_fim(agenda.getHora_fim());
        existente.setDisponivel(agenda.isDisponivel());
        if (agenda.getPaciente() != null) existente.setPaciente(agenda.getPaciente());
        return ResponseEntity.ok(agendaService.salvar(existente));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        AgendaEntity existente = agendaService.buscarPorId(id).orElse(null);
        if (existente == null) {
            return ResponseEntity.notFound().build();
        }
        if (guard.ehMedico()) {
            exigirDonoDaAgenda(existente);
        }
        agendaService.excluir(id);
        return ResponseEntity.noContent().build();
    }

    private void exigirDonoDaAgenda(AgendaEntity agenda) {
        if (agenda.getMedico() == null || agenda.getMedico().getId() != guard.atual().id()) {
            throw guard.negado("Você só pode alterar horários da sua própria agenda.");
        }
    }
}
