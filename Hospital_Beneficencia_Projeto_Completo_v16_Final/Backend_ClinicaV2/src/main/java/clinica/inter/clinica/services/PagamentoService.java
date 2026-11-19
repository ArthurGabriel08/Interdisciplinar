package clinica.inter.clinica.services;

import clinica.inter.clinica.entities.Pagamento;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import clinica.inter.clinica.repositories.PagamentoRepository;

@Service
public class PagamentoService {

    private final PagamentoRepository pagamentoRepository;

    public PagamentoService(PagamentoRepository pagamentoRepository) {
        this.pagamentoRepository = pagamentoRepository;
    }

    public List<Pagamento> listarTodos() {
        return pagamentoRepository.findAll();
    }

    public Optional<Pagamento> buscarPorId(Integer id) {
        return pagamentoRepository.findById(id);
    }

    public Pagamento salvar(Pagamento pagamento) {
        return pagamentoRepository.save(pagamento);
    }

    public void excluir(Integer id) {
        pagamentoRepository.deleteById(id);
    }
}