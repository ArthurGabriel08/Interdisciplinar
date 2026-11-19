package clinica.inter.clinica.controllers;

import clinica.inter.clinica.entities.Especialidades;
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
import clinica.inter.clinica.services.EspecialidadesService;

@CrossOrigin(origins = "*")
@RestController
@RequestMapping("/especialidades")
public class EspecialidadesController {

    private final EspecialidadesService especialidadesService;

    public EspecialidadesController(EspecialidadesService especialidadesService) {
        this.especialidadesService = especialidadesService;
    }

    @GetMapping
    public ResponseEntity<List<Especialidades>> listarTodos() {
        return ResponseEntity.ok(especialidadesService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Especialidades> buscarPorId(@PathVariable Integer id) {
        return especialidadesService.buscarPorId(id)
            .map(ResponseEntity::ok)
            .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Especialidades> salvar(@RequestBody Especialidades especialidade) {
        return ResponseEntity.ok(especialidadesService.salvar(especialidade));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Especialidades> atualizar(@PathVariable Integer id,
            @RequestBody Especialidades especialidade) {
        if (especialidadesService.buscarPorId(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        especialidade.setId(id);
        return ResponseEntity.ok(especialidadesService.salvar(especialidade));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Integer id) {
        if (especialidadesService.buscarPorId(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        especialidadesService.excluir(id);
        return ResponseEntity.noContent().build();
    }
}