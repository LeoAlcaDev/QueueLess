package pe.edu.utec.queueless.usuario.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

/**
 * Agrupa los perfiles que tiene el usuario autenticado. Cada campo viene null si el
 * usuario no tiene el rol correspondiente. Se arma a mano porque combina datos de
 * hasta tres entidades distintas.
 */
@Getter
@Builder
@AllArgsConstructor
public class PerfilesResponse {
    private final PerfilClienteResponse cliente;
    private final PerfilComercioResponse comercio;
    private final PerfilRepartidorResponse repartidor;
}
