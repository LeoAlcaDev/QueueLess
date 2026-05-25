package pe.edu.utec.queueless.pedido.resena.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import pe.edu.utec.queueless.pedido.resena.entity.ObjetivoResena;
import pe.edu.utec.queueless.pedido.resena.entity.Resena;

import java.time.Instant;

@Getter
@Builder
@AllArgsConstructor
public class ResenaResponse {
    private final Long id;
    private final Long pedidoId;
    private final Long autorId;
    private final String autorNombre;
    private final ObjetivoResena objetivoTipo;
    private final Long objetivoId;
    private final Short calificacion;
    private final String comentario;
    private final Instant createdAt;

    public static ResenaResponse from(Resena resena) {
        return ResenaResponse.builder()
            .id(resena.getId())
            .pedidoId(resena.getPedido().getId())
            .autorId(resena.getAutor().getId())
            .autorNombre(resena.getAutor().getNombreCompleto())
            .objetivoTipo(resena.getObjetivoTipo())
            .objetivoId(resena.getObjetivoId())
            .calificacion(resena.getCalificacion())
            .comentario(resena.getComentario())
            .createdAt(resena.getCreatedAt())
            .build();
    }
}
