package pe.edu.utec.queueless.recomendador.service;

import pe.edu.utec.queueless.puntoventa.entity.AptitudDietetica;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.RestriccionDietetica;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * El corazón de la seguridad del asistente: deja pasar solo los platos aptos para el
 * cliente, comparando datos estructurados. Acá no interviene ningún modelo de lenguaje
 * (ADR-0031): lo inseguro se descarta antes de que el modelo vea nada. Es código puro y
 * determinista, sin estado ni dependencias, para poder probarlo a fondo.
 */
public final class FiltroDeSeguridad {

    private FiltroDeSeguridad() {
    }

    /** Devuelve, en el mismo orden recibido, solo los candidatos aptos para el perfil. */
    public static List<Candidato> filtrar(PerfilSeguridad perfil, List<Candidato> candidatos) {
        List<Candidato> seguros = new ArrayList<>();
        for (Candidato candidato : candidatos) {
            if (esSeguro(perfil, candidato)) {
                seguros.add(candidato);
            }
        }
        return seguros;
    }

    /** Un candidato es seguro si pasa los tres chequeos: alérgenos (con el gluten), dieta y picante. */
    public static boolean esSeguro(PerfilSeguridad perfil, Candidato candidato) {
        return !chocaConAlergenos(perfil, candidato)
            && cumpleAptitudDietetica(perfil, candidato)
            && cumpleToleranciaPicante(perfil, candidato);
    }

    // Alérgenos: armamos lo que el cliente evita y, si pidió sin gluten, le sumamos GLUTEN; si
    // el producto declara alguno de esos, choca y se descarta. El sin gluten se resuelve por
    // esta vía, no con un atributo aparte del producto (ADR-0025).
    private static boolean chocaConAlergenos(PerfilSeguridad perfil, Candidato candidato) {
        Set<Alergeno> aEvitar = new HashSet<>(perfil.alergenosEvitar());
        if (perfil.restriccionesDieteticas().contains(RestriccionDietetica.SIN_GLUTEN)) {
            aEvitar.add(Alergeno.GLUTEN);
        }
        for (Alergeno alergeno : candidato.alergenos()) {
            if (aEvitar.contains(alergeno)) {
                return true;
            }
        }
        return false;
    }

    // Dieta vegetariana/vegana: acá exigimos la declaración positiva del producto. A un cliente
    // vegano solo le sirve un plato declarado vegano; a uno vegetariano, uno vegetariano o
    // vegano (todo vegano es vegetariano). Un plato que no declara su aptitud no se ofrece a
    // quien la exige, porque no podemos afirmar lo que el dato no dice.
    private static boolean cumpleAptitudDietetica(PerfilSeguridad perfil, Candidato candidato) {
        Set<RestriccionDietetica> restricciones = perfil.restriccionesDieteticas();
        Set<AptitudDietetica> aptitudes = candidato.aptitudesDieteticas();
        if (restricciones.contains(RestriccionDietetica.VEGANO)
                && !aptitudes.contains(AptitudDietetica.VEGANO)) {
            return false;
        }
        if (restricciones.contains(RestriccionDietetica.VEGETARIANO)
                && !aptitudes.contains(AptitudDietetica.VEGETARIANO)
                && !aptitudes.contains(AptitudDietetica.VEGANO)) {
            return false;
        }
        return true;
    }

    // Picante: si el cliente declaró su tolerancia y el plato declaró su nivel, descartamos el
    // que pica de más. Si el plato no declara nivel, no lo descartamos: no es una violación
    // conocida, y el asistente avisa que no lo tiene confirmado (ADR-0031).
    private static boolean cumpleToleranciaPicante(PerfilSeguridad perfil, Candidato candidato) {
        ToleranciaPicante tolerancia = perfil.toleranciaPicante();
        ToleranciaPicante nivel = candidato.nivelPicante();
        if (tolerancia == null || nivel == null) {
            return true;
        }
        return nivel.ordinal() <= tolerancia.ordinal();
    }
}
