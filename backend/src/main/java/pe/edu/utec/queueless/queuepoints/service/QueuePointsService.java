package pe.edu.utec.queueless.queuepoints.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.queuepoints.repository.MovimientoQueuePointsRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class QueuePointsService {

    private final MovimientoQueuePointsRepository repository;

    // TODO Semana 3: calcular saldo de un usuario, registrar movimiento, canjear puntos.
}
