package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.Consulta;
import clinica.inter.clinica.entities.Pagamento;
import clinica.inter.clinica.security.AccessGuard;
import clinica.inter.clinica.services.ConsultaService;
import clinica.inter.clinica.services.PagamentoService;
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
@RequestMapping("/pagamentos")
public class PagamentoController {

    private final PagamentoService pagamentoService;
    private final ConsultaService consultaService;
    private final AccessGuard guard;

    public PagamentoController(PagamentoService pagamentoService, ConsultaService consultaService,
                               AccessGuard guard) {
        this.pagamentoService = pagamentoService;
        this.consultaService = consultaService;
        this.guard = guard;
    }

    @GetMapping
    public ResponseEntity<List<Pagamento>> listarTodos() {
        return ResponseEntity.ok(pagamentoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Pagamento> buscarPorId(@PathVariable Integer id) {
        return pagamentoService.buscarPorId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /** O paciente só registra pagamento de consulta que é dele; o valor vem da própria consulta. */
    @PostMapping
    public ResponseEntity<Pagamento> salvar(@RequestBody Pagamento pagamento) {
        if (guard.ehPaciente()) {
            if (pagamento.getConsulta() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a consulta do pagamento.");
            }
            Consulta consulta = consultaService.buscarPorId(pagamento.getConsulta().getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Consulta não encontrada."));
            if (consulta.getPaciente() == null || consulta.getPaciente().getId() != guard.atual().id()) {
                throw guard.negado("Você só pode pagar as suas próprias consultas.");
            }
            pagamento.setValor(consulta.getValor());
        }
        pagamento.setId(0);
        return ResponseEntity.ok(pagamentoService.salvar(pagamento));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Pagamento> atualizar(@PathVariable Integer id, @RequestBody Pagamento pagamento) {
        Pagamento existente = pagamentoService.buscarPorId(id).orElse(null);
        if (existente == null) {
            return ResponseEntity.notFound().build();
        }
        if (pagamento.getValor() != null) existente.setValor(pagamento.getValor());
        if (pagamento.getData_pagamento() != null) existente.setData_pagamento(pagamento.getData_pagamento());
        if (pagamento.getStatus() != null) existente.setStatus(pagamento.getStatus());
        if (pagamento.getFormaPagamento() != null) existente.setFormaPagamento(pagamento.getFormaPagamento());
        if (pagamento.getConsulta() != null) existente.setConsulta(pagamento.getConsulta());
        return ResponseEntity.ok(pagamentoService.salvar(existente));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        if (pagamentoService.buscarPorId(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        pagamentoService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}
