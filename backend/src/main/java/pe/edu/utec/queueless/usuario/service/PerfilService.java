package pe.edu.utec.queueless.usuario.service;

import lombok.RequiredArgsConstructor;
import org.modelmapper.ModelMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.dto.*;
import pe.edu.utec.queueless.usuario.entity.*;
import pe.edu.utec.queueless.usuario.repository.PerfilClienteRepository;
import pe.edu.utec.queueless.usuario.repository.PerfilComercioRepository;
import pe.edu.utec.queueless.usuario.repository.PerfilRepartidorRepository;

import java.util.Set;

/**
 * Operaciones sobre los 3 perfiles del usuario: creacion del perfil vacio al activar
 * un rol, lectura y actualizacion de los datos editables por el propio usuario.
 *
 * <p>Invariante del dominio (ADR-0007): cada rol activo de un usuario tiene su perfil
 * correspondiente. Por eso el perfil se crea en el mismo flujo que activa el rol.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class PerfilService {

    private final PerfilClienteRepository perfilClienteRepository;
    private final PerfilComercioRepository perfilComercioRepository;
    private final PerfilRepartidorRepository perfilRepartidorRepository;
    private final ModelMapper modelMapper;

    // ---------------------------------------------------------------------------
    // Creacion de perfiles vacios (usado por register y por activarRol)
    // ---------------------------------------------------------------------------

    /** Crea el perfil vacio de cada rol del conjunto. Usado al registrar un usuario. */
    public void crearPerfilesParaRoles(Usuario usuario, Set<Rol> roles) {
        for (Rol rol : roles) {
            crearPerfilParaRol(usuario, rol);
        }
    }

    /**
     * Crea el perfil vacio correspondiente a un rol, con sus valores default. Es
     * idempotente: si el perfil ya existe no lo recrea (evita violar la PK).
     */
    public void crearPerfilParaRol(Usuario usuario, Rol rol) {
        Long usuarioId = usuario.getId();
        switch (rol) {
            case CLIENTE -> {
                if (!perfilClienteRepository.existsById(usuarioId)) {
                    perfilClienteRepository.save(PerfilCliente.builder().usuario(usuario).build());
                }
            }
            case COMERCIO -> {
                if (!perfilComercioRepository.existsById(usuarioId)) {
                    perfilComercioRepository.save(PerfilComercio.builder().usuario(usuario).build());
                }
            }
            case REPARTIDOR -> {
                if (!perfilRepartidorRepository.existsById(usuarioId)) {
                    perfilRepartidorRepository.save(PerfilRepartidor.builder().usuario(usuario).build());
                }
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Lectura
    // ---------------------------------------------------------------------------

    /** Devuelve los perfiles del usuario segun los roles que tenga activos. */
    @Transactional(readOnly = true)
    public PerfilesResponse obtenerPerfiles(Usuario usuario) {
        PerfilesResponse.PerfilesResponseBuilder respuesta = PerfilesResponse.builder();

        if (usuario.tieneRol(Rol.CLIENTE)) {
            respuesta.cliente(modelMapper.map(buscarPerfilCliente(usuario), PerfilClienteResponse.class));
        }
        if (usuario.tieneRol(Rol.COMERCIO)) {
            respuesta.comercio(modelMapper.map(buscarPerfilComercio(usuario), PerfilComercioResponse.class));
        }
        if (usuario.tieneRol(Rol.REPARTIDOR)) {
            respuesta.repartidor(modelMapper.map(buscarPerfilRepartidor(usuario), PerfilRepartidorResponse.class));
        }
        return respuesta.build();
    }

    // ---------------------------------------------------------------------------
    // Actualizacion (solo los campos que el propio usuario puede editar)
    // ---------------------------------------------------------------------------

    public PerfilClienteResponse actualizarPerfilCliente(Usuario usuario,
                                                         ActualizarPerfilClienteRequest request) {
        PerfilCliente perfil = buscarPerfilCliente(usuario);
        perfil.setDireccionPreferida(request.getDireccionPreferida());
        perfil.setAlergias(request.getAlergias());
        PerfilCliente actualizado = perfilClienteRepository.save(perfil);
        return modelMapper.map(actualizado, PerfilClienteResponse.class);
    }

    public PerfilComercioResponse actualizarPerfilComercio(Usuario usuario,
                                                          ActualizarPerfilComercioRequest request) {
        PerfilComercio perfil = buscarPerfilComercio(usuario);
        perfil.setRuc(request.getRuc());
        perfil.setContactoTelefono(request.getContactoTelefono());
        perfil.setContactoEmail(request.getContactoEmail());
        PerfilComercio actualizado = perfilComercioRepository.save(perfil);
        return modelMapper.map(actualizado, PerfilComercioResponse.class);
    }

    public PerfilRepartidorResponse actualizarPerfilRepartidor(Usuario usuario,
                                                              ActualizarPerfilRepartidorRequest request) {
        PerfilRepartidor perfil = buscarPerfilRepartidor(usuario);
        perfil.setDisponible(request.getDisponible());
        PerfilRepartidor actualizado = perfilRepartidorRepository.save(perfil);
        return modelMapper.map(actualizado, PerfilRepartidorResponse.class);
    }

    // ---------------------------------------------------------------------------
    // Helpers: cargan el perfil del usuario o lanzan 404 si no existe.
    // Por la invariante, "no existe" implica que el usuario no tiene ese rol.
    // ---------------------------------------------------------------------------

    private PerfilCliente buscarPerfilCliente(Usuario usuario) {
        return perfilClienteRepository.findById(usuario.getId())
            .orElseThrow(() -> new ResourceNotFoundException("El usuario no tiene perfil de cliente"));
    }

    private PerfilComercio buscarPerfilComercio(Usuario usuario) {
        return perfilComercioRepository.findById(usuario.getId())
            .orElseThrow(() -> new ResourceNotFoundException("El usuario no tiene perfil de comercio"));
    }

    private PerfilRepartidor buscarPerfilRepartidor(Usuario usuario) {
        return perfilRepartidorRepository.findById(usuario.getId())
            .orElseThrow(() -> new ResourceNotFoundException("El usuario no tiene perfil de repartidor"));
    }
}
