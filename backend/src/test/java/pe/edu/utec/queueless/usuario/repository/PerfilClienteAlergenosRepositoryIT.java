package pe.edu.utec.queueless.usuario.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.PerfilCliente;
import pe.edu.utec.queueless.usuario.entity.RestriccionDietetica;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Round-trip de los conjuntos @ElementCollection del perfil de cliente: se guardan
 * los alérgenos y restricciones, se vacía el contexto y se vuelven a leer iguales.
 */
class PerfilClienteAlergenosRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private PerfilClienteRepository perfilClienteRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private TestEntityManager entityManager;

    private Usuario cliente;

    @BeforeEach
    void setUp() {
        cliente = usuarioRepository.save(Usuario.builder()
            .email("cliente.alergenos@utec.edu.pe")
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Cliente Alergenos")
            .roles(new HashSet<>(Set.of(Rol.CLIENTE)))
            .build());
    }

    @Test
    @DisplayName("los alérgenos, restricciones, picante y presupuesto se leen igual que se guardaron")
    void shouldRoundTripHabitosDelPerfil() {
        // Arrange
        PerfilCliente perfil = PerfilCliente.builder()
            .usuario(cliente)
            .alergenosEvitar(new HashSet<>(Set.of(Alergeno.MANI, Alergeno.GLUTEN)))
            .restriccionesDieteticas(new HashSet<>(Set.of(RestriccionDietetica.VEGANO, RestriccionDietetica.SIN_GLUTEN)))
            .toleranciaPicante(ToleranciaPicante.ALTA)
            .presupuestoReferencia(new BigDecimal("25.50"))
            .build();
        perfilClienteRepository.save(perfil);

        // Act
        entityManager.flush();
        entityManager.clear();
        PerfilCliente recargado = perfilClienteRepository.findById(cliente.getId()).orElseThrow();

        // Assert
        assertThat(recargado.getAlergenosEvitar())
            .containsExactlyInAnyOrder(Alergeno.MANI, Alergeno.GLUTEN);
        assertThat(recargado.getRestriccionesDieteticas())
            .containsExactlyInAnyOrder(RestriccionDietetica.VEGANO, RestriccionDietetica.SIN_GLUTEN);
        assertThat(recargado.getToleranciaPicante()).isEqualTo(ToleranciaPicante.ALTA);
        assertThat(recargado.getPresupuestoReferencia()).isEqualByComparingTo("25.50");
    }
}
