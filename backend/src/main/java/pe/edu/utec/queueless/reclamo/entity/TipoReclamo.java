package pe.edu.utec.queueless.reclamo.entity;

/**
 * Distingue, como lo hace INDECOPI, un reclamo de una queja: el reclamo es por el
 * producto o el servicio; la queja es por el trato o la atención. Ver ADR-0029.
 */
public enum TipoReclamo {

    RECLAMO("Reclamo"),
    QUEJA("Queja");

    private final String etiqueta;

    TipoReclamo(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    /** Nombre legible para mostrar en los correos. */
    public String getEtiqueta() {
        return etiqueta;
    }
}
