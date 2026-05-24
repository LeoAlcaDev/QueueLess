package pe.edu.utec.queueless.puntoventa.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.puntoventa.entity.Producto;

import java.util.List;

public interface ProductoRepository extends JpaRepository<Producto, Long> {

    // Listado publico: solo los productos que el local esta vendiendo.
    List<Producto> findByPuntoDeVentaIdAndDisponibleTrue(Long puntoDeVentaId);

    // Dashboard del comercio: todos sus productos, incluidos los no disponibles.
    List<Producto> findByPuntoDeVentaId(Long puntoDeVentaId);
}
