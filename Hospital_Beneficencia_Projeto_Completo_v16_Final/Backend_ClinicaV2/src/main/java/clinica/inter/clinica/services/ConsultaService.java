package clinica.inter.clinica.services;

import clinica.inter.clinica.entities.Consulta;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import clinica.inter.clinica.repositories.ConsultaRepository;

@Service
public class ConsultaService {

    private final ConsultaRepository consultaRepository;

    public ConsultaService(ConsultaRepository consultaRepository) {
        this.consultaRepository = consultaRepository;
    }

    public List<Consulta> listarTodos() {
        return consultaRepository.findAll();
    }

    public List<Consulta> listarPorPaciente(int idPaciente) {
        return consultaRepository.findByPacienteId(idPaciente);
    }

    public List<Consulta> listarPorMedico(int idMedico) {
        return consultaRepository.findByMedicoId(idMedico);
    }

    public Optional<Consulta> buscarPorId(Integer id) {
        return consultaRepository.findById(id);
    }

    public Consulta salvar(Consulta consulta) {
        return consultaRepository.save(consulta);
    }

    public void excluir(Integer id) {
        consultaRepository.deleteById(id);
    }
}