package clinica.inter.clinica.repositories;

import clinica.inter.clinica.entities.Especialidades;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EspecialidadesRepository extends JpaRepository<Especialidades, Integer> {
}