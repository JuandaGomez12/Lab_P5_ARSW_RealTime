package edu.arsw.blueprints.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DrawMessage {
    private String author;
    private String name;
    private Point point;
}
