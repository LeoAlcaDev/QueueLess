package pe.edu.utec.queueless.recomendador.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.ocupacion.dto.OcupacionResponse;
import pe.edu.utec.queueless.ocupacion.service.OcupacionService;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.PerfilCliente;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.PerfilClienteRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Prueba el ensamblado de candidatos con dobles de los repositorios y servicios: que un
 * producto fuera de su horario o ventana (no disponible ahora) no entra, y que un producto con
 * un alérgeno que el cliente evita queda descartado de punta a punta (ensamblado más filtro).
 * No toca red ni base de datos.
 */
@ExtendWith(MockitoExtension.class)
class EnsambladorDeCandidatosTest {

    @Mock private PerfilClienteRepository perfilClienteRepository;
    @Mock private PuntoDeVentaRepository puntoDeVentaRepository;
    @Mock private ProductoService productoService;
    @Mock private OcupacionService ocupacionService;
    @InjectMocks private EnsambladorDeCandidatos ensamblador;

    private Usuario usuario;
    private PuntoDeVenta local;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(ensamblador, "maximoCandidatos", 20);

        usuario = new Usuario();
        usuario.setId(1L);

        local = PuntoDeVenta.builder().nombre("Local").abierto(true).build();
        local.setId(1L);   // sin horario declarado: el switch "abierto" basta para atender
        when(puntoDeVentaRepository.findByAbiertoTrueAndActivoTrue()).thenReturn(List.of(local));
        when(ocupacionService.curvaParaCliente(1L)).thenReturn(OcupacionResponse.recopilando(local, 90, 10));
    }

    @Test
    @DisplayName("Un producto que no se puede pedir ahora no entra como candidato")
    void excluyeLosNoPediblesAhora() {
        // Arrange
        when(perfilClienteRepository.findById(1L)).thenReturn(Optional.of(perfilSinRestricciones()));
        when(productoService.listarPorPuntoDeVenta(1L)).thenReturn(List.of(
            producto(10L, true, Set.of()),
            producto(11L, false, Set.of())));

        // Act
        List<Candidato> candidatos = ensamblador.ensamblar(usuario, null);

        // Assert
        assertThat(candidatos).extracting(Candidato::productoId).containsExactly(10L);
    }

    @Test
    @DisplayName("Un producto con un alérgeno que el cliente evita queda descartado de punta a punta")
    void excluyeAlergenoDePuntaAPunta() {
        // Arrange: el cliente evita maní
        PerfilCliente perfil = PerfilCliente.builder().usuarioId(1L).alergenosEvitar(Set.of(Alergeno.MANI)).build();
        when(perfilClienteRepository.findById(1L)).thenReturn(Optional.of(perfil));
        when(productoService.listarPorPuntoDeVenta(1L)).thenReturn(List.of(
            producto(10L, true, Set.of(Alergeno.MANI)),
            producto(11L, true, Set.of())));

        // Act
        List<Candidato> candidatos = ensamblador.ensamblar(usuario, null);

        // Assert
        assertThat(candidatos).extracting(Candidato::productoId).containsExactly(11L);
    }

    private static PerfilCliente perfilSinRestricciones() {
        return PerfilCliente.builder().usuarioId(1L).build();
    }

    private static ProductoResponse producto(long id, boolean disponibleAhora, Set<Alergeno> alergenos) {
        ProductoResponse p = new ProductoResponse();
        p.setId(id);
        p.setNombre("Plato " + id);
        p.setDescripcion("descripción");
        p.setPrecio(new BigDecimal("10.00"));
        p.setDisponibleAhora(disponibleAhora);
        p.setAlergenos(alergenos);
        p.setAptitudesDieteticas(Set.of());
        return p;
    }
}
