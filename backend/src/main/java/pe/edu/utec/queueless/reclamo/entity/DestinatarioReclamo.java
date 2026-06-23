package pe.edu.utec.queueless.reclamo.entity;

/**
 * Contra quién va el reclamo: un comercio del campus o la propia plataforma. Define
 * el enrutamiento de la notificación (al comercio o al correo de operadores). Ver ADR-0029.
 */
public enum DestinatarioReclamo {
    COMERCIO,
    PLATAFORMA
}
