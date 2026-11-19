package clinica.inter.clinica.services;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.Time;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.ConnectionCallback;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Serviço responsável pela execução direta das Views, Stored Procedures
 * e Funções (Scalar, Inline e Multi-statement) do SQL Server,
 * atendendo aos requisitos obrigatórios da Etapa 2 e 3 do Projeto FATEC.
 *
 * As chamadas usam os MESMOS parâmetros declarados no script banco_dados_sqlserver.sql.
 */
@Service
public class RelatorioBancoService {

    private final JdbcTemplate jdbcTemplate;

    public RelatorioBancoService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Converte datas e horas do JDBC em texto ISO (sem fuso). Sem isso, o Jackson formata
     * java.sql.Timestamp em UTC e os horários apareceriam 3 horas adiantados no front.
     */
    private List<Map<String, Object>> normalizar(List<Map<String, Object>> linhas) {
        for (Map<String, Object> linha : linhas) {
            linha.replaceAll((chave, valor) -> {
                if (valor instanceof Timestamp t) return t.toLocalDateTime().toString();
                if (valor instanceof java.sql.Date d) return d.toLocalDate().toString();
                if (valor instanceof Time h) return h.toLocalTime().toString();
                return valor;
            });
        }
        return linhas;
    }

    // ==============================================================
    // 1. VIEWS (Consultas Complexas)
    // ==============================================================

    /** View 1: Consulta Detalhada com junção de várias tabelas */
    public List<Map<String, Object>> obterConsultasDetalhadas() {
        return normalizar(jdbcTemplate.queryForList("SELECT * FROM dbo.vw_ConsultasDetalhadas"));
    }

    /** View 2: Faturamento Agregado por Especialidade */
    public List<Map<String, Object>> obterFaturamentoPorEspecialidade() {
        return normalizar(jdbcTemplate.queryForList("SELECT * FROM dbo.vw_FaturamentoPorEspecialidade"));
    }

    /** View 3: Horários vagos dos médicos (view do script original) */
    public List<Map<String, Object>> obterAgendaDisponivel() {
        return normalizar(jdbcTemplate.queryForList("SELECT * FROM dbo.vw_HorariosVagos ORDER BY [data], hora_inicio"));
    }

    /** View 4: Relatório diário - consultas do dia atual (view do script original) */
    public List<Map<String, Object>> obterRelatorioDiario() {
        return normalizar(jdbcTemplate.queryForList("SELECT * FROM dbo.vw_RelatorioDiario ORDER BY data_hora ASC"));
    }

    // ==============================================================
    // 2. STORED PROCEDURES (Transações Programadas)
    // ==============================================================

    /**
     * Procedure 1: agendar_consulta(@p_id_paciente, @p_id_medico, @p_data_hora,
     * @p_valor, @p_novo_id_consulta OUTPUT). Devolve o id da consulta criada.
     */
    public Integer executarAgendamento(Integer idPaciente, Integer idMedico,
                                       LocalDateTime dataHora, BigDecimal valor) {
        return jdbcTemplate.execute((ConnectionCallback<Integer>) (Connection con) -> {
            try (CallableStatement cs = con.prepareCall("{call dbo.agendar_consulta(?, ?, ?, ?, ?)}")) {
                cs.setInt(1, idPaciente);
                cs.setInt(2, idMedico);
                cs.setTimestamp(3, Timestamp.valueOf(dataHora));
                cs.setBigDecimal(4, valor);
                cs.registerOutParameter(5, Types.INTEGER);
                cs.execute();
                return cs.getInt(5);
            }
        });
    }

    /** Procedure 2: registrar_pagamento(@p_id_consulta, @p_forma_pagamento, @p_valor) */
    public void executarPagamento(Integer idConsulta, BigDecimal valor, String formaPagamento) {
        jdbcTemplate.update(
            "EXEC dbo.registrar_pagamento @p_id_consulta = ?, @p_forma_pagamento = ?, @p_valor = ?",
            idConsulta, formaPagamento, valor);
    }

    /**
     * Procedure 3 (do script original): cancelar_agendamento(@p_id_agendamento, @p_motivo).
     * Devolve uma linha com "sucesso" (bit) e "mensagem" (texto).
     */
    public Map<String, Object> executarCancelamento(Integer idConsulta, String motivo) {
        List<Map<String, Object>> linhas = normalizar(jdbcTemplate.queryForList(
            "EXEC dbo.cancelar_agendamento @p_id_agendamento = ?, @p_motivo = ?", idConsulta, motivo));
        return linhas.isEmpty() ? new java.util.HashMap<String, Object>() : linhas.get(0);
    }

    // ==============================================================
    // 3. USER-DEFINED FUNCTIONS (UDF)
    // ==============================================================

    /** Function 1 (Escalar): Total em R$ gasto por um paciente */
    public Double calcularTotalGastoPaciente(Integer idPaciente) {
        return jdbcTemplate.queryForObject(
            "SELECT dbo.fn_CalcularTotalGastoPaciente(?)", Double.class, idPaciente);
    }

    /** Function 2 (Inline Table): Consultas filtradas por intervalo de datas */
    public List<Map<String, Object>> listarConsultasPorPeriodo(String dataInicio, String dataFim) {
        return normalizar(jdbcTemplate.queryForList(
            "SELECT * FROM dbo.fn_ListarConsultasPorPeriodo(?, ?)", dataInicio, dataFim));
    }

    /** Function 3 (Multi-Statement Table): Relatório de produtividade e faturamento do médico */
    public List<Map<String, Object>> obterProdutividadeMedico(Integer idMedico) {
        return normalizar(jdbcTemplate.queryForList(
            "SELECT * FROM dbo.fn_RelatorioProdutividadeMedica(?)", idMedico));
    }
}
