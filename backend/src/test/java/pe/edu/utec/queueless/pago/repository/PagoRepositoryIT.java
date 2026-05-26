package pe.edu.utec.queueless.pago.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import pe.edu.utec.queueless.integration.AbstractRepositoryTest;
import pe.edu.utec.queueless.pago.entity.EstadoPago;
import pe.edu.utec.queueless.pago.entity.Pago;
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
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Tests del repositorio de pagos: busqueda por referencia externa y por pedido, y la
 * consulta que trae el pago junto con su pedido y cliente en una sola query.
 */
class PagoRepositoryIT extends AbstractRepositoryTest {

    @Autowired
    private PagoRepository pagoRepository;

    @Autowired
    private PedidoRepository pedidoRepository;

    @Autowired
    private PuntoDeVentaRepository puntoDeVentaRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private Pedido pedido;

    @BeforeEach
    void setUp() {
        Usuario cliente = usuarioRepository.save(usuario("cliente.pago@utec.edu.pe", Rol.CLIENTE));
        Usuario gestor = usuarioRepository.save(usuario("gestor.pago@utec.edu.pe", Rol.COMERCIO));
        PuntoDeVenta puntoDeVenta = puntoDeVentaRepository.save(PuntoDeVenta.builder()
            .nombre("Local Pago").ubicacion("Bloque A").gestor(gestor).build());
        pedido = pedidoRepository.save(Pedido.builder()
            .codigo("QL-PAGO1").cliente(cliente).puntoDeVenta(puntoDeVenta)
            .estado(EstadoPedido.PENDIENTE_PAGO).tipoEntrega(TipoEntrega.PICKUP)
            .subtotal(new BigDecimal("10.00")).total(new BigDecimal("10.00")).build());
    }

    @Test
    @DisplayName("findByReferenciaExterna encuentra el pago cuando la referencia existe")
    void shouldFindByReferenciaExternaWhenExists() {
        pagoRepository.save(pago("PREF-123"));

        assertThat(pagoRepository.findByReferenciaExterna("PREF-123")).isPresent();
        assertThat(pagoRepository.findByReferenciaExterna("PREF-NOPE")).isEmpty();
    }

    @Test
    @DisplayName("findByPedidoId y existsByPedidoId reconocen el pago del pedido")
    void shouldFindAndDetectByPedidoId() {
        pagoRepository.save(pago("PREF-456"));

        assertThat(pagoRepository.findByPedidoId(pedido.getId())).isPresent();
        assertThat(pagoRepository.existsByPedidoId(pedido.getId())).isTrue();
        assertThat(pagoRepository.existsByPedidoId(999999L)).isFalse();
    }

    @Test
    @DisplayName("findByIdWithPedido trae el pago con su pedido y cliente cargados")
    void shouldFetchPedidoYClienteWhenFindByIdWithPedido() {
        Pago guardado = pagoRepository.save(pago("PREF-789"));

        Pago encontrado = pagoRepository.findByIdWithPedido(guardado.getId()).orElseThrow();

        assertThat(encontrado.getPedido().getCodigo()).isEqualTo("QL-PAGO1");
        assertThat(encontrado.getPedido().getCliente().getEmail()).isEqualTo("cliente.pago@utec.edu.pe");
    }

    private Pago pago(String referencia) {
        return Pago.builder()
            .pedido(pedido)
            .monto(new BigDecimal("10.00"))
            .metodo("MOCK")
            .estado(EstadoPago.PENDIENTE)
            .referenciaExterna(referencia)
            .build();
    }

    private Usuario usuario(String email, Rol rol) {
        return Usuario.builder()
            .email(email)
            .passwordHash("$2a$10$hashdeprueba")
            .nombreCompleto("Demo Pago")
            .roles(new HashSet<>(Set.of(rol)))
            .build();
    }
}
