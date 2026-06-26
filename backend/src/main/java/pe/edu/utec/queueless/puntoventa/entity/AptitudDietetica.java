package pe.edu.utec.queueless.puntoventa.entity;

/**
 * Dietas para las que un producto puede declararse apto: la contracara de las
 * restricciones que el cliente evita (RestriccionDietetica del perfil). No incluye sin
 * gluten a propósito: eso se resuelve por el alérgeno GLUTEN que el producto ya declara
 * (ADR-0025). Como todo vegano es además vegetariano, un producto vegano satisface
 * también la restricción vegetariana; ese matiz lo resuelve el cruce en ADR-0031.
 */
public enum AptitudDietetica {
    VEGETARIANO,
    VEGANO
}
