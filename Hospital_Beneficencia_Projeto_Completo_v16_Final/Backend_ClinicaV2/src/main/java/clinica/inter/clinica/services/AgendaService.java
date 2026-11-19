package clinica.inter.clinica.services;

import clinica.inter.clinica.entities.AgendaEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import clinica.inter.clinica.repositories.AgendaRepository;

@Service
public class AgendaService {

    private final AgendaRepository agendaRepository;

    public AgendaService(AgendaRepository agendaRepository) {
        this.agendaRepository = agendaRepository;
    }

    public List<AgendaEntity> listarTodos() {
        return agendaRepository.findAll();
    }

    public Optional<AgendaEntity> buscarPorId(Integer id) {
        return agendaRepository.findById(id);
    }

    public AgendaEntity salvar(AgendaEntity agenda) {
        return agendaRepository.save(agenda);
    }

    public void excluir(Integer id) {
        agendaRepository.deleteById(id);
    }
}