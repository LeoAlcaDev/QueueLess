package pe.edu.utec.queueless.waittime.ml;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.OptionalInt;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El reentrenamiento contra un Postgres real: inserta pedidos entregados con tiempos
 * conocidos, corre el entrenamiento y verifica que el modelo predice el promedio.
 */
@ActiveProfiles("test")
@Transactional
class ModelTrainerIT extends AbstractIntegrationTest {

    private static final Instant BASE = Instant.parse("2026-05-18T17:00:00Z");   // 12:00 en Lima

    @Autowired private AuthService authService;
    @Autowired private UsuarioRepository usuarioRepository;
    @Autowired private PuntoDeVentaService puntoDeVentaService;
    @Autowired private PuntoDeVentaRepository puntoDeVentaRepository;
    @Autowired private PedidoRepository pedidoRepository;
    @Autowired private ModelTrainer modelTrainer;
    @Autowired private BinRegressionModel model;

    @Test
    @DisplayName("el reentrenamiento lee los pedidos entregados y arma el modelo")
    void entrenaDesdeLaBase() {
        Usuario comercio = registrar("comercio.trainer@utec.edu.pe", Rol.COMERCIO);
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest());
        Usuario cliente = registrar("cliente.trainer@utec.edu.pe", Rol.CLIENTE);
        PuntoDeVenta puntoDeVenta = puntoDeVentaRepository.findById(local.getId()).orElseThrow();

        // Dos entregas en la misma franja, con preparaciones de 10 y 20 minutos.
        guardarEntregado(puntoDeVenta, cliente, "QL-TR1", BASE, BASE.plus(10, ChronoUnit.MINUTES));
        guardarEntregado(puntoDeVenta, cliente, "QL-TR2",
            BASE.plus(10, ChronoUnit.MINUTES), BASE.plus(30, ChronoUnit.MINUTES));

        modelTrainer.reEntrenar();

        int hora = BASE.atZone(TiempoLima.ZONA).getHour();
        int dia = BASE.atZone(TiempoLima.ZONA).getDayOfWeek().getValue() - 1;
        OptionalInt prediccion = model.predecir(local.getId(), hora, dia, 0);
        assertThat(prediccion).hasValue(15);   // promedio de 10 y 20 minutos
    }

    private void guardarEntregado(PuntoDeVenta puntoDeVenta, Usuario cliente, String codigo,
                                  Instant aceptado, Instant listo) {
        Pedido pedido = Pedido.builder()
            .codigo(codigo)
            .cliente(cliente)
            .puntoDeVenta(puntoDeVenta)
            .estado(EstadoPedido.ENTREGADO)
            .tipoEntrega(TipoEntrega.PICKUP)
            .subtotal(new BigDecimal("10.00"))
            .total(new BigDecimal("10.00"))
            .aceptadoAt(aceptado)
            .listoAt(listo)
            .build();
        pedidoRepository.saveAndFlush(pedido);
    }

    private Usuario registrar(String email, Rol... roles) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("password123");
        request.setNombreCompleto("Demo " + email);
        request.setRoles(new HashSet<>(Set.of(roles)));
        authService.register(request);
        return usuarioRepository.findByEmail(email).orElseThrow();
    }

    private CrearPuntoDeVentaRequest localRequest() {
        CrearPuntoDeVentaRequest request = new CrearPuntoDeVentaRequest();
        request.setNombre("Local Trainer");
        request.setUbicacion("Bloque A");
        return request;
    }
}
