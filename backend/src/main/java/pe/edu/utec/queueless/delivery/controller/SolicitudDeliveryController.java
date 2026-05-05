package pe.edu.utec.queueless.delivery.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.delivery.service.SolicitudDeliveryService;

/** Endpoints para repartidores: ver pedidos disponibles, aceptar entrega, confirmar pasos. */
@RestController
@RequestMapping("/api/repartidor")
@RequiredArgsConstructor
public class SolicitudDeliveryController {

    private final SolicitudDeliveryService service;

    // TODO Semana 3:
    // GET /pedidos-disponibles
    // POST /solicitudes/{id}/aceptar
    // POST /solicitudes/{id}/confirmar-recogida
    // POST /solicitudes/{id}/confirmar-entrega
    // GET /mis-entregas
}
