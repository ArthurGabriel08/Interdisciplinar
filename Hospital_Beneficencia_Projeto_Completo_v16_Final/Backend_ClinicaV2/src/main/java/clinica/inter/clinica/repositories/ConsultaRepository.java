package clinica.inter.clinica.repositories;

import clinica.inter.clinica.entities.Consulta;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsultaRepository extends JpaRepository<Consulta, Integer> {

    List<Consulta> findByPacienteId(int idPaciente);

    List<Consulta> findByMedicoId(int idMedico);
}
