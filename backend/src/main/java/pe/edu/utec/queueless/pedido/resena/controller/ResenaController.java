package pe.edu.utec.queueless.pedido.resena.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pedido.resena.service.ResenaService;

@RestController
@RequestMapping("/api/cliente/resenas")
@RequiredArgsConstructor
public class ResenaController {

    private final ResenaService resenaService;

    // TODO Semana 3: POST /api/cliente/resenas — crear reseña sobre punto de venta o repartidor
}
