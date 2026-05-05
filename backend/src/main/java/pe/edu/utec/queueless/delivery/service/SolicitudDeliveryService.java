package pe.edu.utec.queueless.delivery.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class SolicitudDeliveryService {

    private final SolicitudDeliveryRepository repository;

    // TODO Semana 3: crear solicitud, listar disponibles para repartidor,
    // aceptar (transición BUSCANDO -> ASIGNADO), confirmar recogida, confirmar entrega.
}
