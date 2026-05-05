package pe.edu.utec.queueless.pedido.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;

import java.util.List;

@Getter @Setter
public class CrearPedidoRequest {

    @NotNull
    private Long puntoDeVentaId;

    @NotNull
    private TipoEntrega tipoEntrega;

    private String zonaEntrega;       // requerido solo si tipoEntrega = DELIVERY

    @NotEmpty
    @Valid
    private List<ItemPedidoRequest> items;
}
