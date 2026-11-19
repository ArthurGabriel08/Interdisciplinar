package clinica.inter.clinica.services;

import clinica.inter.clinica.entities.PacienteEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import clinica.inter.clinica.repositories.PacienteRepository;

@Service
public class PacienteService {

    private final PacienteRepository pacienteRepository;

    public PacienteService(PacienteRepository pacienteRepository) {
        this.pacienteRepository = pacienteRepository;
    }

    public List<PacienteEntity> listarTodos() {
        return pacienteRepository.findAll();
    }

    public Optional<PacienteEntity> buscarPorId(Integer id) {
        return pacienteRepository.findById(id);
    }

    public PacienteEntity salvar(PacienteEntity paciente) {
        return pacienteRepository.save(paciente);
    }

    public void excluir(Integer id) {
        pacienteRepository.deleteById(id);
    }
}