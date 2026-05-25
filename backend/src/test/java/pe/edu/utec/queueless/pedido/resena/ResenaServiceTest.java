package pe.edu.utec.queueless.pedido.resena;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.utec.queueless.delivery.entity.EstadoSolicitudDelivery;
import pe.edu.utec.queueless.delivery.entity.SolicitudDelivery;
import pe.edu.utec.queueless.delivery.repository.SolicitudDeliveryRepository;
import pe.edu.utec.queueless.pedido.entity.EstadoPedido;
import pe.edu.utec.queueless.pedido.entity.Pedido;
import pe.edu.utec.queueless.pedido.entity.TipoEntrega;
import pe.edu.utec.queueless.pedido.resena.dto.CrearResenaRequest;
import pe.edu.utec.queueless.pedido.resena.dto.ResenaResponse;
import pe.edu.utec.queueless.pedido.resena.entity.ObjetivoResena;
import pe.edu.utec.queueless.pedido.resena.entity.Resena;
import pe.edu.utec.queueless.pedido.resena.repository.ResenaRepository;
import pe.edu.utec.queueless.pedido.resena.service.ResenaService;
import pe.edu.utec.queueless.pedido.service.PedidoService;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResenaServiceTest {

    @Mock private ResenaRepository resenaRepository;
    @Mock private PedidoService pedidoService;
    @Mock private SolicitudDeliveryRepository solicitudDeliveryRepository;

    @InjectMocks private ResenaService service;

    private Usuario cliente;
    private Pedido pedido;
    private PuntoDeVenta local;

    @BeforeEach
    void setUp() {
        cliente = Usuario.builder().email("cli@utec.edu.pe").build();
        cliente.setId(10L);

        Usuario gestor = Usuario.builder().email("g@utec.edu.pe").build();
        gestor.setId(20L);
        local = PuntoDeVenta.builder().nombre("Local").ubicacion("X").gestor(gestor).build();
        local.setId(5L);

        pedido = Pedido.builder()
            .codigo("QL-1")
            .cliente(cliente)
            .puntoDeVenta(local)
            .estado(EstadoPedido.ENTREGADO)
            .tipoEntrega(TipoEntrega.PICKUP)
            .build();
        pedido.setId(77L);
    }

    @Test
    @DisplayName("crear reseña PUNTO_DE_VENTA en pedido entregado: feliz camino")
    void crearResenaLocalFelizCamino() {
        when(pedidoService.findById(77L)).thenReturn(pedido);
        when(resenaRepository.existsByPedidoIdAndObjetivoTipo(77L, ObjetivoResena.PUNTO_DE_VENTA))
            .thenReturn(false);
        when(resenaRepository.save(any(Resena.class))).thenAnswer(i -> {
            Resena r = i.getArgument(0);
            r.setId(1L);
            return r;
        });

        ResenaResponse response = service.crear(cliente, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 5, "Excelente"));

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getObjetivoId()).isEqualTo(local.getId());
        assertThat(response.getCalificacion()).isEqualTo((short) 5);
    }

    @Test
    @DisplayName("no se puede reseñar un pedido que no está ENTREGADO")
    void noSePuedeResenarPedidoNoEntregado() {
        pedido.setEstado(EstadoPedido.EN_PREPARACION);
        when(pedidoService.findById(77L)).thenReturn(pedido);

        assertThatThrownBy(() ->
            service.crear(cliente, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 4, null)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("ENTREGADO");
        verify(resenaRepository, never()).save(any());
    }

    @Test
    @DisplayName("solo el cliente del pedido puede reseñarlo")
    void otroUsuarioNoPuedeResenar() {
        Usuario otro = Usuario.builder().email("o@utec.edu.pe").build();
        otro.setId(999L);
        when(pedidoService.findById(77L)).thenReturn(pedido);

        assertThatThrownBy(() ->
            service.crear(otro, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 4, null)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("cliente del pedido");
    }

    @Test
    @DisplayName("no se permite duplicar la reseña sobre el mismo objetivo del pedido")
    void noDuplicarResena() {
        when(pedidoService.findById(77L)).thenReturn(pedido);
        when(resenaRepository.existsByPedidoIdAndObjetivoTipo(77L, ObjetivoResena.PUNTO_DE_VENTA))
            .thenReturn(true);

        assertThatThrownBy(() ->
            service.crear(cliente, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 5, null)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("Ya existe una reseña");
        verify(resenaRepository, never()).save(any());
    }

    @Test
    @DisplayName("reseña a REPARTIDOR requiere SolicitudDelivery con repartidor asignado")
    void resenaRepartidorRequiereSolicitud() {
        when(pedidoService.findById(77L)).thenReturn(pedido);
        when(resenaRepository.existsByPedidoIdAndObjetivoTipo(77L, ObjetivoResena.REPARTIDOR))
            .thenReturn(false);

        Usuario repartidor = Usuario.builder().email("r@utec.edu.pe").build();
        repartidor.setId(33L);
        SolicitudDelivery solicitud = SolicitudDelivery.builder()
            .pedido(pedido).repartidor(repartidor)
            .zonaEntrega("X").estado(EstadoSolicitudDelivery.ENTREGADO).build();
        when(solicitudDeliveryRepository.findByPedidoId(77L)).thenReturn(Optional.of(solicitud));
        when(resenaRepository.save(any(Resena.class))).thenAnswer(i -> {
            Resena r = i.getArgument(0);
            r.setId(2L);
            return r;
        });

        ResenaResponse response = service.crear(cliente, request(ObjetivoResena.REPARTIDOR, (short) 5, null));

        assertThat(response.getObjetivoId()).isEqualTo(33L);
    }

    private CrearResenaRequest request(ObjetivoResena objetivo, Short calificacion, String comentario) {
        CrearResenaRequest r = new CrearResenaRequest();
        r.setPedidoId(77L);
        r.setObjetivoTipo(objetivo);
        r.setCalificacion(calificacion);
        r.setComentario(comentario);
        return r;
    }
}
