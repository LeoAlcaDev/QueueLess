package pe.edu.utec.queueless.shared.domain;

/**
 * Alérgenos de declaración habitual en comida. Lista cerrada y compartida: el
 * producto la usa para declarar lo que contiene y el cliente para marcar lo que
 * evita, así los dos lados eligen del mismo vocabulario y se pueden cruzar con
 * confianza (ADR-0025). En la base se guarda como VARCHAR en tablas hijas.
 */
public enum Alergeno {
    MANI,
    FRUTOS_SECOS,
    MARISCOS,
    PESCADO,
    LACTEOS,
    HUEVO,
    GLUTEN,
    SOYA,
    AJONJOLI
}
