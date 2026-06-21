package pe.edu.utec.queueless.pedido.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;

import java.time.Instant;
import java.util.List;

@Getter @Setter
public class CrearPedidoRequest {

    @NotNull
    private Long puntoDeVentaId;

    @NotNull
    private TipoEntrega tipoEntrega;

    private String zonaEntrega;       // requerido solo si tipoEntrega = DELIVERY

    // Si viene, es un pedido programado: la hora futura de recojo (ADR-0026). El
    // service valida que sea PICKUP y que caiga en el horizonte, el slot y la
    // disponibilidad a esa hora. Null = pedido inmediato.
    private Instant recojoProgramadoAt;

    @NotEmpty
    @Valid
    private List<ItemPedidoRequest> items;
}
