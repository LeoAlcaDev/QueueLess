package pe.edu.utec.queueless.queuepoints.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.queuepoints.service.QueuePointsService;

@RestController
@RequestMapping("/api/cliente/queuepoints")
@RequiredArgsConstructor
public class QueuePointsController {

    private final QueuePointsService service;

    // TODO Semana 3: GET /saldo, GET /movimientos
}
