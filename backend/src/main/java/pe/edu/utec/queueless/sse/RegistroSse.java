package pe.edu.utec.queueless.sse;

import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import pe.edu.utec.queueless.sse.dto.CambioEstadoSse;

import java.io.IOException;
import java.time.Duration;
import java.util.Collection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Registro en memoria de las conexiones SSE abiertas, agrupadas por cliente y
 * por comercio (el id del usuario-comercio, que es el gestor del local).
 *
 * <p>Lo tocan a la vez dos hilos: el del request, al abrir o cerrar una
 * conexión, y el del listener async, al repartir un evento. Por eso las
 * estructuras son concurrentes: un mapa concurrente por dueño y, dentro de cada
 * dueño, una lista que se puede recorrer para enviar mientras otro hilo la
 * modifica, sin romperse ni lanzar errores.
 *
 * <p>Límite conocido: las conexiones viven en la memoria de esta instancia. Con
 * una sola instancia (nuestro caso) alcanza; escalar a varias necesitaría un bus
 * externo para compartirlas (ver ADR-0024).
 */
@Component
public class RegistroSse {

    /** Timeout de cada conexión. Si se vence, la soltamos y el navegador reconecta solo. */
    public static final long TIMEOUT_MS = Duration.ofMinutes(30).toMillis();

    /** Nombre del evento SSE; el front escucha con addEventListener("pedido-estado", ...). */
    private static final String EVENTO_CAMBIO_ESTADO = "pedido-estado";

    private final Map<Long, Collection<SseEmitter>> porCliente = new ConcurrentHashMap<>();
    private final Map<Long, Collection<SseEmitter>> porComercio = new ConcurrentHashMap<>();

    public void registrarCliente(Long clienteId, SseEmitter emitter) {
        registrar(porCliente, clienteId, emitter);
    }

    public void registrarComercio(Long comercioId, SseEmitter emitter) {
        registrar(porComercio, comercioId, emitter);
    }

    public void enviarACliente(Long clienteId, CambioEstadoSse evento) {
        enviar(porCliente, clienteId, evento);
    }

    public void enviarAComercio(Long comercioId, CambioEstadoSse evento) {
        enviar(porComercio, comercioId, evento);
    }

    private void registrar(Map<Long, Collection<SseEmitter>> registro, Long id, SseEmitter emitter) {
        Collection<SseEmitter> conexiones =
            registro.computeIfAbsent(id, clave -> new CopyOnWriteArrayList<>());
        conexiones.add(emitter);
        // Soltamos el emisor cuando se cierra, expira o falla, para no dejar
        // conexiones muertas ocupando memoria.
        emitter.onCompletion(() -> conexiones.remove(emitter));
        emitter.onTimeout(() -> {
            conexiones.remove(emitter);
            emitter.complete();
        });
        emitter.onError(error -> conexiones.remove(emitter));
    }

    private void enviar(Map<Long, Collection<SseEmitter>> registro, Long id, CambioEstadoSse evento) {
        Collection<SseEmitter> conexiones = registro.get(id);
        if (conexiones == null) {
            return;
        }
        for (SseEmitter emitter : conexiones) {
            try {
                emitter.send(SseEmitter.event().name(EVENTO_CAMBIO_ESTADO).data(evento));
            } catch (IOException | IllegalStateException ex) {
                // El cliente ya se fue o el emisor ya estaba cerrado; lo soltamos.
                conexiones.remove(emitter);
            }
        }
    }
}
