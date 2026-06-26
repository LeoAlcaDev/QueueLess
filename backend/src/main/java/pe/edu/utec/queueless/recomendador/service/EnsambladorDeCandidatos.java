package pe.edu.utec.queueless.recomendador.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.ocupacion.dto.OcupacionResponse;
import pe.edu.utec.queueless.ocupacion.service.OcupacionService;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.usuario.entity.PerfilCliente;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.PerfilClienteRepository;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;

/**
 * Arma, en código y antes de que intervenga el modelo, el conjunto de platos seguros y
 * pedibles ahora para un cliente. Reúne los productos pedibles de los locales abiertos
 * (reusa el catálogo y su disponibilidad ya calculada, {@code ProductoService}), les adjunta
 * el tiempo por local ({@code OcupacionService}) y el contraste con el presupuesto, y aplica
 * el filtro de seguridad. Es solo lectura y devuelve valores desligados de la base, para que
 * la llamada al modelo ocurra después, fuera de la transacción.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EnsambladorDeCandidatos {

    private final PerfilClienteRepository perfilClienteRepository;
    private final PuntoDeVentaRepository puntoDeVentaRepository;
    private final ProductoService productoService;
    private final OcupacionService ocupacionService;

    @Value("${queueless.recomendador.maximo-candidatos}")
    private int maximoCandidatos;

    public List<Candidato> ensamblar(Usuario usuario, Long puntoDeVentaId) {
        PerfilSeguridad perfil = leerPerfil(usuario);

        List<Candidato> candidatos = new ArrayList<>();
        for (PuntoDeVenta local : localesAConsiderar(puntoDeVentaId)) {
            candidatos.addAll(candidatosDelLocal(local, perfil.presupuestoReferencia()));
        }

        List<Candidato> seguros = FiltroDeSeguridad.filtrar(perfil, candidatos);
        return preordenarYAcotar(seguros);
    }

    private PerfilSeguridad leerPerfil(Usuario usuario) {
        PerfilCliente perfil = perfilClienteRepository.findById(usuario.getId())
            .orElseThrow(() -> new ResourceNotFoundException("El usuario no tiene perfil de cliente"));
        // Copiamos los conjuntos a estructuras propias para que el perfil quede desligado de la
        // base y se pueda usar sin la transacción abierta.
        return new PerfilSeguridad(
            new HashSet<>(perfil.getAlergenosEvitar()),
            new HashSet<>(perfil.getRestriccionesDieteticas()),
            perfil.getToleranciaPicante(),
            perfil.getPresupuestoReferencia());
    }

    private List<PuntoDeVenta> localesAConsiderar(Long puntoDeVentaId) {
        if (puntoDeVentaId != null) {
            PuntoDeVenta local = puntoDeVentaRepository.findByIdAndActivoTrue(puntoDeVentaId)
                .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", puntoDeVentaId));
            return estaAtendiendo(local) ? List.of(local) : List.of();
        }
        List<PuntoDeVenta> atendiendo = new ArrayList<>();
        for (PuntoDeVenta local : puntoDeVentaRepository.findByAbiertoTrueAndActivoTrue()) {
            if (estaAtendiendo(local)) {
                atendiendo.add(local);
            }
        }
        return atendiendo;
    }

    // El local atiende si su switch manual está en abierto y la hora de Lima cae en su horario;
    // sin horario declarado, basta el switch.
    private boolean estaAtendiendo(PuntoDeVenta local) {
        if (!Boolean.TRUE.equals(local.getAbierto())) {
            return false;
        }
        LocalTime apertura = local.getHorarioApertura();
        LocalTime cierre = local.getHorarioCierre();
        if (apertura == null || cierre == null) {
            return true;
        }
        LocalTime ahora = TiempoLima.ahora();
        return !ahora.isBefore(apertura) && !ahora.isAfter(cierre);
    }

    private List<Candidato> candidatosDelLocal(PuntoDeVenta local, BigDecimal presupuesto) {
        OcupacionResponse ocupacion = ocupacionService.curvaParaCliente(local.getId());
        int minutos = ocupacion.getMinutosAhora();

        List<Candidato> candidatos = new ArrayList<>();
        for (ProductoResponse producto : productoService.listarPorPuntoDeVenta(local.getId())) {
            if (!Boolean.TRUE.equals(producto.getDisponibleAhora())) {
                continue;   // fuera de su horario o de su ventana de pedido en este momento
            }
            candidatos.add(aCandidato(local, producto, minutos, presupuesto));
        }
        return candidatos;
    }

    private Candidato aCandidato(PuntoDeVenta local, ProductoResponse producto, int minutos,
                                 BigDecimal presupuesto) {
        boolean dentroDePresupuesto = presupuesto == null
            || producto.getPrecio().compareTo(presupuesto) <= 0;
        return new Candidato(
            producto.getId(),
            producto.getNombre(),
            producto.getDescripcion(),
            producto.getPrecio(),
            local.getId(),
            local.getNombre(),
            minutos,
            dentroDePresupuesto,
            new HashSet<>(producto.getAlergenos()),
            new HashSet<>(producto.getAptitudesDieteticas()),
            producto.getNivelPicante());
    }

    // Pre-orden barato para mandar al modelo (y para el degradado): primero lo que entra en
    // presupuesto, luego lo más rápido, luego lo más barato. Acotamos la cantidad para que el
    // contexto del modelo sea el mínimo necesario; lo que queda fuera ya pasó el filtro, solo
    // no entra en esta tanda.
    private List<Candidato> preordenarYAcotar(List<Candidato> candidatos) {
        List<Candidato> ordenados = new ArrayList<>(candidatos);
        ordenados.sort(
            Comparator.comparingInt((Candidato c) -> c.dentroDePresupuesto() ? 0 : 1)  // en presupuesto primero
                .thenComparingInt(Candidato::minutosEstimados)                          // luego lo más rápido
                .thenComparing(Candidato::precio));                                     // luego lo más barato
        if (ordenados.size() > maximoCandidatos) {
            return new ArrayList<>(ordenados.subList(0, maximoCandidatos));
        }
        return ordenados;
    }
}
