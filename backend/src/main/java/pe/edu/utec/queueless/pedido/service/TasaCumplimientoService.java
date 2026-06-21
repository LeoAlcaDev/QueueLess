package pe.edu.utec.queueless.pedido.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.MotivoCancelacion;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Calcula al leer la tasa de cumplimiento de un comercio con sus pedidos
 * programados: de los que fue responsable, qué proporción honró. Por debajo de un
 * mínimo de datos devuelve null ("sin datos aún") en vez de un número engañoso. Es
 * un cálculo compartido por el perfil del comercio y la vista pública del punto de
 * venta (ADR-0026).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TasaCumplimientoService {

    private final PedidoRepository pedidoRepository;

    @Value("${queueless.programado.gracia-cancelacion-minutos}")
    private long graciaCancelacionMinutos;

    @Value("${queueless.programado.minimo-pedidos-tasa}")
    private int minimoPedidos;

    /**
     * Porcentaje (0 a 100) de programados honrados sobre los que el comercio fue
     * responsable, o null si todavía no hay datos suficientes.
     */
    public BigDecimal calcular(Long gestorId) {
        List<Pedido> programados =
            pedidoRepository.findByPuntoDeVentaGestorIdAndRecojoProgramadoAtIsNotNull(gestorId);
        return calcularDesde(programados);
    }

    /** Núcleo de clasificación, separado para poder testearlo con pedidos en memoria. */
    BigDecimal calcularDesde(List<Pedido> programados) {
        int honrados = 0;
        int fallas = 0;
        for (Pedido pedido : programados) {
            if (esHonrado(pedido)) {
                honrados++;
            } else if (esFalla(pedido)) {
                fallas++;
            }
            // el resto es neutro y no entra en el denominador: declinar antes de
            // aceptar, cancelar dentro de la gracia, la cancelación del cliente, el
            // no-show (EXPIRADO) y los pedidos todavía en curso
        }
        int responsables = honrados + fallas;
        if (responsables < minimoPedidos) {
            return null;
        }
        return BigDecimal.valueOf(honrados)
            .multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(responsables), 0, RoundingMode.HALF_UP);
    }

    private boolean esHonrado(Pedido pedido) {
        return pedido.getEstado() == EstadoPedido.ENTREGADO;
    }

    private boolean esFalla(Pedido pedido) {
        if (pedido.getEstado() != EstadoPedido.CANCELADO_POR_COMERCIO) {
            return false;
        }
        // dejó lapsar un programado sin aceptarlo
        if (pedido.getMotivoCancelacion() == MotivoCancelacion.COMERCIO_NO_ATENDIO) {
            return true;
        }
        // sin aceptar y con otro motivo es un rechazo libre antes de comprometerse: neutro
        if (pedido.getAceptadoAt() == null || pedido.getCanceladoAt() == null) {
            return false;
        }
        // ya aceptado: es falla solo si canceló (o lo dejó vencer) pasada la gracia
        Instant finGracia = pedido.getAceptadoAt().plus(graciaCancelacionMinutos, ChronoUnit.MINUTES);
        return pedido.getCanceladoAt().isAfter(finGracia);
    }
}
