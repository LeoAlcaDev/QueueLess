package pe.edu.utec.queueless.puntoventa.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;

import java.util.List;
import java.util.Optional;

public interface PuntoDeVentaRepository extends JpaRepository<PuntoDeVenta, Long> {

    // Listado publico: solo locales que existen y estan atendiendo ahora.
    List<PuntoDeVenta> findByAbiertoTrueAndActivoTrue();

    // Dashboard del comercio: sus locales que siguen existiendo (no los dados de baja).
    List<PuntoDeVenta> findByGestorIdAndActivoTrue(Long gestorId);

    // Detalle publico: un local dado de baja debe verse como inexistente (404).
    Optional<PuntoDeVenta> findByIdAndActivoTrue(Long id);
}
