package pe.edu.utec.queueless.recomendador.modelo;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import pe.edu.utec.queueless.recomendador.dto.TurnoConversacion;
import pe.edu.utec.queueless.recomendador.service.Candidato;

import java.util.ArrayList;
import java.util.List;

/**
 * Doble determinista del modelo para correr los tests y el perfil de integración sin tocar la
 * red ni gastar cuota. Respeta el pre-orden que recibe y arma una explicación fija. Se activa
 * con queueless.recomendador.proveedor=fake.
 */
@Component
@ConditionalOnProperty(name = "queueless.recomendador.proveedor", havingValue = "fake")
public class FakeModeloRecomendacion implements ModeloRecomendacion {

    @Override
    public RespuestaModelo ordenarYExplicar(List<Candidato> candidatos, List<TurnoConversacion> historial,
                                            String mensaje) {
        List<Long> orden = new ArrayList<>();
        for (Candidato candidato : candidatos) {
            orden.add(candidato.productoId());
        }
        return new RespuestaModelo(orden,
            "Estas son tus opciones seguras y pedibles ahora, ordenadas por conveniencia.");
    }
}
