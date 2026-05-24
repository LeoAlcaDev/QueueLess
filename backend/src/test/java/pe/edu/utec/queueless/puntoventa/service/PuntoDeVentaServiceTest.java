package pe.edu.utec.queueless.puntoventa.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.puntoventa.dto.ActualizarPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Reglas del CRUD de puntos de venta. Sin Spring ni DB: el repositorio esta mockeado.
 * Patron AAA.
 */
@ExtendWith(MockitoExtension.class)
class PuntoDeVentaServiceTest {

    @Mock
    private PuntoDeVentaRepository repository;

    @InjectMocks
    private PuntoDeVentaService service;

    private Usuario usuario(Long id, Rol... roles) {
        Usuario usuario = Usuario.builder()
            .email("user" + id + "@utec.edu.pe")
            .passwordHash("hash")
            .nombreCompleto("Usuario " + id)
            .roles(new HashSet<>(Set.of(roles)))
            .build();
        usuario.setId(id);
        return usuario;
    }

    private PuntoDeVenta local(Long id, Usuario gestor, boolean activo) {
        PuntoDeVenta local = PuntoDeVenta.builder()
            .nombre("Local " + id)
            .ubicacion("Bloque A")
            .abierto(true)
            .activo(activo)
            .tiempoPromedioDeclarado(10)
            .gestor(gestor)
            .build();
        local.setId(id);
        return local;
    }

    private CrearPuntoDeVentaRequest crearRequest() {
        CrearPuntoDeVentaRequest request = new CrearPuntoDeVentaRequest();
        request.setNombre("Cafe nuevo");
        request.setUbicacion("Bloque B");
        return request;
    }

    private ActualizarPuntoDeVentaRequest actualizarRequest() {
        ActualizarPuntoDeVentaRequest request = new ActualizarPuntoDeVentaRequest();
        request.setNombre("Cafe renombrado");
        request.setUbicacion("Bloque C");
        return request;
    }

    @Test
    @DisplayName("crear sin rol COMERCIO lanza BusinessRuleException y no guarda")
    void crearSinRolComercioFalla() {
        // Arrange
        Usuario cliente = usuario(1L, Rol.CLIENTE);

        // Act + Assert
        assertThatThrownBy(() -> service.crearComoComercio(cliente, crearRequest()))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("crear con rol COMERCIO guarda el local y arranca abierto")
    void crearConRolComercioGuarda() {
        // Arrange
        Usuario comercio = usuario(2L, Rol.COMERCIO);
        when(repository.save(any(PuntoDeVenta.class))).thenAnswer(invocacion -> {
            PuntoDeVenta guardado = invocacion.getArgument(0);
            guardado.setId(50L);
            return guardado;
        });

        // Act
        PuntoDeVentaResponse response = service.crearComoComercio(comercio, crearRequest());

        // Assert
        assertThat(response.getId()).isEqualTo(50L);
        assertThat(response.getAbierto()).isTrue();
        verify(repository).save(any(PuntoDeVenta.class));
    }

    @Test
    @DisplayName("actualizar un local de otro comercio lanza BusinessRuleException")
    void actualizarLocalAjenoFalla() {
        // Arrange
        Usuario comercio = usuario(2L, Rol.COMERCIO);
        Usuario otroComercio = usuario(3L, Rol.COMERCIO);
        PuntoDeVenta ajeno = local(50L, otroComercio, true);
        when(repository.findByIdAndActivoTrue(50L)).thenReturn(Optional.of(ajeno));

        // Act + Assert
        assertThatThrownBy(() -> service.actualizar(comercio, 50L, actualizarRequest()))
            .isInstanceOf(BusinessRuleException.class);
        verify(repository, never()).save(any());
    }

    @Test
    @DisplayName("actualizar un local inactivo se comporta como 404")
    void actualizarLocalInactivoDevuelve404() {
        // Arrange
        Usuario comercio = usuario(2L, Rol.COMERCIO);
        when(repository.findByIdAndActivoTrue(50L)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> service.actualizar(comercio, 50L, actualizarRequest()))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("cambiarEstado togglea el campo abierto del local")
    void cambiarEstadoTogglea() {
        // Arrange
        Usuario comercio = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta propio = local(50L, comercio, true);
        when(repository.findByIdAndActivoTrue(50L)).thenReturn(Optional.of(propio));
        when(repository.save(any(PuntoDeVenta.class))).thenAnswer(invocacion -> invocacion.getArgument(0));

        // Act
        PuntoDeVentaResponse response = service.cambiarEstado(comercio, 50L, false);

        // Assert
        assertThat(response.getAbierto()).isFalse();
        assertThat(propio.getAbierto()).isFalse();
    }

    @Test
    @DisplayName("eliminar marca el local como inactivo (soft delete) sin borrarlo")
    void eliminarMarcaInactivo() {
        // Arrange
        Usuario comercio = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta propio = local(50L, comercio, true);
        when(repository.findById(50L)).thenReturn(Optional.of(propio));

        // Act
        service.eliminar(comercio, 50L);

        // Assert
        assertThat(propio.getActivo()).isFalse();
        verify(repository).save(propio);
        verify(repository, never()).delete(any());
    }

    @Test
    @DisplayName("eliminar un local ya inactivo es idempotente: no falla ni vuelve a guardar")
    void eliminarEsIdempotente() {
        // Arrange
        Usuario comercio = usuario(2L, Rol.COMERCIO);
        PuntoDeVenta yaInactivo = local(50L, comercio, false);
        when(repository.findById(50L)).thenReturn(Optional.of(yaInactivo));

        // Act
        service.eliminar(comercio, 50L);

        // Assert
        verify(repository, never()).save(any());
    }
}
