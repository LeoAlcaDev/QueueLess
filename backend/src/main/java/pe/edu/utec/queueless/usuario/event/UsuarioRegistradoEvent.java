package pe.edu.utec.queueless.usuario.event;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * Se publica cuando un usuario completa el alta. Lo consume el listener de
 * correo de bienvenida; en el futuro pueden engancharse otros módulos (por
 * ejemplo, asignar QueuePoints de bienvenida) sin tocar {@code AuthService}.
 *
 * <p>Sigue la misma convención que {@link
 * pe.edu.utec.queueless.pedido.event.PedidoEstadoCambiadoEvent}: el evento solo
 * lleva el id; el listener carga la entidad si la necesita. Ver ADR-0009.
 */
@Getter
@AllArgsConstructor
public class UsuarioRegistradoEvent {
    private final Long usuarioId;
}
