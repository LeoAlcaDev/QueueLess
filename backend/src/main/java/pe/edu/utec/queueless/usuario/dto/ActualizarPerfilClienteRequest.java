package pe.edu.utec.queueless.usuario.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.RestriccionDietetica;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.math.BigDecimal;
import java.util.Set;

@Getter @Setter
public class ActualizarPerfilClienteRequest {

    @Size(max = 200, message = "La direccion no puede superar 200 caracteres")
    private String direccionPreferida;

    @Size(max = 500, message = "Las alergias no pueden superar 500 caracteres")
    private String alergias;

    // Los elementos no pueden ser nulos; el conjunto sí puede venir vacío o ausente.
    private Set<@NotNull Alergeno> alergenosEvitar;

    private Set<@NotNull RestriccionDietetica> restriccionesDieteticas;

    private ToleranciaPicante toleranciaPicante;

    @DecimalMin(value = "0.0", message = "El presupuesto no puede ser negativo")
    @Digits(integer = 6, fraction = 2, message = "El presupuesto admite hasta 6 enteros y 2 decimales")
    private BigDecimal presupuestoReferencia;
}
