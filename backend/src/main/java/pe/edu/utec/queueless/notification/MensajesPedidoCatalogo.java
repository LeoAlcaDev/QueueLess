package pe.edu.utec.queueless.notification;

import pe.edu.utec.queueless.pedido.entity.EstadoPedido;

import java.util.Map;

import static java.util.Map.entry;

/**
 * Catálogo de los mensajes push que recibe el cliente según el estado nuevo de su
 * pedido. Centralizar los textos acá permite cambiarlos sin tocar la lógica del
 * listener, y verificar con un test que hay un mensaje por cada estado que notifica.
 *
 * <p>PENDIENTE_PAGO no figura: ese estado no notifica (el cliente está pagando). La
 * cancelación del cliente desde PENDIENTE_PAGO tampoco notifica, pero ese filtro
 * depende del estado anterior y vive en el listener.
 */
public final class MensajesPedidoCatalogo {

    private static final Map<EstadoPedido, MensajePush> MENSAJES = Map.ofEntries(
        entry(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR, new MensajePush(
            "Buscando repartidor",
            "Te avisamos en cuanto alguien tome tu pedido. Tenés 4 minutos.")),
        entry(EstadoPedido.PAGADO_ESPERANDO_COMERCIO, new MensajePush(
            "Pago confirmado",
            "El local ya puede aceptar tu pedido.")),
        entry(EstadoPedido.ACEPTADO, new MensajePush(
            "Tu pedido fue aceptado",
            "El local empezó a preparar lo que pediste.")),
        entry(EstadoPedido.EN_PREPARACION, new MensajePush(
            "En preparación",
            "Estamos preparando tu pedido.")),
        entry(EstadoPedido.LISTO_PARA_RECOGER, new MensajePush(
            "Tu pedido está listo",
            "Pasá a recoger por el local cuando puedas.")),
        entry(EstadoPedido.LISTO_PARA_DELIVERY, new MensajePush(
            "Listo para entregar",
            "El repartidor lo va a recoger en breve.")),
        entry(EstadoPedido.ENTREGADO, new MensajePush(
            "Entregado",
            "Gracias por usar QueueLess. ¿Querés dejar una reseña?")),
        entry(EstadoPedido.CANCELADO_POR_CLIENTE, new MensajePush(
            "Pedido cancelado",
            "Cancelamos tu pedido. Si pagaste, recibís el reembolso pronto.")),
        entry(EstadoPedido.CANCELADO_POR_COMERCIO, new MensajePush(
            "Cancelado por el local",
            "Lamentamos los inconvenientes. Si pagaste, recibís el reembolso pronto.")),
        entry(EstadoPedido.EXPIRADO, new MensajePush(
            "Pedido expirado",
            "No se recogió a tiempo. Hablá con el local si necesitás algo."))
    );

    private MensajesPedidoCatalogo() {
    }

    /** Devuelve el mensaje para un estado, o {@code null} si ese estado no notifica. */
    public static MensajePush para(EstadoPedido estado) {
        return MENSAJES.get(estado);
    }
}
