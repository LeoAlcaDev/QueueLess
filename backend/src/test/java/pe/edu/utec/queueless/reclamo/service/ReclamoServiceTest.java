package pe.edu.utec.queueless.reclamo.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.reclamo.dto.AcuseReclamoResponse;
import pe.edu.utec.queueless.reclamo.dto.CrearReclamoRequest;
import pe.edu.utec.queueless.reclamo.dto.ReclamoResponse;
import pe.edu.utec.queueless.reclamo.dto.ResponderReclamoRequest;
import pe.edu.utec.queueless.reclamo.entity.DestinatarioReclamo;
import pe.edu.utec.queueless.reclamo.entity.EstadoReclamo;
import pe.edu.utec.queueless.reclamo.entity.Reclamo;
import pe.edu.utec.queueless.reclamo.entity.TipoReclamo;
import pe.edu.utec.queueless.reclamo.event.ReclamoRegistradoEvent;
import pe.edu.utec.queueless.reclamo.event.ReclamoRespondidoEvent;
import pe.edu.utec.queueless.reclamo.repository.ReclamoRepository;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.usuario.entity.Usuario;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests del libro de reclamaciones. No levantan Spring ni base: los repositorios y el
 * publicador de eventos van mockeados. Patrón AAA.
 */
class ReclamoServiceTest {

    private static final int PLAZO_DIAS_HABILES = 15;

    private ReclamoRepository reclamoRepository;
    private PuntoDeVentaRepository puntoDeVentaRepository;
    private PedidoRepository pedidoRepository;
    private ApplicationEventPublisher eventPublisher;
    private ReclamoService service;

    @BeforeEach
    void setUp() {
        reclamoRepository = mock(ReclamoRepository.class);
        puntoDeVentaRepository = mock(PuntoDeVentaRepository.class);
        pedidoRepository = mock(PedidoRepository.class);
        eventPublisher = mock(ApplicationEventPublisher.class);

        service = new ReclamoService(reclamoRepository, puntoDeVentaRepository, pedidoRepository, eventPublisher);
        ReflectionTestUtils.setField(service, "plazoDiasHabiles", PLAZO_DIAS_HABILES);

        when(reclamoRepository.findByCodigoConstancia(anyString())).thenReturn(Optional.empty());
        when(reclamoRepository.save(any(Reclamo.class))).thenAnswer(invocation -> {
            Reclamo reclamo = invocation.getArgument(0);
            if (reclamo.getId() == null) {
                reclamo.setId(1L);
            }
            return reclamo;
        });
    }

    @Test
    void registrarDevuelveAcuseConCodigoDeConstanciaYPlazo() {
        // Arrange
        Usuario usuario = usuarioConId(10L);
        CrearReclamoRequest request = request(TipoReclamo.RECLAMO, DestinatarioReclamo.PLATAFORMA, null);

        // Act
        AcuseReclamoResponse acuse = service.registrar(usuario, request);

        // Assert
        assertThat(acuse.getCodigoConstancia()).startsWith("LR-");
        assertThat(acuse.getEstado()).isEqualTo(EstadoReclamo.PENDIENTE);
        assertThat(acuse.getTipo()).isEqualTo(TipoReclamo.RECLAMO);
        assertThat(acuse.getContra()).isEqualTo(DestinatarioReclamo.PLATAFORMA);
        assertThat(acuse.getMensaje()).contains("15 días hábiles");
        // 15 días hábiles caen siempre más allá de 14 días corridos, y nunca en fin de semana.
        assertThat(acuse.getPlazoRespuestaAt()).isAfter(Instant.now().plus(Duration.ofDays(14)));
        DayOfWeek diaLimite = TiempoLima.fechaDe(acuse.getPlazoRespuestaAt()).getDayOfWeek();
        assertThat(diaLimite).isNotIn(DayOfWeek.SATURDAY, DayOfWeek.SUNDAY);

        verify(reclamoRepository).save(any(Reclamo.class));
        verify(eventPublisher).publishEvent(any(ReclamoRegistradoEvent.class));
    }

    @Test
    void unReclamoContraUnComercioExigeIndicarElLocal() {
        // Arrange: contra COMERCIO sin puntoDeVentaId.
        Usuario usuario = usuarioConId(10L);
        CrearReclamoRequest request = request(TipoReclamo.QUEJA, DestinatarioReclamo.COMERCIO, null);

        // Act + Assert
        assertThatThrownBy(() -> service.registrar(usuario, request))
            .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void registrarContraUnComercioConLocalValidoGeneraElReclamo() {
        // Arrange
        Usuario usuario = usuarioConId(10L);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(5L)).thenReturn(Optional.of(localConGestor(2L)));
        CrearReclamoRequest request = request(TipoReclamo.RECLAMO, DestinatarioReclamo.COMERCIO, 5L);

        // Act
        AcuseReclamoResponse acuse = service.registrar(usuario, request);

        // Assert
        assertThat(acuse.getContra()).isEqualTo(DestinatarioReclamo.COMERCIO);
        assertThat(acuse.getCodigoConstancia()).startsWith("LR-");
        verify(eventPublisher).publishEvent(any(ReclamoRegistradoEvent.class));
    }

    @Test
    void responderMarcaElReclamoComoRespondidoYAvisa() {
        // Arrange: un reclamo contra el local del gestor 2.
        Reclamo reclamo = reclamoContraComercio(2L);
        when(reclamoRepository.findById(7L)).thenReturn(Optional.of(reclamo));
        ResponderReclamoRequest request = new ResponderReclamoRequest();
        request.setRespuesta("Lo resolvimos, disculpá la demora");

        // Act
        ReclamoResponse respuesta = service.responder(usuarioConId(2L), 7L, request);

        // Assert
        assertThat(respuesta.getEstado()).isEqualTo(EstadoReclamo.RESPONDIDO);
        assertThat(respuesta.getRespuesta()).isEqualTo("Lo resolvimos, disculpá la demora");
        assertThat(reclamo.getRespondidoAt()).isNotNull();
        verify(eventPublisher).publishEvent(any(ReclamoRespondidoEvent.class));
    }

    @Test
    void unComercioNoPuedeResponderElReclamoDeUnLocalAjeno() {
        // Arrange: el reclamo es contra el local del gestor 2; responde el gestor 99.
        Reclamo reclamo = reclamoContraComercio(2L);
        when(reclamoRepository.findById(7L)).thenReturn(Optional.of(reclamo));
        ResponderReclamoRequest request = new ResponderReclamoRequest();
        request.setRespuesta("No es mío pero respondo");

        // Act + Assert
        assertThatThrownBy(() -> service.responder(usuarioConId(99L), 7L, request))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void responderDosVecesLaSegundaFalla() {
        // Arrange: el mock de save devuelve la misma instancia, así que la primera respuesta
        // deja el reclamo en RESPONDIDO en memoria para la segunda invocación.
        Reclamo reclamo = reclamoContraComercio(2L);
        when(reclamoRepository.findById(7L)).thenReturn(Optional.of(reclamo));
        Usuario gestor = usuarioConId(2L);
        ResponderReclamoRequest request = new ResponderReclamoRequest();
        request.setRespuesta("Lo resolvimos, disculpá la demora");

        // Act
        service.responder(gestor, 7L, request);

        // Assert
        assertThatThrownBy(() -> service.responder(gestor, 7L, request))
            .isInstanceOf(BusinessRuleException.class);
    }

    private Usuario usuarioConId(long id) {
        Usuario usuario = new Usuario();
        usuario.setId(id);
        return usuario;
    }

    private PuntoDeVenta localConGestor(long gestorId) {
        PuntoDeVenta local = PuntoDeVenta.builder()
            .nombre("Café del Bloque A")
            .ubicacion("Bloque A")
            .gestor(usuarioConId(gestorId))
            .build();
        local.setId(5L);
        return local;
    }

    private Reclamo reclamoContraComercio(long gestorId) {
        return Reclamo.builder()
            .usuario(usuarioConId(10L))
            .tipo(TipoReclamo.RECLAMO)
            .contra(DestinatarioReclamo.COMERCIO)
            .puntoDeVenta(localConGestor(gestorId))
            .detalle("El almuerzo llegó frío")
            .codigoConstancia("LR-260622-AB7K9")
            .estado(EstadoReclamo.PENDIENTE)
            .plazoRespuestaAt(Instant.now().plus(Duration.ofDays(20)))
            .build();
    }

    private CrearReclamoRequest request(TipoReclamo tipo, DestinatarioReclamo contra, Long puntoVentaId) {
        CrearReclamoRequest request = new CrearReclamoRequest();
        request.setTipo(tipo);
        request.setContra(contra);
        request.setPuntoDeVentaId(puntoVentaId);
        request.setDetalle("El almuerzo llegó frío");
        return request;
    }
}
