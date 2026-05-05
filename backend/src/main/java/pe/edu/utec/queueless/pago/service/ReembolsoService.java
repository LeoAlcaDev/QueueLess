package pe.edu.utec.queueless.pago.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pago.gateway.PaymentGateway;
import pe.edu.utec.queueless.pago.repository.PagoRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class ReembolsoService {

    private final PagoRepository pagoRepository;
    private final PaymentGateway paymentGateway;

    // TODO Semana 2: emitirReembolso(pedidoId) — busca el Pago, llama a gateway, marca REEMBOLSADO
}
