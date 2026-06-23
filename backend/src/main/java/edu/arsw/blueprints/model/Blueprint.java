package edu.arsw.blueprints.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
public class Blueprint {
    private String author;
    private String name;
    private List<Point> points = new ArrayList<>();

    public Blueprint(String author, String name) {
        this.author = author;
        this.name = name;
        this.points = new ArrayList<>();
    }
}
