package pe.edu.utec.queueless.puntoventa.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;

import java.util.List;

public interface PuntoDeVentaRepository extends JpaRepository<PuntoDeVenta, Long> {
    List<PuntoDeVenta> findByAbiertoTrue();
    List<PuntoDeVenta> findByGestorId(Long gestorId);
}
