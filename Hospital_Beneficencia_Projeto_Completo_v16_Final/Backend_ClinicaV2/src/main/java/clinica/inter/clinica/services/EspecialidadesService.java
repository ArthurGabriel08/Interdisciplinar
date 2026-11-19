package clinica.inter.clinica.services;

import clinica.inter.clinica.entities.Especialidades;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import clinica.inter.clinica.repositories.EspecialidadesRepository;

@Service
public class EspecialidadesService {

    private final EspecialidadesRepository especialidadesRepository;

    public EspecialidadesService(EspecialidadesRepository especialidadesRepository) {
        this.especialidadesRepository = especialidadesRepository;
    }

    public List<Especialidades> listarTodos() {
        return especialidadesRepository.findAll();
    }

    public Optional<Especialidades> buscarPorId(Integer id) {
        return especialidadesRepository.findById(id);
    }

    public Especialidades salvar(Especialidades especialidade) {
        return especialidadesRepository.save(especialidade);
    }

    public void excluir(Integer id) {
        especialidadesRepository.deleteById(id);
    }
}