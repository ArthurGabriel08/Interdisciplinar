package clinica.inter.clinica.services;

import clinica.inter.clinica.entities.PessoaEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import clinica.inter.clinica.repositories.PessoaRepository;

@Service
public class PessoaService {

    private final PessoaRepository pessoaRepository;

    public PessoaService(PessoaRepository pessoaRepository) {
        this.pessoaRepository = pessoaRepository;
    }

    public List<PessoaEntity> listarTodos() {
        return pessoaRepository.findAll();
    }

    public Optional<PessoaEntity> buscarPorId(Integer id) {
        return pessoaRepository.findById(id);
    }

    public PessoaEntity salvar(PessoaEntity pessoa) {
        return pessoaRepository.save(pessoa);
    }

    public void excluir(Integer id) {
        pessoaRepository.deleteById(id);
    }
}