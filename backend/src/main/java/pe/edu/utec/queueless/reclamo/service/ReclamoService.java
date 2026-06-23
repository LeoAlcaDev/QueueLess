package pe.edu.utec.queueless.reclamo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.reclamo.dto.AcuseReclamoResponse;
import pe.edu.utec.queueless.reclamo.dto.CrearReclamoRequest;
import pe.edu.utec.queueless.reclamo.dto.ReclamoResponse;
import pe.edu.utec.queueless.reclamo.dto.ResponderReclamoRequest;
import pe.edu.utec.queueless.reclamo.entity.DestinatarioReclamo;
import pe.edu.utec.queueless.reclamo.entity.EstadoReclamo;
import pe.edu.utec.queueless.reclamo.entity.Reclamo;
import pe.edu.utec.queueless.reclamo.event.ReclamoRegistradoEvent;
import pe.edu.utec.queueless.reclamo.event.ReclamoRespondidoEvent;
import pe.edu.utec.queueless.reclamo.repository.ReclamoRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.security.SecureRandom;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Libro de reclamaciones: registra reclamos con su acuse y código de constancia, calcula
 * el plazo legal de respuesta, y deja al comercio responder los suyos. El enrutamiento de
 * los correos lo hace el listener tras el commit. Ver ADR-0029.
 */
@Service
@RequiredArgsConstructor
public class ReclamoService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALFABETO_CODIGO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final int LONGITUD_SUFIJO_CODIGO = 5;
    private static final int MAX_INTENTOS_CODIGO = 5;
    private static final DateTimeFormatter FORMATO_FECHA_CODIGO = DateTimeFormatter.ofPattern("yyMMdd");

    private final ReclamoRepository reclamoRepository;
    private final PuntoDeVentaRepository puntoDeVentaRepository;
    private final PedidoRepository pedidoRepository;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${queueless.reclamo.plazo-respuesta-dias-habiles}")
    private int plazoDiasHabiles;

    @Transactional
    public AcuseReclamoResponse registrar(Usuario usuario, CrearReclamoRequest request) {
        PuntoDeVenta puntoDeVenta = resolverPuntoDeVenta(request);
        Pedido pedido = resolverPedido(usuario, request.getPedidoId());

        Reclamo reclamo = Reclamo.builder()
            .usuario(usuario)
            .tipo(request.getTipo())
            .contra(request.getContra())
            .puntoDeVenta(puntoDeVenta)
            .pedido(pedido)
            .detalle(request.getDetalle())
            .codigoConstancia(generarCodigoConstancia())
            .estado(EstadoReclamo.PENDIENTE)
            .plazoRespuestaAt(calcularPlazoRespuesta())
            .build();
        reclamoRepository.save(reclamo);

        eventPublisher.publishEvent(new ReclamoRegistradoEvent(reclamo.getId()));
        return AcuseReclamoResponse.de(reclamo, mensajeAcuse());
    }

    @Transactional
    public ReclamoResponse responder(Usuario gestor, Long reclamoId, ResponderReclamoRequest request) {
        Reclamo reclamo = reclamoRepository.findById(reclamoId)
            .orElseThrow(() -> new ResourceNotFoundException("Reclamo", reclamoId));

        // Solo el comercio dueño del local del reclamo puede responderlo; uno ajeno se ve
        // como inexistente, con el mismo criterio del resto del proyecto (ADR-0013).
        if (reclamo.getContra() != DestinatarioReclamo.COMERCIO
                || reclamo.getPuntoDeVenta() == null
                || !reclamo.getPuntoDeVenta().getGestor().getId().equals(gestor.getId())) {
            throw new ResourceNotFoundException("Reclamo", reclamoId);
        }

        reclamo.setRespuesta(request.getRespuesta());
        reclamo.setEstado(EstadoReclamo.RESPONDIDO);
        reclamo.setRespondidoAt(Instant.now());
        reclamoRepository.save(reclamo);

        eventPublisher.publishEvent(new ReclamoRespondidoEvent(reclamo.getId()));
        return ReclamoResponse.de(reclamo);
    }

    /** Carga un reclamo o falla con 404; la usa el listener de correo dentro de su transacción. */
    @Transactional(readOnly = true)
    public Reclamo findById(Long id) {
        return reclamoRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Reclamo", id));
    }

    @Transactional(readOnly = true)
    public List<ReclamoResponse> listarMios(Usuario usuario) {
        List<ReclamoResponse> resultado = new ArrayList<>();
        for (Reclamo reclamo : reclamoRepository.findByUsuarioIdOrderByCreatedAtDescIdDesc(usuario.getId())) {
            resultado.add(ReclamoResponse.de(reclamo));
        }
        return resultado;
    }

    @Transactional(readOnly = true)
    public List<ReclamoResponse> listarParaComercio(Usuario gestor) {
        List<ReclamoResponse> resultado = new ArrayList<>();
        for (Reclamo reclamo : reclamoRepository.findByPuntoDeVentaGestorIdOrderByCreatedAtDescIdDesc(gestor.getId())) {
            resultado.add(ReclamoResponse.de(reclamo));
        }
        return resultado;
    }

    private PuntoDeVenta resolverPuntoDeVenta(CrearReclamoRequest request) {
        if (request.getContra() != DestinatarioReclamo.COMERCIO) {
            return null;   // un reclamo contra la plataforma no apunta a un local
        }
        if (request.getPuntoDeVentaId() == null) {
            throw new BusinessRuleException("Un reclamo contra un comercio debe indicar el local");
        }
        return puntoDeVentaRepository.findByIdAndActivoTrue(request.getPuntoDeVentaId())
            .orElseThrow(() -> new ResourceNotFoundException("PuntoDeVenta", request.getPuntoDeVentaId()));
    }

    private Pedido resolverPedido(Usuario usuario, Long pedidoId) {
        if (pedidoId == null) {
            return null;
        }
        Pedido pedido = pedidoRepository.findById(pedidoId)
            .orElseThrow(() -> new ResourceNotFoundException("Pedido", pedidoId));
        // Solo se puede relacionar un pedido propio; uno ajeno se ve como inexistente.
        if (!pedido.getCliente().getId().equals(usuario.getId())) {
            throw new ResourceNotFoundException("Pedido", pedidoId);
        }
        return pedido;
    }

    private String generarCodigoConstancia() {
        for (int intento = 0; intento < MAX_INTENTOS_CODIGO; intento++) {
            String candidato = construirCodigo();
            if (reclamoRepository.findByCodigoConstancia(candidato).isEmpty()) {
                return candidato;
            }
        }
        throw new IllegalStateException("No se pudo generar un codigo de constancia unico");
    }

    private String construirCodigo() {
        String fecha = LocalDate.now(TiempoLima.ZONA).format(FORMATO_FECHA_CODIGO);
        StringBuilder sufijo = new StringBuilder(LONGITUD_SUFIJO_CODIGO);
        for (int i = 0; i < LONGITUD_SUFIJO_CODIGO; i++) {
            sufijo.append(ALFABETO_CODIGO.charAt(RANDOM.nextInt(ALFABETO_CODIGO.length())));
        }
        return "LR-" + fecha + "-" + sufijo;
    }

    /**
     * Fecha límite de respuesta: suma los días hábiles del plazo saltando fines de semana.
     * Es una aproximación documentada: no contempla feriados, así que puede acortar
     * levemente el plazo frente al cálculo legal exacto, nunca alargarlo (ADR-0029).
     */
    private Instant calcularPlazoRespuesta() {
        LocalDate fecha = LocalDate.now(TiempoLima.ZONA);
        int habilesAgregados = 0;
        while (habilesAgregados < plazoDiasHabiles) {
            fecha = fecha.plusDays(1);
            DayOfWeek dia = fecha.getDayOfWeek();
            if (dia != DayOfWeek.SATURDAY && dia != DayOfWeek.SUNDAY) {
                habilesAgregados++;
            }
        }
        return fecha.atTime(LocalTime.MAX).atZone(TiempoLima.ZONA).toInstant();
    }

    private String mensajeAcuse() {
        return "Tu reclamo fue registrado. Te responderemos dentro del plazo de "
            + plazoDiasHabiles + " días hábiles.";
    }
}
