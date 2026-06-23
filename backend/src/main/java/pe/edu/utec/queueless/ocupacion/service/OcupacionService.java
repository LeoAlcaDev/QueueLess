package pe.edu.utec.queueless.ocupacion.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.ocupacion.dto.FranjaOcupacion;
import pe.edu.utec.queueless.ocupacion.dto.OcupacionResponse;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.waittime.service.WaitTimeService;
import pe.edu.utec.queueless.waittime.strategy.ManualDeclaredStrategy;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Calcula la curva de ocupación de un local agregando su historial de pedidos por
 * día de la semana y hora del día (en zona Lima). Es solo lectura: no toca esquema
 * ni estados. Ver ADR-0028.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OcupacionService {

    private final PuntoDeVentaRepository puntoDeVentaRepository;
    private final PedidoRepository pedidoRepository;

    // Reusamos la fórmula de la estimación manual (declarado + cola × peso) alimentándola
    // con la ocupación de la franja, no con la cola del momento. Ver ADR-0028 y ADR-0015.
    private final ManualDeclaredStrategy estrategiaManual;

    // El tiempo "del ahora" sale de aquí sin tocarse; mira la cola presente, no la franja.
    private final WaitTimeService waitTimeService;

    @Value("${queueless.ocupacion.minimo-pedidos}")
    private int minimoPedidos;

    @Value("${queueless.ocupacion.ventana-dias}")
    private int ventanaDias;

    public OcupacionResponse curvaParaCliente(Long puntoDeVentaId) {
        PuntoDeVenta local = puntoDeVentaRepository.findByIdAndActivoTrue(puntoDeVentaId)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", puntoDeVentaId));
        return calcularCurva(local);
    }

    public OcupacionResponse curvaParaComercio(Usuario gestor, Long puntoDeVentaId) {
        PuntoDeVenta local = puntoDeVentaRepository.findByIdAndActivoTrue(puntoDeVentaId)
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", puntoDeVentaId));
        // Un local ajeno se ve como inexistente, igual que el resto del proyecto (ADR-0013).
        if (!local.getGestor().getId().equals(gestor.getId())) {
            throw new ResourceNotFoundException("PuntoDeVenta", puntoDeVentaId);
        }
        return calcularCurva(local);
    }

    private OcupacionResponse calcularCurva(PuntoDeVenta local) {
        LocalDate hoy = TiempoLima.fechaDe(Instant.now());
        LocalDate desdeFecha = hoy.minusDays(ventanaDias - 1L);   // la ventana incluye el día de hoy
        Instant desde = desdeFecha.atStartOfDay(TiempoLima.ZONA).toInstant();

        List<Instant> creaciones = pedidoRepository.findCreadoAtDePedidosConcretados(local.getId(), desde);

        // Contamos los pedidos por franja: día de la semana (1=lunes .. 7=domingo) × hora de Lima.
        int[][] conteo = new int[8][24];
        for (Instant creacion : creaciones) {
            LocalDateTime enLima = TiempoLima.enZonaLima(creacion);
            int dia = enLima.getDayOfWeek().getValue();
            int hora = enLima.getHour();
            conteo[dia][hora]++;
        }

        int[] ocurrenciasPorDia = contarOcurrenciasDeCadaDiaSemana(desdeFecha, hoy);
        int minutosAhora = waitTimeService.estimarMinutos(local.getId());

        List<FranjaOcupacion> franjas = new ArrayList<>();
        boolean hayDatosSuficientes = false;
        for (int dia = 1; dia <= 7; dia++) {
            for (int hora = 0; hora < 24; hora++) {
                int totalPedidos = conteo[dia][hora];
                if (totalPedidos == 0) continue;   // una franja sin ningún pedido no se reporta

                if (totalPedidos < minimoPedidos) {
                    franjas.add(FranjaOcupacion.recopilando(dia, hora));
                    continue;
                }

                hayDatosSuficientes = true;
                double pedidosTipicos = (double) totalPedidos / ocurrenciasPorDia[dia];
                int minutosFranja = estrategiaManual.estimarMinutos(local, (int) Math.round(pedidosTipicos));
                franjas.add(FranjaOcupacion.con(dia, hora, pedidosTipicos, minutosFranja));
            }
        }

        if (!hayDatosSuficientes) {
            return OcupacionResponse.recopilando(local, ventanaDias, minutosAhora);
        }
        return OcupacionResponse.con(local, ventanaDias, minutosAhora, franjas);
    }

    /** Cuántas veces cae cada día de la semana en la ventana; es el divisor del promedio por ocurrencia. */
    private int[] contarOcurrenciasDeCadaDiaSemana(LocalDate desde, LocalDate hasta) {
        int[] ocurrencias = new int[8];
        LocalDate fecha = desde;
        while (!fecha.isAfter(hasta)) {
            ocurrencias[fecha.getDayOfWeek().getValue()]++;
            fecha = fecha.plusDays(1);
        }
        return ocurrencias;
    }
}
