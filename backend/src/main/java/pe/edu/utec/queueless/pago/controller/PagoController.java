package pe.edu.utec.queueless.pago.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.pago.service.PagoService;

@RestController
@RequestMapping("/api/cliente/pagos")
@RequiredArgsConstructor
public class PagoController {

    private final PagoService pagoService;

    // TODO Semana 2: POST /iniciar (genera URL de checkout), GET /{id} (estado del pago)
}
