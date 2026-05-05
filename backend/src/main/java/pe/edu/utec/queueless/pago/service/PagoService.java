package pe.edu.utec.queueless.pago.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pago.repository.PagoRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class PagoService {

    private final PagoRepository pagoRepository;

    // TODO Semana 2: iniciarPago, confirmarPago (desde webhook), reembolsar
}
