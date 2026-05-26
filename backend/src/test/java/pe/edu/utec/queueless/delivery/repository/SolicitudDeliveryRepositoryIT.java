package pe.edu.utec.queueless.delivery.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests del repositorio de solicitudes de delivery: filtro por estado, el finder del job
 * de timeout de busqueda, y el historial del repartidor ordenado del mas reciente.
 */
class SolicitudDeliveryRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private SolicitudDeliveryRepository solicitudRepository;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private PuntoDeVentaRepository puntoDeVentaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Usuario cliente;
    private Usuario repartidor;
    private PuntoDeVenta puntoDeVenta;

    @BeforeEach
    void setUp() {
        cliente = usuarioRepository.save(usuario("cliente.del@utec.edu.pe", Rol.CLIENTE));
        repartidor = usuarioRepository.save(usuario("repartidor.del@utec.edu.pe", Rol.REPARTIDOR));
        Usuario gestor = usuarioRepository.save(usuario("gestor.del@utec.edu.pe", Rol.COMERCIO));
        puntoDeVenta = puntoDeVentaRepository.save(PuntoDeVenta.builder()
            .nombre("Local Delivery").ubicacion("Bloque A").gestor(gestor).build());
    }

    @Test
    @DisplayName("findByEstado trae solo las solicitudes en ese estado")
    void shouldFindByEstadoWhenMatches() {
        solicitudRepository.save(solicitud("QL-DEL1", EstadoSolicitudDelivery.BUSCANDO, null,
            Instant.now().plus(1, ChronoUnit.MINUTES)));
        solicitudRepository.save(solicitud("QL-DEL2", EstadoSolicitudDelivery.ASIGNADO, repartidor,
            Instant.now()));

        assertThat(solicitudRepository.findByEstado(EstadoSolicitudDelivery.BUSCANDO))
            .extracting(s -> s.getPedido().getCodigo())
            .containsExactly("QL-DEL1");
    }

    @Test
    @DisplayName("el finder del job de timeout trae las busquedas vencidas")
    void shouldFindExpiredWhenBusquedaFinAtBeforeCutoff() {
        solicitudRepository.save(solicitud("QL-DEL3", EstadoSolicitudDelivery.BUSCANDO, null,
            Instant.now().minus(1, ChronoUnit.MINUTES)));
        solicitudRepository.save(solicitud("QL-DEL4", EstadoSolicitudDelivery.BUSCANDO, null,
            Instant.now().plus(10, ChronoUnit.MINUTES)));

        assertThat(solicitudRepository.findByEstadoAndBusquedaFinAtBefore(
            EstadoSolicitudDelivery.BUSCANDO, Instant.now()))
            .extracting(s -> s.getPedido().getCodigo())
            .containsExactly("QL-DEL3");
    }

    @Test
    @DisplayName("el historial del repartidor viene del mas reciente al mas antiguo")
    void shouldOrderByAsignadoAtDescWhenFindByRepartidor() {
        SolicitudDelivery vieja = solicitud("QL-DEL5", EstadoSolicitudDelivery.ENTREGADO, repartidor,
            Instant.now());
        vieja.setAsignadoAt(Instant.now().minus(2, ChronoUnit.HOURS));
        solicitudRepository.save(vieja);
        SolicitudDelivery nueva = solicitud("QL-DEL6", EstadoSolicitudDelivery.ENTREGADO, repartidor,
            Instant.now());
        nueva.setAsignadoAt(Instant.now().minus(10, ChronoUnit.MINUTES));
        solicitudRepository.save(nueva);

        assertThat(solicitudRepository.findByRepartidorIdOrderByAsignadoAtDesc(repartidor.getId()))
            .extracting(s -> s.getPedido().getCodigo())
            .containsExactly("QL-DEL6", "QL-DEL5");
    }

    private SolicitudDelivery solicitud(String codigoPedido, EstadoSolicitudDelivery estado,
                                        Usuario asignado, Instant busquedaFinAt) {
        Pedido pedido = pedidoRepository.save(Pedido.builder()
            .codigo(codigoPedido).cliente(cliente).puntoDeVenta(puntoDeVenta)
            .estado(EstadoPedido.PAGADO_BUSCANDO_REPARTIDOR).tipoEntrega(TipoEntrega.DELIVERY)
            .subtotal(new BigDecimal("10.00")).total(new BigDecimal("10.00")).build());
        return SolicitudDelivery.builder()
            .pedido(pedido)
            .repartidor(asignado)
            .zonaEntrega("Bloque B")
            .estado(estado)
            .busquedaInicioAt(Instant.now())
            .busquedaFinAt(busquedaFinAt)
            .build();
    }

    private Usuario usuario(String email, Rol rol) {
        return Usuario.builder()
            .email(email)
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Demo Delivery")
            .roles(new HashSet<>(Set.of(rol)))
            .build();
    }
}
