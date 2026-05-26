package pe.edu.utec.queueless.puntoventa.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests del repositorio de puntos de venta: filtros de abierto/activo y por gestor.
 */
class PuntoDeVentaRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private PuntoDeVentaRepository puntoDeVentaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Usuario gestor;

    @BeforeEach
    void setUp() {
        gestor = usuarioRepository.save(Usuario.builder()
            .email("gestor.pv@utec.edu.pe")
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Gestor PV")
            .roles(new HashSet<>(Set.of(Rol.COMERCIO)))
            .build());
    }

    @Test
    @DisplayName("findByIdAndActivoTrue encuentra el local cuando esta activo")
    void shouldFindByIdAndActivoTrueWhenActive() {
        PuntoDeVenta guardado = puntoDeVentaRepository.save(local("Activo", true, true));

        assertThat(puntoDeVentaRepository.findByIdAndActivoTrue(guardado.getId())).isPresent();
    }

    @Test
    @DisplayName("findByIdAndActivoTrue no devuelve un local dado de baja")
    void shouldNotFindByIdAndActivoTrueWhenInactive() {
        PuntoDeVenta baja = puntoDeVentaRepository.save(local("De baja", true, false));

        assertThat(puntoDeVentaRepository.findByIdAndActivoTrue(baja.getId())).isEmpty();
    }

    @Test
    @DisplayName("el listado publico trae solo locales abiertos y activos")
    void shouldListOnlyOpenAndActiveStores() {
        puntoDeVentaRepository.save(local("Abierto", true, true));
        puntoDeVentaRepository.save(local("Cerrado", false, true));
        puntoDeVentaRepository.save(local("De baja", true, false));

        assertThat(puntoDeVentaRepository.findByAbiertoTrueAndActivoTrue())
            .extracting(PuntoDeVenta::getNombre)
            .containsExactly("Abierto");
    }

    @Test
    @DisplayName("el dashboard del gestor trae sus locales que siguen activos")
    void shouldListActiveStoresByGestor() {
        puntoDeVentaRepository.save(local("Mio activo", true, true));
        puntoDeVentaRepository.save(local("Mio de baja", true, false));

        assertThat(puntoDeVentaRepository.findByGestorIdAndActivoTrue(gestor.getId()))
            .extracting(PuntoDeVenta::getNombre)
            .containsExactly("Mio activo");
    }

    private PuntoDeVenta local(String nombre, boolean abierto, boolean activo) {
        return PuntoDeVenta.builder()
            .nombre(nombre)
            .ubicacion("Bloque A")
            .gestor(gestor)
            .abierto(abierto)
            .activo(activo)
            .build();
    }
}
