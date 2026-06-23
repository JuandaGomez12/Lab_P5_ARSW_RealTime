package edu.arsw.blueprints.repository;

import edu.arsw.blueprints.model.Blueprint;
import edu.arsw.blueprints.model.Point;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryBlueprintRepository {

    private final Map<String, Blueprint> store = new ConcurrentHashMap<>();

    public InMemoryBlueprintRepository() {
        Blueprint bp1 = new Blueprint("juan", "plano-1");
        bp1.getPoints().add(new Point(50, 80));
        bp1.getPoints().add(new Point(150, 40));
        bp1.getPoints().add(new Point(250, 100));
        store.put(key("juan", "plano-1"), bp1);

        Blueprint bp2 = new Blueprint("juan", "plano-2");
        bp2.getPoints().add(new Point(30, 30));
        bp2.getPoints().add(new Point(200, 90));
        store.put(key("juan", "plano-2"), bp2);

        Blueprint bp3 = new Blueprint("maria", "oficina-a");
        bp3.getPoints().add(new Point(100, 100));
        bp3.getPoints().add(new Point(300, 200));
        bp3.getPoints().add(new Point(500, 150));
        store.put(key("maria", "oficina-a"), bp3);
    }

    private String key(String author, String name) {
        return author + ":" + name;
    }

    public List<Blueprint> findByAuthor(String author) {
        return store.values().stream()
                .filter(bp -> bp.getAuthor().equals(author))
                .toList();
    }

    public Optional<Blueprint> findByAuthorAndName(String author, String name) {
        return Optional.ofNullable(store.get(key(author, name)));
    }

    public Blueprint save(Blueprint blueprint) {
        store.put(key(blueprint.getAuthor(), blueprint.getName()), blueprint);
        return blueprint;
    }

    public synchronized void addPoint(String author, String name, Point point) {
        store.computeIfAbsent(key(author, name), k -> new Blueprint(author, name))
             .getPoints().add(point);
    }

    public boolean delete(String author, String name) {
        return store.remove(key(author, name)) != null;
    }
}
