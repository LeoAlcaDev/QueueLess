package pe.edu.utec.queueless.reclamo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.utec.queueless.reclamo.entity.Reclamo;

import java.util.List;
import java.util.Optional;

public interface ReclamoRepository extends JpaRepository<Reclamo, Long> {

    /** Para garantizar la unicidad del código de constancia al generarlo. */
    Optional<Reclamo> findByCodigoConstancia(String codigoConstancia);

    /** Los reclamos del usuario, del más reciente al más antiguo (el id desempata). */
    List<Reclamo> findByUsuarioIdOrderByCreatedAtDescIdDesc(Long usuarioId);

    /** Los reclamos contra cualquiera de los locales de un gestor, del más reciente al más antiguo. */
    List<Reclamo> findByPuntoDeVentaGestorIdOrderByCreatedAtDescIdDesc(Long gestorId);
}
