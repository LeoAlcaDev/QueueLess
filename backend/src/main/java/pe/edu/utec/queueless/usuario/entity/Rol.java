package pe.edu.utec.queueless.usuario.entity;

/**
 * Roles del sistema. Modelado como enum (no entidad) porque son fijos y pocos.
 * En la base se almacena como VARCHAR(20) en la tabla usuario_roles.
 */
public enum Rol {
    CLIENTE,
    COMERCIO,
    REPARTIDOR
}
