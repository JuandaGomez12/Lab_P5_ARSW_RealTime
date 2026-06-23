package edu.arsw.blueprints.controller;

import edu.arsw.blueprints.model.Blueprint;
import edu.arsw.blueprints.model.DrawMessage;
import edu.arsw.blueprints.service.BlueprintService;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
public class BlueprintWebSocketController {

    private final BlueprintService service;
    private final SimpMessagingTemplate messaging;

    public BlueprintWebSocketController(BlueprintService service,
                                         SimpMessagingTemplate messaging) {
        this.service = service;
        this.messaging = messaging;
    }

    @MessageMapping("/draw")
    public void handleDraw(DrawMessage msg) {
        Blueprint updated = service.addPoint(msg.getAuthor(), msg.getName(), msg.getPoint());
        String topic = "/topic/blueprints." + msg.getAuthor() + "." + msg.getName();
        messaging.convertAndSend(topic, updated);
    }
}
