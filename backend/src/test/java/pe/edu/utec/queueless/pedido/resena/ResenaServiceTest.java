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
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
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

    private static final Long PEDIDO_ID = 77L;

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
        pedido.setId(PEDIDO_ID);
    }

    @Test
    @DisplayName("crear reseña PUNTO_DE_VENTA en pedido entregado: feliz camino")
    void shouldCrearResenaWhenPedidoEntregado() {
        when(pedidoService.buscarPedidoDelCliente(cliente, PEDIDO_ID)).thenReturn(pedido);
        when(resenaRepository.existsByPedidoIdAndObjetivoTipo(PEDIDO_ID, ObjetivoResena.PUNTO_DE_VENTA))
            .thenReturn(false);
        when(resenaRepository.save(any(Resena.class))).thenAnswer(i -> {
            Resena r = i.getArgument(0);
            r.setId(1L);
            return r;
        });

        ResenaResponse response =
            service.crear(cliente, PEDIDO_ID, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 5, "Excelente"));

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getObjetivoId()).isEqualTo(local.getId());
        assertThat(response.getCalificacion()).isEqualTo((short) 5);
    }

    @Test
    @DisplayName("no se puede reseñar un pedido que no está ENTREGADO")
    void shouldFallarWhenPedidoNoEntregado() {
        pedido.setEstado(EstadoPedido.EN_PREPARACION);
        when(pedidoService.buscarPedidoDelCliente(cliente, PEDIDO_ID)).thenReturn(pedido);

        assertThatThrownBy(() ->
            service.crear(cliente, PEDIDO_ID, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 4, null)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("ENTREGADO");
        verify(resenaRepository, never()).save(any());
    }

    @Test
    @DisplayName("un pedido ajeno se ve como inexistente (404), no como prohibido")
    void shouldFallarWhenUsuarioNoEsDueno() {
        Usuario otro = Usuario.builder().email("o@utec.edu.pe").build();
        otro.setId(999L);
        when(pedidoService.buscarPedidoDelCliente(otro, PEDIDO_ID))
            .thenThrow(new ResourceNotFoundException("Pedido", PEDIDO_ID));

        assertThatThrownBy(() ->
            service.crear(otro, PEDIDO_ID, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 4, null)))
            .isInstanceOf(ResourceNotFoundException.class);
        verify(resenaRepository, never()).save(any());
    }

    @Test
    @DisplayName("no se permite duplicar la reseña sobre el mismo objetivo del pedido")
    void shouldFallarWhenResenaDuplicada() {
        when(pedidoService.buscarPedidoDelCliente(cliente, PEDIDO_ID)).thenReturn(pedido);
        when(resenaRepository.existsByPedidoIdAndObjetivoTipo(PEDIDO_ID, ObjetivoResena.PUNTO_DE_VENTA))
            .thenReturn(true);

        assertThatThrownBy(() ->
            service.crear(cliente, PEDIDO_ID, request(ObjetivoResena.PUNTO_DE_VENTA, (short) 5, null)))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("Ya existe una reseña");
        verify(resenaRepository, never()).save(any());
    }

    @Test
    @DisplayName("reseña a REPARTIDOR requiere SolicitudDelivery con repartidor asignado")
    void shouldRequerirSolicitudWhenResenaRepartidor() {
        when(pedidoService.buscarPedidoDelCliente(cliente, PEDIDO_ID)).thenReturn(pedido);
        when(resenaRepository.existsByPedidoIdAndObjetivoTipo(PEDIDO_ID, ObjetivoResena.REPARTIDOR))
            .thenReturn(false);

        Usuario repartidor = Usuario.builder().email("r@utec.edu.pe").build();
        repartidor.setId(33L);
        SolicitudDelivery solicitud = SolicitudDelivery.builder()
            .pedido(pedido).repartidor(repartidor)
            .zonaEntrega("X").estado(EstadoSolicitudDelivery.ENTREGADO).build();
        when(solicitudDeliveryRepository.findByPedidoId(PEDIDO_ID)).thenReturn(Optional.of(solicitud));
        when(resenaRepository.save(any(Resena.class))).thenAnswer(i -> {
            Resena r = i.getArgument(0);
            r.setId(2L);
            return r;
        });

        ResenaResponse response =
            service.crear(cliente, PEDIDO_ID, request(ObjetivoResena.REPARTIDOR, (short) 5, null));

        assertThat(response.getObjetivoId()).isEqualTo(33L);
    }

    private CrearResenaRequest request(ObjetivoResena objetivo, Short calificacion, String comentario) {
        CrearResenaRequest r = new CrearResenaRequest();
        r.setObjetivoTipo(objetivo);
        r.setCalificacion(calificacion);
        r.setComentario(comentario);
        return r;
    }
}
