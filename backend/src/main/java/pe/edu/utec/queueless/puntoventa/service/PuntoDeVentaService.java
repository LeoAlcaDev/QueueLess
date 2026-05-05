package pe.edu.utec.queueless.puntoventa.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PuntoDeVentaService {

    private final PuntoDeVentaRepository repository;

    public List<PuntoDeVenta> listarAbiertos() {
        return repository.findByAbiertoTrue();
    }

    public PuntoDeVenta findById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", id));
    }

    @Transactional
    public PuntoDeVenta create(PuntoDeVenta puntoDeVenta) {
        // TODO Semana 1: validaciones (que el gestor tenga rol COMERCIO, etc.)
        return repository.save(puntoDeVenta);
    }
}
