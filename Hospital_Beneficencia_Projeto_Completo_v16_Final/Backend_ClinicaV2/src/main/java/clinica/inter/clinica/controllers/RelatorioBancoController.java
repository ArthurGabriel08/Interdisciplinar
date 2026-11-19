package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.Consulta;
import clinica.inter.clinica.entities.MedicoEntity;
import clinica.inter.clinica.security.AccessGuard;
import clinica.inter.clinica.services.ConsultaService;
import clinica.inter.clinica.services.MedicoService;
import clinica.inter.clinica.services.RelatorioBancoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller REST para exposição e acionamento das Views, Procedures
 * e Funções do SQL Server através do backend Spring Boot.
 */
@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/api/database")
public class RelatorioBancoController {

    private final RelatorioBancoService relatorioService;
    private final ConsultaService consultaService;
    private final MedicoService medicoService;
    private final AccessGuard guard;

    public RelatorioBancoController(RelatorioBancoService relatorioService,
                                    ConsultaService consultaService, MedicoService medicoService,
                                    AccessGuard guard) {
        this.relatorioService = relatorioService;
        this.consultaService = consultaService;
        this.medicoService = medicoService;
        this.guard = guard;
    }

    /**
     * Carrega a consulta e garante que o usuário logado é parte dela
     * (paciente ou médico da consulta). O admin passa sempre.
     */
    private Consulta carregarConsultaDoUsuario(Integer idConsulta) {
        Consulta c = consultaService.buscarPorId(idConsulta).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Consulta não encontrada."));
        if (guard.ehAdmin()) return c;
        int usuarioId = guard.atual().id();
        boolean ehParte = (c.getPaciente() != null && c.getPaciente().getId() == usuarioId)
            || (c.getMedico() != null && c.getMedico().getId() == usuarioId);
        if (!ehParte) {
            throw guard.negado("Você só pode operar sobre as suas próprias consultas.");
        }
        return c;
    }

    // --- VIEWS ---
    @GetMapping("/views/consultas-detalhadas")
    public ResponseEntity<List<Map<String, Object>>> getConsultasDetalhadas() {
        return ResponseEntity.ok(relatorioService.obterConsultasDetalhadas());
    }

    @GetMapping("/views/faturamento-especialidade")
    public ResponseEntity<List<Map<String, Object>>> getFaturamentoEspecialidade() {
        return ResponseEntity.ok(relatorioService.obterFaturamentoPorEspecialidade());
    }

    @GetMapping("/views/agenda-disponivel")
    public ResponseEntity<List<Map<String, Object>>> getAgendaDisponivel() {
        return ResponseEntity.ok(relatorioService.obterAgendaDisponivel());
    }

    @GetMapping("/views/relatorio-diario")
    public ResponseEntity<List<Map<String, Object>>> getRelatorioDiario() {
        return ResponseEntity.ok(relatorioService.obterRelatorioDiario());
    }

    // --- PROCEDURES ---

    /** agendar_consulta: o valor SEMPRE vem do cadastro do médico. */
    @PostMapping("/procedures/agendar")
    public ResponseEntity<Map<String, Object>> executarAgendamento(
            @RequestParam Integer idPaciente,
            @RequestParam Integer idMedico,
            @RequestParam String dataHora) {
        guard.exigirProprio(idPaciente); // paciente só agenda para si mesmo
        LocalDateTime quando;
        try {
            quando = LocalDateTime.parse(dataHora);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                "Data e hora inválidas. Use o formato AAAA-MM-DDTHH:MM.");
        }
        MedicoEntity medico = medicoService.buscarPorId(idMedico).orElseThrow(
            () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Médico não encontrado."));
        Integer idConsulta = relatorioService.executarAgendamento(
            idPaciente, idMedico, quando, medico.getValorConsulta());
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "sucesso");
        resp.put("idConsulta", idConsulta);
        resp.put("mensagem", "Consulta agendada pela procedure agendar_consulta no SQL Server.");
        return ResponseEntity.ok(resp);
    }

    /** registrar_pagamento: o paciente paga sempre o valor da própria consulta. */
    @PostMapping("/procedures/pagar")
    public ResponseEntity<Map<String, String>> executarPagamento(
            @RequestParam Integer idConsulta,
            @RequestParam(required = false) BigDecimal valor,
            @RequestParam String formaPagamento) {
        Consulta consulta = carregarConsultaDoUsuario(idConsulta);
        BigDecimal valorFinal = (guard.ehAdmin() && valor != null) ? valor : consulta.getValor();
        relatorioService.executarPagamento(idConsulta, valorFinal, formaPagamento);
        Map<String, String> resp = new HashMap<>();
        resp.put("status", "sucesso");
        resp.put("mensagem", "Pagamento registrado pela procedure registrar_pagamento no SQL Server.");
        return ResponseEntity.ok(resp);
    }

    /** cancelar_agendamento (procedure do script original) */
    @PostMapping("/procedures/cancelar")
    public ResponseEntity<Map<String, Object>> executarCancelamento(
            @RequestParam Integer idConsulta,
            @RequestParam(defaultValue = "Cancelado pelo usuário") String motivo) {
        carregarConsultaDoUsuario(idConsulta);
        Map<String, Object> resultado = relatorioService.executarCancelamento(idConsulta, motivo);
        Object sucesso = resultado.get("sucesso");
        boolean cancelou = Boolean.TRUE.equals(sucesso) || "1".equals(String.valueOf(sucesso));
        if (!cancelou) {
            Object mensagem = resultado.get("mensagem");
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                mensagem != null ? mensagem.toString() : "Não foi possível cancelar o agendamento.");
        }
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "sucesso");
        resp.put("mensagem", resultado.get("mensagem"));
        return ResponseEntity.ok(resp);
    }

    // --- FUNCTIONS ---
    @GetMapping("/functions/total-gasto-paciente/{idPaciente}")
    public ResponseEntity<Map<String, Object>> getTotalGastoPaciente(@PathVariable Integer idPaciente) {
        guard.exigirProprio(idPaciente);
        Double total = relatorioService.calcularTotalGastoPaciente(idPaciente);
        Map<String, Object> resp = new HashMap<>();
        resp.put("idPaciente", idPaciente);
        resp.put("totalGasto", total != null ? total : 0.0);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/functions/consultas-periodo")
    public ResponseEntity<List<Map<String, Object>>> getConsultasPorPeriodo(
            @RequestParam String dataInicio,
            @RequestParam String dataFim) {
        return ResponseEntity.ok(relatorioService.listarConsultasPorPeriodo(dataInicio, dataFim));
    }

    @GetMapping("/functions/produtividade-medico/{idMedico}")
    public ResponseEntity<List<Map<String, Object>>> getProdutividadeMedico(@PathVariable Integer idMedico) {
        guard.exigirProprio(idMedico);
        return ResponseEntity.ok(relatorioService.obterProdutividadeMedico(idMedico));
    }
}
