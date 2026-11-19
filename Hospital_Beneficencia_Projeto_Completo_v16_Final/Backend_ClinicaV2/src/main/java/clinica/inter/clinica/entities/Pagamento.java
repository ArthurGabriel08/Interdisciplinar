package clinica.inter.clinica.entities;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "tbpagamentos")
public class Pagamento {

    private static final DateTimeFormatter FORMATTER =
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    private LocalDateTime data_pagamento;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(nullable = false, length = 30)
    private String formaPagamento;

    @OneToOne
    @JoinColumn(name = "id_consulta", nullable = false, unique = true)
    private Consulta consulta;

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public BigDecimal getValor() { return valor; }
    public void setValor(BigDecimal valor) { this.valor = valor; }

    public LocalDateTime getData_pagamento() { return data_pagamento; }
    public void setData_pagamento(LocalDateTime data_pagamento) { this.data_pagamento = data_pagamento; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getFormaPagamento() { return formaPagamento; }
    public void setFormaPagamento(String formaPagamento) { this.formaPagamento = formaPagamento; }

    public Consulta getConsulta() { return consulta; }
    public void setConsulta(Consulta consulta) { this.consulta = consulta; }

    public String getDataPagamentoFormatada() {
        return data_pagamento != null ? data_pagamento.format(FORMATTER) : "Não pago";
    }
}
