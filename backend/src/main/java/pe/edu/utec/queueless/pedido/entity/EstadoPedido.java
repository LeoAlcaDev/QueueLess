package pe.edu.utec.queueless.pedido.entity;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Estados de un Pedido y reglas de transición válidas.
 *
 * <p>La definición de transiciones vive aquí (no en una clase aparte) porque
 * son intrínsecas al estado: si estás mirando "qué es un EstadoPedido" debes
 * ver también "qué transiciones permite".
 */
public enum EstadoPedido {
    PENDIENTE_PAGO,
    PAGADO_BUSCANDO_REPARTIDOR,
    PAGADO_ESPERANDO_COMERCIO,
    ACEPTADO,
    EN_PREPARACION,
    LISTO_PARA_RECOGER,
    LISTO_PARA_DELIVERY,
    ENTREGADO,
    CANCELADO_POR_CLIENTE,
    CANCELADO_POR_COMERCIO,
    EXPIRADO;

    /** Estados desde los cuales el cliente puede cancelar y recibir reembolso. */
    public static final Set<EstadoPedido> CANCELABLES_POR_CLIENTE = EnumSet.of(
        PENDIENTE_PAGO,
        PAGADO_BUSCANDO_REPARTIDOR,
        PAGADO_ESPERANDO_COMERCIO
    );

    /** Estados desde los cuales el comercio puede cancelar. */
    public static final Set<EstadoPedido> CANCELABLES_POR_COMERCIO = EnumSet.of(
        PAGADO_ESPERANDO_COMERCIO,
        ACEPTADO,
        EN_PREPARACION
    );

    /** Estados que gatillan reembolso automático al cancelar. */
    public static final Set<EstadoPedido> GATILLAN_REEMBOLSO = EnumSet.of(
        PAGADO_BUSCANDO_REPARTIDOR,
        PAGADO_ESPERANDO_COMERCIO
    );

    public static final Set<EstadoPedido> TERMINALES = EnumSet.of(
        ENTREGADO,
        CANCELADO_POR_CLIENTE,
        CANCELADO_POR_COMERCIO,
        EXPIRADO
    );

    private static final Map<EstadoPedido, Set<EstadoPedido>> TRANSICIONES = Map.of(
        PENDIENTE_PAGO,             EnumSet.of(PAGADO_BUSCANDO_REPARTIDOR, PAGADO_ESPERANDO_COMERCIO,
                                               CANCELADO_POR_CLIENTE),
        PAGADO_BUSCANDO_REPARTIDOR, EnumSet.of(PAGADO_ESPERANDO_COMERCIO, CANCELADO_POR_CLIENTE),
        PAGADO_ESPERANDO_COMERCIO,  EnumSet.of(ACEPTADO, CANCELADO_POR_COMERCIO, CANCELADO_POR_CLIENTE),
        ACEPTADO,                   EnumSet.of(EN_PREPARACION, CANCELADO_POR_COMERCIO),
        EN_PREPARACION,             EnumSet.of(LISTO_PARA_RECOGER, LISTO_PARA_DELIVERY, CANCELADO_POR_COMERCIO),
        LISTO_PARA_RECOGER,         EnumSet.of(ENTREGADO, EXPIRADO),
        LISTO_PARA_DELIVERY,        EnumSet.of(ENTREGADO),
        ENTREGADO,                  EnumSet.noneOf(EstadoPedido.class),
        CANCELADO_POR_CLIENTE,      EnumSet.noneOf(EstadoPedido.class),
        CANCELADO_POR_COMERCIO,     EnumSet.noneOf(EstadoPedido.class),
        EXPIRADO,                   EnumSet.noneOf(EstadoPedido.class)
    );

    public boolean puedeTransicionarA(EstadoPedido nuevo) {
        return TRANSICIONES.getOrDefault(this, EnumSet.noneOf(EstadoPedido.class)).contains(nuevo);
    }

    public boolean esTerminal() {
        return TERMINALES.contains(this);
    }
}
