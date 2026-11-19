package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.Consulta;
import clinica.inter.clinica.entities.MedicoEntity;
import clinica.inter.clinica.security.AccessGuard;
import clinica.inter.clinica.services.ConsultaService;
import clinica.inter.clinica.services.MedicoService;
import java.util.List;
import org.springframework.http.HttpStatus;
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
import org.springframework.web.server.ResponseStatusException;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/consultas")
public class ConsultaController {

    private final ConsultaService consultaService;
    private final MedicoService medicoService;
    private final AccessGuard guard;

    public ConsultaController(ConsultaService consultaService, MedicoService medicoService,
                              AccessGuard guard) {
        this.consultaService = consultaService;
        this.medicoService = medicoService;
        this.guard = guard;
    }

    @GetMapping
    public ResponseEntity<List<Consulta>> listarTodos() {
        return ResponseEntity.ok(consultaService.listarTodos());
    }

    /**
     * Consultas do usuário logado: o paciente vê as suas, o médico vê as dele
     * e o admin vê todas.
     */
    @GetMapping("/minhas")
    public ResponseEntity<List<Consulta>> listarMinhas() {
        int usuarioId = guard.atual().id();
        if (guard.ehAdmin()) {
            return ResponseEntity.ok(consultaService.listarTodos());
        }
        return ResponseEntity.ok(guard.ehPaciente()
            ? consultaService.listarPorPaciente(usuarioId)
            : consultaService.listarPorMedico(usuarioId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Consulta> buscarPorId(@PathVariable Integer id) {
        return consultaService.buscarPorId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * ADMIN cadastra livremente. PACIENTE só agenda para si mesmo, e o valor vem sempre
     * do cadastro do médico (o paciente não define preço nem status).
     */
    @PostMapping
    public ResponseEntity<Consulta> salvar(@RequestBody Consulta consulta) {
        if (guard.ehPaciente()) {
            if (consulta.getPaciente() == null || consulta.getPaciente().getId() != guard.atual().id()) {
                throw guard.negado("Você só pode agendar consultas para o seu próprio cadastro.");
            }
            if (consulta.getMedico() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o médico da consulta.");
            }
            MedicoEntity medico = medicoService.buscarPorId(consulta.getMedico().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Médico não encontrado."));
            consulta.setValor(medico.getValorConsulta());
            consulta.setStatus("pendente");
        }
        consulta.setId(0);
        return ResponseEntity.ok(consultaService.salvar(consulta));
    }

    /**
     * ADMIN altera tudo. PACIENTE e MÉDICO só mexem nas consultas em que são parte:
     * o paciente altera apenas o status (ex.: cancelar); o médico, status e observações.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Consulta> atualizar(@PathVariable Integer id, @RequestBody Consulta dados) {
        Consulta existente = consultaService.buscarPorId(id).orElse(null);
        if (existente == null) {
            return ResponseEntity.notFound().build();
        }
        if (guard.ehAdmin()) {
            if (dados.getData_hora() != null) existente.setData_hora(dados.getData_hora());
            if (dados.getStatus() != null) existente.setStatus(dados.getStatus());
            if (dados.getValor() != null) existente.setValor(dados.getValor());
            if (dados.getObservacoes() != null) existente.setObservacoes(dados.getObservacoes());
            if (dados.getPaciente() != null) existente.setPaciente(dados.getPaciente());
            if (dados.getMedico() != null) existente.setMedico(dados.getMedico());
            return ResponseEntity.ok(consultaService.salvar(existente));
        }

        int usuarioId = guard.atual().id();
        boolean ehParte = guard.ehPaciente()
            ? existente.getPaciente() != null && existente.getPaciente().getId() == usuarioId
            : existente.getMedico() != null && existente.getMedico().getId() == usuarioId;
        if (!ehParte) {
            throw guard.negado("Você só pode alterar as suas próprias consultas.");
        }
        if (dados.getStatus() != null) existente.setStatus(dados.getStatus());
        if (guard.ehMedico() && dados.getObservacoes() != null) existente.setObservacoes(dados.getObservacoes());
        return ResponseEntity.ok(consultaService.salvar(existente));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        if (consultaService.buscarPorId(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        consultaService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
