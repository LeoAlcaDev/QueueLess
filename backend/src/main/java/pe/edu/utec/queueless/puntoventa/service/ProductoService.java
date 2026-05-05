package pe.edu.utec.queueless.puntoventa.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.repository.ProductoRepository;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProductoService {

    private final ProductoRepository repository;

    public List<Producto> listarPorPuntoDeVenta(Long puntoDeVentaId) {
        return repository.findByPuntoDeVentaIdAndDisponibleTrue(puntoDeVentaId);
    }

    public Producto findById(Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Producto", id));
    }
}
