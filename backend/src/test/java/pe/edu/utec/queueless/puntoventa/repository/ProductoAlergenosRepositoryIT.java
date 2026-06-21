package pe.edu.utec.queueless.puntoventa.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Round-trip de los alérgenos @ElementCollection del producto: se guardan, se vacía
 * el contexto y se vuelven a leer iguales.
 */
class ProductoAlergenosRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private PuntoDeVentaRepository puntoDeVentaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private TestEntityManager entityManager;

    private PuntoDeVenta local;

    @BeforeEach
    void setUp() {
        Usuario gestor = usuarioRepository.save(Usuario.builder()
            .email("gestor.alergenos@utec.edu.pe")
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Gestor Alergenos")
            .roles(new HashSet<>(Set.of(Rol.COMERCIO)))
            .build());
        local = puntoDeVentaRepository.save(PuntoDeVenta.builder()
            .nombre("Cafetería")
            .ubicacion("Bloque A")
            .gestor(gestor)
            .build());
    }

    @Test
    @DisplayName("los alérgenos del producto se leen igual que se guardaron")
    void shouldRoundTripAlergenosDelProducto() {
        // Arrange
        Producto producto = Producto.builder()
            .puntoDeVenta(local)
            .nombre("Sándwich de pollo")
            .precio(new BigDecimal("12.50"))
            .tipoPreparacion(TipoPreparacion.PREPARADO)
            .alergenos(new HashSet<>(Set.of(Alergeno.MANI, Alergeno.SOYA)))
            .build();
        Producto guardado = productoRepository.save(producto);

        // Act
        entityManager.flush();
        entityManager.clear();
        Producto recargado = productoRepository.findById(guardado.getId()).orElseThrow();

        // Assert
        assertThat(recargado.getAlergenos()).containsExactlyInAnyOrder(Alergeno.MANI, Alergeno.SOYA);
    }
}
