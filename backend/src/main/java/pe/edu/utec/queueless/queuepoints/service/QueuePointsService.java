package pe.edu.utec.queueless.queuepoints.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.queuepoints.dto.MovimientoResponse;
import pe.edu.utec.queueless.queuepoints.dto.SaldoResponse;
import pe.edu.utec.queueless.queuepoints.entity.MovimientoQueuePoints;
import pe.edu.utec.queueless.queuepoints.entity.TipoMovimiento;
import pe.edu.utec.queueless.queuepoints.repository.MovimientoQueuePointsRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.InsufficientPointsException;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Ledger de QueuePoints (ver ADR-0008). El saldo se calcula sumando los
 * movimientos; nunca se persiste un campo "puntos" en otra entidad.
 *
 * <p>Las operaciones de escritura son idempotentes por referencia: si llega un
 * segundo intento con el mismo {@code (tipo, referenciaTipo, referenciaId)}, no
 * se inserta nada nuevo y se devuelve el movimiento existente. Esto permite que
 * un listener async que reciba el mismo evento dos veces no duplique puntos.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QueuePointsService {

    private final MovimientoQueuePointsRepository repository;

    // ---------------------------------------------------------------------------
    // Consulta
    // ---------------------------------------------------------------------------

    public SaldoResponse saldoDe(Usuario usuario) {
        Integer saldo = repository.calcularSaldo(usuario.getId());
        return SaldoResponse.builder()
            .usuarioId(usuario.getId())
            .saldo(saldo == null ? 0 : saldo)
            .build();
    }

    public List<MovimientoResponse> historialDe(Usuario usuario) {
        List<MovimientoQueuePoints> movimientos =
            repository.findByUsuarioIdOrderByCreatedAtDescIdDesc(usuario.getId());
        List<MovimientoResponse> respuesta = new ArrayList<>();
        for (MovimientoQueuePoints mov : movimientos) {
            respuesta.add(MovimientoResponse.from(mov));
        }
        return respuesta;
    }

    // ---------------------------------------------------------------------------
    // Escritura
    // ---------------------------------------------------------------------------

    /**
     * Registra puntos GANADOS por el usuario. Idempotente: si ya existe un
     * movimiento GANADO con la misma referencia, devuelve el existente.
     */
    @Transactional
    public MovimientoQueuePoints registrarGanancia(Usuario usuario, int monto,
                                                   String referenciaTipo, Long referenciaId,
                                                   String descripcion) {
        return registrarConIdempotencia(usuario, TipoMovimiento.GANADO,
            monto, referenciaTipo, referenciaId, descripcion);
    }

    /**
     * Canjea puntos validando que el usuario tenga saldo suficiente. Idempotente
     * por referencia.
     */
    @Transactional
    public MovimientoQueuePoints canjear(Usuario usuario, int monto,
                                         String referenciaTipo, Long referenciaId,
                                         String descripcion) {
        Optional<MovimientoQueuePoints> existente =
            buscarExistente(TipoMovimiento.CANJEADO, referenciaTipo, referenciaId);
        if (existente.isPresent()) {
            return existente.get();
        }
        Integer saldoActual = repository.calcularSaldo(usuario.getId());
        int saldo = saldoActual == null ? 0 : saldoActual;
        if (saldo < monto) {
            throw new InsufficientPointsException(
                "Saldo insuficiente para canjear " + monto + " puntos (saldo actual: " + saldo + ")");
        }
        return guardar(usuario, TipoMovimiento.CANJEADO, monto, referenciaTipo, referenciaId, descripcion);
    }

    private MovimientoQueuePoints registrarConIdempotencia(Usuario usuario, TipoMovimiento tipo,
                                                           int monto, String referenciaTipo,
                                                           Long referenciaId, String descripcion) {
        Optional<MovimientoQueuePoints> existente =
            buscarExistente(tipo, referenciaTipo, referenciaId);
        if (existente.isPresent()) {
            log.info("Movimiento {} ya existe para {} #{}; no se duplica",
                tipo, referenciaTipo, referenciaId);
            return existente.get();
        }
        return guardar(usuario, tipo, monto, referenciaTipo, referenciaId, descripcion);
    }

    /**
     * El unique no vive en el schema (ver ADR-0008, "Riesgo de duplicación"):
     * buscamos antes de insertar. La ventana entre SELECT e INSERT bajo carga
     * concurrente es aceptable para el MVP porque los listeners async corren
     * con espacio suficiente entre reintentos.
     */
    private Optional<MovimientoQueuePoints> buscarExistente(TipoMovimiento tipo,
                                                            String referenciaTipo,
                                                            Long referenciaId) {
        if (referenciaTipo == null || referenciaId == null) {
            return Optional.empty();
        }
        return repository.findFirstByTipoAndReferenciaTipoAndReferenciaId(
            tipo, referenciaTipo, referenciaId);
    }

    private MovimientoQueuePoints guardar(Usuario usuario, TipoMovimiento tipo, int monto,
                                          String referenciaTipo, Long referenciaId,
                                          String descripcion) {
        if (monto <= 0) {
            throw new BusinessRuleException("El monto del movimiento debe ser positivo");
        }
        MovimientoQueuePoints mov = MovimientoQueuePoints.builder()
            .usuario(usuario)
            .tipo(tipo)
            .monto(monto)
            .referenciaTipo(referenciaTipo)
            .referenciaId(referenciaId)
            .descripcion(descripcion)
            .build();
        MovimientoQueuePoints guardado = repository.save(mov);
        log.info("Movimiento {} de {} pts registrado para usuario {} (ref {} #{})",
            tipo, monto, usuario.getId(), referenciaTipo, referenciaId);
        return guardado;
    }
}
