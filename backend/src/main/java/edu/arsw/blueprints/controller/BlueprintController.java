package edu.arsw.blueprints.controller;

import edu.arsw.blueprints.model.Blueprint;
import edu.arsw.blueprints.service.BlueprintService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/blueprints")
public class BlueprintController {

    private final BlueprintService service;

    public BlueprintController(BlueprintService service) {
        this.service = service;
    }

    @GetMapping
    public List<Blueprint> getByAuthor(@RequestParam String author) {
        return service.getByAuthor(author);
    }

    @GetMapping("/{author}/{name}")
    public ResponseEntity<Blueprint> getOne(@PathVariable String author,
                                            @PathVariable String name) {
        return service.getByAuthorAndName(author, name)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Blueprint> create(@RequestBody Blueprint blueprint) {
        return ResponseEntity.ok(service.create(blueprint));
    }

    @PutMapping("/{author}/{name}")
    public ResponseEntity<Blueprint> update(@PathVariable String author,
                                            @PathVariable String name,
                                            @RequestBody Blueprint body) {
        return service.update(author, name, body.getPoints())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{author}/{name}")
    public ResponseEntity<Void> delete(@PathVariable String author,
                                       @PathVariable String name) {
        return service.delete(author, name)
                ? ResponseEntity.noContent().build()
                : ResponseEntity.notFound().build();
    }
}
