package pe.edu.utec.queueless.pedido.entity;

/**
 * Motivos por los que un comercio cancela o rechaza un pedido.
 *
 * <p>El texto en español que ve el cliente NO se modela acá: lo arma el frontend
 * (o el listener de notificaciones en una fase futura). En el backend el enum
 * viaja como string tal cual está.
 */
public enum MotivoCancelacion {
    PRODUCTO_AGOTADO,
    FALTA_INGREDIENTE,
    FUERA_DE_HORARIO_PRODUCTO,
    LOCAL_SATURADO,
    LOCAL_POR_CERRAR,
    PROBLEMA_OPERATIVO,
    OTRO,

    // Los dos siguientes los pone la red de seguridad de pedidos programados, no el
    // comercio: el primero cuando dejó vencer un programado sin aceptarlo, el segundo
    // cuando lo aceptó pero lo dejó vencer sin prepararlo (ADR-0026).
    COMERCIO_NO_ATENDIO,
    COMERCIO_NO_PREPARO
}
