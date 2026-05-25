package pe.edu.utec.queueless.pedido.resena.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.pedido.resena.entity.ObjetivoResena;

@Getter @Setter
public class CrearResenaRequest {

    @NotNull
    private Long pedidoId;

    @NotNull
    private ObjetivoResena objetivoTipo;

    @NotNull
    @Min(1)
    @Max(5)
    private Short calificacion;

    @Size(max = 2000)
    private String comentario;
}
