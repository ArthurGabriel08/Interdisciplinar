package clinica.inter.clinica.services;

import clinica.inter.clinica.entities.MedicoEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import clinica.inter.clinica.repositories.MedicoRepository;

@Service
public class MedicoService {

    private final MedicoRepository medicoRepository;

    public MedicoService(MedicoRepository medicoRepository) {
        this.medicoRepository = medicoRepository;
    }

    public List<MedicoEntity> listarTodos() {
        return medicoRepository.findAll();
    }

    public Optional<MedicoEntity> buscarPorId(Integer id) {
        return medicoRepository.findById(id);
    }

    public MedicoEntity salvar(MedicoEntity medico) {
        return medicoRepository.save(medico);
    }

    public void excluir(Integer id) {
        medicoRepository.deleteById(id);
    }
}