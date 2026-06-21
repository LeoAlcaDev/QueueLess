package pe.edu.utec.queueless.usuario.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.modelmapper.ModelMapper;
import pe.edu.utec.queueless.pedido.service.TasaCumplimientoService;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.dto.ActualizarPerfilClienteRequest;
import pe.edu.utec.queueless.usuario.entity.PerfilCliente;
import pe.edu.utec.queueless.usuario.entity.PerfilRepartidor;
import pe.edu.utec.queueless.usuario.entity.RestriccionDietetica;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.PerfilClienteRepository;
import pe.edu.utec.queueless.usuario.repository.PerfilComercioRepository;
import pe.edu.utec.queueless.usuario.repository.PerfilRepartidorRepository;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Creacion de perfiles al activar roles. Se mockean los repositorios; el ModelMapper
 * no participa en la creacion (solo en lectura/actualizacion).
 */
@ExtendWith(MockitoExtension.class)
class PerfilServiceTest {

    @Mock
    private PerfilClienteRepository perfilClienteRepository;

    @Mock
    private PerfilComercioRepository perfilComercioRepository;

    @Mock
    private PerfilRepartidorRepository perfilRepartidorRepository;

    @Mock
    private ModelMapper modelMapper;

    @Mock
    private TasaCumplimientoService tasaCumplimientoService;

    @InjectMocks
    private PerfilService perfilService;

    private Usuario usuario() {
        Usuario usuario = Usuario.builder()
            .email("demo@utec.edu.pe")
            .passwordHash("hash")
            .nombreCompleto("Demo")
            .roles(new HashSet<>())
            .build();
        usuario.setId(7L);
        return usuario;
    }

    @Test
    @DisplayName("crearPerfilParaRol crea el PerfilCliente cuando aun no existe")
    void shouldCrearPerfilClienteWhenNoExiste() {
        // Arrange
        Usuario usuario = usuario();
        when(perfilClienteRepository.existsById(7L)).thenReturn(false);

        // Act
        perfilService.crearPerfilParaRol(usuario, Rol.CLIENTE);

        // Assert
        ArgumentCaptor<PerfilCliente> captor = ArgumentCaptor.forClass(PerfilCliente.class);
        verify(perfilClienteRepository).save(captor.capture());
        assertThat(captor.getValue().getUsuario()).isEqualTo(usuario);
    }

    @Test
    @DisplayName("crearPerfilParaRol no recrea el perfil si ya existe")
    void shouldNoRecrearWhenPerfilYaExiste() {
        // Arrange
        Usuario usuario = usuario();
        when(perfilClienteRepository.existsById(7L)).thenReturn(true);

        // Act
        perfilService.crearPerfilParaRol(usuario, Rol.CLIENTE);

        // Assert
        verify(perfilClienteRepository, never()).save(any());
    }

    @Test
    @DisplayName("crearPerfilesParaRoles crea solo los perfiles de los roles indicados")
    void shouldCrearSoloLosPerfilesIndicadosWhenVariosRoles() {
        // Arrange
        Usuario usuario = usuario();
        when(perfilClienteRepository.existsById(7L)).thenReturn(false);
        when(perfilRepartidorRepository.existsById(7L)).thenReturn(false);

        // Act
        perfilService.crearPerfilesParaRoles(usuario, new HashSet<>(Set.of(Rol.CLIENTE, Rol.REPARTIDOR)));

        // Assert
        verify(perfilClienteRepository).save(any(PerfilCliente.class));
        verify(perfilRepartidorRepository).save(any(PerfilRepartidor.class));
        verify(perfilComercioRepository, never()).save(any());
    }

    @Test
    @DisplayName("actualizarPerfilCliente persiste alérgenos, restricciones, picante y presupuesto")
    void shouldPersistirHabitosWhenActualizaPerfilCliente() {
        // Arrange
        Usuario usuario = usuario();
        PerfilCliente perfil = PerfilCliente.builder().usuario(usuario).build();
        when(perfilClienteRepository.findById(7L)).thenReturn(Optional.of(perfil));
        when(perfilClienteRepository.save(any(PerfilCliente.class)))
            .thenAnswer(invocacion -> invocacion.getArgument(0));

        ActualizarPerfilClienteRequest request = new ActualizarPerfilClienteRequest();
        request.setAlergenosEvitar(new HashSet<>(Set.of(Alergeno.MANI, Alergeno.GLUTEN)));
        request.setRestriccionesDieteticas(new HashSet<>(Set.of(RestriccionDietetica.VEGANO)));
        request.setToleranciaPicante(ToleranciaPicante.MEDIA);
        request.setPresupuestoReferencia(new BigDecimal("20.00"));

        // Act
        perfilService.actualizarPerfilCliente(usuario, request);

        // Assert
        ArgumentCaptor<PerfilCliente> captor = ArgumentCaptor.forClass(PerfilCliente.class);
        verify(perfilClienteRepository).save(captor.capture());
        PerfilCliente guardado = captor.getValue();
        assertThat(guardado.getAlergenosEvitar()).containsExactlyInAnyOrder(Alergeno.MANI, Alergeno.GLUTEN);
        assertThat(guardado.getRestriccionesDieteticas()).containsExactly(RestriccionDietetica.VEGANO);
        assertThat(guardado.getToleranciaPicante()).isEqualTo(ToleranciaPicante.MEDIA);
        assertThat(guardado.getPresupuestoReferencia()).isEqualByComparingTo("20.00");
    }

    @Test
    @DisplayName("actualizarPerfilCliente guarda conjuntos vacíos cuando el request no trae alérgenos")
    void shouldGuardarConjuntosVaciosWhenRequestSinAlergenos() {
        // Arrange
        Usuario usuario = usuario();
        PerfilCliente perfil = PerfilCliente.builder().usuario(usuario).build();
        when(perfilClienteRepository.findById(7L)).thenReturn(Optional.of(perfil));
        when(perfilClienteRepository.save(any(PerfilCliente.class)))
            .thenAnswer(invocacion -> invocacion.getArgument(0));

        ActualizarPerfilClienteRequest request = new ActualizarPerfilClienteRequest();

        // Act
        perfilService.actualizarPerfilCliente(usuario, request);

        // Assert
        ArgumentCaptor<PerfilCliente> captor = ArgumentCaptor.forClass(PerfilCliente.class);
        verify(perfilClienteRepository).save(captor.capture());
        PerfilCliente guardado = captor.getValue();
        assertThat(guardado.getAlergenosEvitar()).isEmpty();
        assertThat(guardado.getRestriccionesDieteticas()).isEmpty();
    }
}
