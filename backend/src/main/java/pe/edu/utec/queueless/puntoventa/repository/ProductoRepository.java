package pe.edu.utec.queueless.puntoventa.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.puntoventa.entity.Producto;

import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {
    List<Producto> findByPuntoDeVentaIdAndDisponibleTrue(Long puntoDeVentaId);
}
