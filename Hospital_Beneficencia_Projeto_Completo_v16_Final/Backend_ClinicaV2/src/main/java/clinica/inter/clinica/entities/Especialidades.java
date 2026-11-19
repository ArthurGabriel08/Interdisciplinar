package clinica.inter.clinica.entities;

import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;

@Entity
@Table(name = "tbespecialidades")
public class Especialidades {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(nullable = false, unique = true, length = 100)
    private String descricao;

    // Relacionamento N x N mapeado com os Médicos
    @ManyToMany(mappedBy = "especialidades")
    @JsonIgnore
    private List<MedicoEntity> medicos = new ArrayList<>();

    public int getId() { return id; }
    public void setId(int id) { this.id = id; }

    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }

    public String getNome() { return descricao; }
    public void setNome(String nome) { if (this.descricao == null || this.descricao.isBlank()) this.descricao = nome; }

    public List<MedicoEntity> getMedicos() { return medicos; }
    public void setMedicos(List<MedicoEntity> medicos) { this.medicos = medicos; }
}
