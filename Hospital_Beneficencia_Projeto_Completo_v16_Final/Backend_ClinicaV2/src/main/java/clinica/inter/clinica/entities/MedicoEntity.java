package clinica.inter.clinica.entities;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "tbmedicos")
@PrimaryKeyJoinColumn(name = "id_usuario")
public class MedicoEntity extends PessoaEntity {

    @Column(nullable = false, unique = true, length = 20)
    private String numeroRegistro;

    @Column(length = 255)
    private String descricao;

    @Column(name = "valor_consulta", precision = 10, scale = 2)
    private BigDecimal valorConsulta = BigDecimal.valueOf(250.00);

    @Column(length = 20)
    private String turno = "morning";

    // Relacionamento N x N exigido no relatório da FATEC
    @ManyToMany
    @JoinTable(
        name = "tbmedico_especialidade",
        joinColumns = @JoinColumn(name = "id_medico"),
        inverseJoinColumns = @JoinColumn(name = "id_especialidade")
    )
    private List<Especialidades> especialidades = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "medico", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<AgendaEntity> agenda = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "medico", cascade = CascadeType.ALL)
    private List<Consulta> consultas = new ArrayList<>();

    public String getNumeroRegistro() { return numeroRegistro; }
    public void setNumeroRegistro(String numeroRegistro) { this.numeroRegistro = numeroRegistro; }

    public String getCrm() { return numeroRegistro; }
    public void setCrm(String crm) { if (this.numeroRegistro == null || this.numeroRegistro.isBlank()) this.numeroRegistro = crm; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public BigDecimal getValorConsulta() { return valorConsulta; }
    public void setValorConsulta(BigDecimal valorConsulta) { this.valorConsulta = valorConsulta; }

    public String getTurno() { return turno; }
    public void setTurno(String turno) { this.turno = turno; }

    public List<Especialidades> getEspecialidades() { return especialidades; }
    public void setEspecialidades(List<Especialidades> especialidades) { this.especialidades = especialidades; }

    public List<AgendaEntity> getAgenda() { return agenda; }
    public void setAgenda(List<AgendaEntity> agenda) { this.agenda = agenda; }

    public List<Consulta> getConsultas() { return consultas; }
    public void setConsultas(List<Consulta> consultas) { this.consultas = consultas; }
}
