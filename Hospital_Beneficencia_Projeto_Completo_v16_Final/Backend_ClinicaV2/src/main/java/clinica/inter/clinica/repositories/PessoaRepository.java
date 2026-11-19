package clinica.inter.clinica.repositories;

import clinica.inter.clinica.entities.PessoaEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PessoaRepository extends JpaRepository<PessoaEntity, Integer> {
    Optional<PessoaEntity> findByEmail(String email);
    Optional<PessoaEntity> findByCpf(String cpf);
}
