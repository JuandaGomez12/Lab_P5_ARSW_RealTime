package edu.arsw.blueprints.service;

import edu.arsw.blueprints.model.Blueprint;
import edu.arsw.blueprints.model.Point;
import edu.arsw.blueprints.repository.InMemoryBlueprintRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BlueprintService {

    private final InMemoryBlueprintRepository repo;

    public BlueprintService(InMemoryBlueprintRepository repo) {
        this.repo = repo;
    }

    public List<Blueprint> getByAuthor(String author) {
        return repo.findByAuthor(author);
    }

    public Optional<Blueprint> getByAuthorAndName(String author, String name) {
        return repo.findByAuthorAndName(author, name);
    }

    public Blueprint create(Blueprint blueprint) {
        return repo.save(blueprint);
    }

    public Optional<Blueprint> update(String author, String name, List<Point> newPoints) {
        return repo.findByAuthorAndName(author, name).map(bp -> {
            bp.getPoints().clear();
            if (newPoints != null) bp.getPoints().addAll(newPoints);
            return repo.save(bp);
        });
    }

    public boolean delete(String author, String name) {
        return repo.delete(author, name);
    }

    public Blueprint addPoint(String author, String name, Point point) {
        repo.addPoint(author, name, point);
        return repo.findByAuthorAndName(author, name)
                   .orElseThrow(() -> new IllegalStateException("Blueprint not found after addPoint"));
    }
}
