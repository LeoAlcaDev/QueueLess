package pe.edu.utec.queueless.puntoventa.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.puntoventa.dto.ActualizarPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ForbiddenOperationException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PuntoDeVentaService {

    private static final int TIEMPO_PROMEDIO_POR_DEFECTO = 10;

    private final PuntoDeVentaRepository repository;

    // ---------------------------------------------------------------------------
    // Catalogo publico
    // ---------------------------------------------------------------------------

    public List<PuntoDeVentaResponse> listarAbiertos() {
        List<PuntoDeVenta> locales = repository.findByAbiertoTrueAndActivoTrue();
        return toResponseList(locales);
    }

    /** Detalle publico. Un local dado de baja se ve como inexistente (404). */
    public PuntoDeVentaResponse obtenerDetallePublico(Long id) {
        PuntoDeVenta puntoDeVenta = repository.findByIdAndActivoTrue(id)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", id));
        return toResponse(puntoDeVenta);
    }

    // ---------------------------------------------------------------------------
    // Gestion por el comercio
    // ---------------------------------------------------------------------------

    public List<PuntoDeVentaResponse> listarPorGestor(Usuario gestor) {
        List<PuntoDeVenta> locales = repository.findByGestorIdAndActivoTrue(gestor.getId());
        return toResponseList(locales);
    }

    @Transactional
    public PuntoDeVentaResponse crearComoComercio(Usuario gestor, CrearPuntoDeVentaRequest request) {
        validarEsComercio(gestor);
        validarHorarios(request.getHorarioApertura(), request.getHorarioCierre());

        PuntoDeVenta puntoDeVenta = PuntoDeVenta.builder()
            .nombre(request.getNombre())
            .ubicacion(request.getUbicacion())
            .horarioApertura(request.getHorarioApertura())
            .horarioCierre(request.getHorarioCierre())
            .tiempoPromedioDeclarado(tiempoOPorDefecto(request.getTiempoPromedioDeclarado()))
            .abierto(true)
            .activo(true)
            .gestor(gestor)
            .build();

        PuntoDeVenta guardado = repository.save(puntoDeVenta);
        return toResponse(guardado);
    }

    @Transactional
    public PuntoDeVentaResponse actualizar(Usuario gestor, Long id, ActualizarPuntoDeVentaRequest request) {
        PuntoDeVenta puntoDeVenta = buscarActivoDelGestor(gestor, id);
        validarHorarios(request.getHorarioApertura(), request.getHorarioCierre());

        puntoDeVenta.setNombre(request.getNombre());
        puntoDeVenta.setUbicacion(request.getUbicacion());
        puntoDeVenta.setHorarioApertura(request.getHorarioApertura());
        puntoDeVenta.setHorarioCierre(request.getHorarioCierre());
        puntoDeVenta.setTiempoPromedioDeclarado(tiempoOPorDefecto(request.getTiempoPromedioDeclarado()));

        PuntoDeVenta actualizado = repository.save(puntoDeVenta);
        return toResponse(actualizado);
    }

    @Transactional
    public PuntoDeVentaResponse cambiarEstado(Usuario gestor, Long id, boolean abierto) {
        PuntoDeVenta puntoDeVenta = buscarActivoDelGestor(gestor, id);
        puntoDeVenta.setAbierto(abierto);
        PuntoDeVenta actualizado = repository.save(puntoDeVenta);
        return toResponse(actualizado);
    }

    /**
     * Da de baja un local (soft delete: activo = false), conservando la fila para los
     * pedidos historicos. Es idempotente: dar de baja un local ya inactivo no falla.
     */
    @Transactional
    public void eliminar(Usuario gestor, Long id) {
        PuntoDeVenta puntoDeVenta = repository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", id));
        validarEsDelGestor(puntoDeVenta, gestor);

        if (!puntoDeVenta.getActivo()) {
            return;
        }
        puntoDeVenta.setActivo(false);
        repository.save(puntoDeVenta);
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private PuntoDeVenta buscarActivoDelGestor(Usuario gestor, Long id) {
        PuntoDeVenta puntoDeVenta = repository.findByIdAndActivoTrue(id)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", id));
        validarEsDelGestor(puntoDeVenta, gestor);
        return puntoDeVenta;
    }

    private void validarEsDelGestor(PuntoDeVenta puntoDeVenta, Usuario gestor) {
        if (!puntoDeVenta.getGestor().getId().equals(gestor.getId())) {
            throw new BusinessRuleException("El punto de venta no pertenece a este comercio");
        }
    }

    private void validarEsComercio(Usuario gestor) {
        if (!gestor.tieneRol(Rol.COMERCIO)) {
            throw new ForbiddenOperationException("Solo un usuario con rol COMERCIO puede gestionar puntos de venta");
        }
    }

    /** Si se proveen ambos horarios, la apertura debe ser anterior al cierre. */
    private void validarHorarios(LocalTime apertura, LocalTime cierre) {
        if (apertura == null || cierre == null) {
            return;
        }
        if (!apertura.isBefore(cierre)) {
            throw new BusinessRuleException("El horario de apertura debe ser anterior al de cierre");
        }
    }

    private Integer tiempoOPorDefecto(Integer tiempo) {
        if (tiempo == null) {
            return TIEMPO_PROMEDIO_POR_DEFECTO;
        }
        return tiempo;
    }

    // El DTO expone tiempoEsperaEstimado, pero por ahora refleja el tiempo declarado
    // por el comercio; el calculo predictivo real entra en una fase posterior.
    private PuntoDeVentaResponse toResponse(PuntoDeVenta puntoDeVenta) {
        return PuntoDeVentaResponse.builder()
            .id(puntoDeVenta.getId())
            .nombre(puntoDeVenta.getNombre())
            .ubicacion(puntoDeVenta.getUbicacion())
            .horarioApertura(puntoDeVenta.getHorarioApertura())
            .horarioCierre(puntoDeVenta.getHorarioCierre())
            .tiempoEsperaEstimado(puntoDeVenta.getTiempoPromedioDeclarado())
            .abierto(puntoDeVenta.getAbierto())
            .build();
    }

    private List<PuntoDeVentaResponse> toResponseList(List<PuntoDeVenta> locales) {
        List<PuntoDeVentaResponse> respuesta = new ArrayList<>();
        for (PuntoDeVenta puntoDeVenta : locales) {
            respuesta.add(toResponse(puntoDeVenta));
        }
        return respuesta;
    }
}
