package pe.edu.utec.queueless.usuario.entity;

/**
 * Restricciones de dieta que el cliente puede declarar. Conviven varias a la vez
 * (un cliente vegano puede además evitar el gluten), por eso se guardan como
 * conjunto. En la base se almacena como VARCHAR en la tabla perfil_cliente_restriccion.
 */
public enum RestriccionDietetica {
    VEGETARIANO,
    VEGANO,
    SIN_GLUTEN
}
