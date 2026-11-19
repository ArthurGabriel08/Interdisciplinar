package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.PessoaEntity;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import clinica.inter.clinica.services.PessoaService;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/pessoas")
public class PessoaController {

    private final PessoaService pessoaService;

    public PessoaController(PessoaService pessoaService) {
        this.pessoaService = pessoaService;
    }

    @GetMapping
    public ResponseEntity<List<PessoaEntity>> listarTodos() {
        return ResponseEntity.ok(pessoaService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PessoaEntity> buscarPorId(@PathVariable Integer id) {
        return pessoaService.buscarPorId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<PessoaEntity> salvar(@RequestBody PessoaEntity pessoa) {
        return ResponseEntity.ok(pessoaService.salvar(pessoa));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PessoaEntity> atualizar(@PathVariable Integer id,
            @RequestBody PessoaEntity pessoa) {
        if (pessoaService.buscarPorId(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        pessoa.setId(id);
        return ResponseEntity.ok(pessoaService.salvar(pessoa));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        if (pessoaService.buscarPorId(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        pessoaService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}