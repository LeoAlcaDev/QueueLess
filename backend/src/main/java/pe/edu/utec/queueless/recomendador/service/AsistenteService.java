package pe.edu.utec.queueless.recomendador.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import pe.edu.utec.queueless.recomendador.dto.AsistenteRequest;
import pe.edu.utec.queueless.recomendador.dto.AsistenteResponse;
import pe.edu.utec.queueless.recomendador.dto.RecomendacionItem;
import pe.edu.utec.queueless.recomendador.dto.TurnoConversacion;
import pe.edu.utec.queueless.recomendador.modelo.ModeloRecomendacion;
import pe.edu.utec.queueless.recomendador.modelo.ModeloRecomendacion.RespuestaModelo;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Orquesta una consulta al asistente: pide los candidatos seguros (que ya salieron del filtro
 * determinista), se los pasa al modelo para que los ordene y explique, y arma la respuesta. Si
 * el modelo no responde, degrada a la lista segura pre-ordenada con un aviso (ADR-0031). No es
 * transaccional a propósito: la lectura de datos vive en el ensamblador y la llamada al modelo
 * queda fuera de cualquier transacción.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AsistenteService {

    private final EnsambladorDeCandidatos ensamblador;
    private final ModeloRecomendacion modelo;

    @Value("${queueless.recomendador.historial-maximo-turnos}")
    private int historialMaximoTurnos;

    public AsistenteResponse recomendar(Usuario usuario, AsistenteRequest request) {
        List<Candidato> candidatos = ensamblador.ensamblar(usuario, request.getPuntoDeVentaId());
        if (candidatos.isEmpty()) {
            return AsistenteResponse.sinOpciones();
        }

        List<TurnoConversacion> historial = acotarHistorial(request.getHistorial());
        try {
            RespuestaModelo respuesta = modelo.ordenarYExplicar(candidatos, historial, request.getMensaje());
            List<RecomendacionItem> ordenados = ordenarSegunModelo(candidatos, respuesta.ordenProductoIds());
            return AsistenteResponse.con(ordenados, respuesta.explicacion());
        } catch (RuntimeException e) {
            log.warn("El modelo de recomendación no respondió; devuelvo la lista segura. Causa: {}", e.toString());
            return AsistenteResponse.degradado(aItems(candidatos));
        }
    }

    // Solo los últimos turnos viajan al modelo: la conversación es de pocos turnos y no se
    // persiste (ADR-0031).
    private List<TurnoConversacion> acotarHistorial(List<TurnoConversacion> historial) {
        if (historial == null || historial.isEmpty()) {
            return List.of();
        }
        int desde = Math.max(0, historial.size() - historialMaximoTurnos);
        return new ArrayList<>(historial.subList(desde, historial.size()));
    }

    // Toma solo los platos que el modelo eligió para esta consulta, en su orden, y siempre
    // validados contra el conjunto seguro: cualquier id inventado o ajeno se ignora. Ya no
    // agregamos al final los que el modelo no nombró: si no eligió ninguno (no hubo match, fue un
    // saludo o algo fuera de tema), la respuesta va sin platos y solo con su mensaje, para ser
    // fiel a lo que pidió el cliente. La seguridad se mantiene: todo id mostrado salió del
    // conjunto seguro (ADR-0031).
    private List<RecomendacionItem> ordenarSegunModelo(List<Candidato> seguros, List<Long> ordenIds) {
        Map<Long, Candidato> porId = new LinkedHashMap<>();
        for (Candidato candidato : seguros) {
            porId.put(candidato.productoId(), candidato);
        }

        List<RecomendacionItem> ordenados = new ArrayList<>();
        if (ordenIds != null) {
            for (Long id : ordenIds) {
                Candidato candidato = porId.remove(id);
                if (candidato != null) {
                    ordenados.add(aItem(candidato));
                }
            }
        }
        return ordenados;
    }

    private List<RecomendacionItem> aItems(List<Candidato> candidatos) {
        List<RecomendacionItem> items = new ArrayList<>();
        for (Candidato candidato : candidatos) {
            items.add(aItem(candidato));
        }
        return items;
    }

    private RecomendacionItem aItem(Candidato c) {
        return new RecomendacionItem(c.productoId(), c.nombre(), c.descripcion(), c.precio(),
            c.puntoDeVentaId(), c.puntoDeVentaNombre(), c.minutosEstimados(), c.dentroDePresupuesto());
    }
}
