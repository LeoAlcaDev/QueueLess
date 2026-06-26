package pe.edu.utec.queueless.recomendador.service;

import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.RestriccionDietetica;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.math.BigDecimal;
import java.util.Set;

/**
 * Foto de los datos del perfil del cliente que importan para recomendar: lo que evita, lo
 * que exige, cuánto picante aguanta y cuánto suele gastar. Es un valor inmutable y desligado
 * de la base, para poder filtrar y armar el contexto sin una transacción abierta.
 */
public record PerfilSeguridad(
    Set<Alergeno> alergenosEvitar,
    Set<RestriccionDietetica> restriccionesDieteticas,
    ToleranciaPicante toleranciaPicante,
    BigDecimal presupuestoReferencia
) {}
