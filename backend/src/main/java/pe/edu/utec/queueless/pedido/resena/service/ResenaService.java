package pe.edu.utec.queueless.pedido.resena.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pedido.resena.repository.ResenaRepository;

@Service
@RequiredArgsConstructor
@Transactional
public class ResenaService {

    private final ResenaRepository resenaRepository;

    // TODO Semana 3: crear reseña validando que el pedido esté ENTREGADO
    // y que no exista ya una del mismo objetivo_tipo para ese pedido.
}
