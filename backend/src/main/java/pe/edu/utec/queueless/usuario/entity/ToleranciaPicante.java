package pe.edu.utec.queueless.usuario.entity;

/**
 * Cuánto picante tolera el cliente, en una escala ordenada de menos a más. Es
 * opcional: si el cliente no la declara queda nula y no se asume ningún nivel.
 */
public enum ToleranciaPicante {
    NINGUNA,
    BAJA,
    MEDIA,
    ALTA
}
