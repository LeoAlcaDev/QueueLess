package pe.edu.utec.queueless.ocupacion.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.utec.queueless.ocupacion.dto.FranjaOcupacion;
import pe.edu.utec.queueless.ocupacion.dto.OcupacionResponse;
import pe.edu.utec.queueless.pedido.repository.PedidoRepository;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.shared.util.TiempoLima;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.waittime.service.WaitTimeService;
import pe.edu.utec.queueless.waittime.strategy.ManualDeclaredStrategy;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests de la curva de ocupación. No levantan Spring ni base: el repositorio y el
 * estimador del ahora van mockeados, y la fórmula de tiempo usa una ManualDeclaredStrategy
 * real con un peso conocido. Patrón AAA.
 */
class OcupacionServiceTest {

    private static final long LOCAL_ID = 1L;
    private static final long GESTOR_ID = 7L;
    private static final int DECLARADO = 10;          // tiempoPromedioDeclarado del local
    private static final int PESO_POR_PEDIDO = 3;     // minutos por pedido en cola
    private static final int MINIMO_PEDIDOS = 5;
    private static final int VENTANA_DIAS = 90;
    private static final int MINUTOS_AHORA = 8;

    private PuntoDeVentaRepository puntoDeVentaRepository;
    private PedidoRepository pedidoRepository;
    private WaitTimeService waitTimeService;
    private OcupacionService service;

    @BeforeEach
    void setUp() {
        puntoDeVentaRepository = mock(PuntoDeVentaRepository.class);
        pedidoRepository = mock(PedidoRepository.class);
        waitTimeService = mock(WaitTimeService.class);

        ManualDeclaredStrategy estrategiaManual = new ManualDeclaredStrategy();
        ReflectionTestUtils.setField(estrategiaManual, "minutosPorPedidoEnCola", PESO_POR_PEDIDO);

        service = new OcupacionService(puntoDeVentaRepository, pedidoRepository, estrategiaManual, waitTimeService);
        ReflectionTestUtils.setField(service, "minimoPedidos", MINIMO_PEDIDOS);
        ReflectionTestUtils.setField(service, "ventanaDias", VENTANA_DIAS);

        when(waitTimeService.estimarMinutos(LOCAL_ID)).thenReturn(MINUTOS_AHORA);
    }

    @Test
    void curvaConDatosMuestraNivelYTiempoYMarcaLasFranjasFlojasComoRecopilando() {
        // Arrange: en un mismo día de la semana, una franja cargada (12h), una floja con
        // datos (18h) y una por debajo del umbral (6h, solo 2 pedidos).
        LocalDate fecha = TiempoLima.fechaDe(Instant.now()).minusDays(1);
        int dia = fecha.getDayOfWeek().getValue();

        List<Instant> creaciones = new ArrayList<>();
        creaciones.addAll(pedidosEnFranja(fecha, 12, 39));
        creaciones.addAll(pedidosEnFranja(fecha, 18, 13));
        creaciones.addAll(pedidosEnFranja(fecha, 6, 2));
        when(puntoDeVentaRepository.findByIdAndActivoTrue(LOCAL_ID)).thenReturn(Optional.of(localDe(GESTOR_ID)));
        when(pedidoRepository.findCreadoAtDePedidosConcretados(eq(LOCAL_ID), any())).thenReturn(creaciones);

        // Act
        OcupacionResponse curva = service.curvaParaCliente(LOCAL_ID);

        // Assert
        assertThat(curva.isHayDatosSuficientes()).isTrue();
        assertThat(curva.getMinutosAhora()).isEqualTo(MINUTOS_AHORA);

        FranjaOcupacion pico = franja(curva, dia, 12);
        FranjaOcupacion valle = franja(curva, dia, 18);
        FranjaOcupacion floja = franja(curva, dia, 6);

        assertThat(pico.isSuficientesDatos()).isTrue();
        assertThat(valle.isSuficientesDatos()).isTrue();
        assertThat(pico.getPedidosTipicos()).isGreaterThan(valle.getPedidosTipicos());
        assertThat(pico.getMinutosEstimados()).isGreaterThan(valle.getMinutosEstimados());

        assertThat(floja.isSuficientesDatos()).isFalse();
        assertThat(floja.getPedidosTipicos()).isNull();
        assertThat(floja.getMinutosEstimados()).isNull();
    }

    @Test
    void elTiempoPorFranjaSaleDelPromedioPorOcurrenciaNoDeLaSuma() {
        // Arrange: 39 pedidos en una sola franja a lo largo de la ventana. En 90 días un
        // día de la semana cae 12 o 13 veces, así que el promedio por ocurrencia es ~3,
        // no 39. Con la suma el tiempo sería 10 + 39×3 = 127, un absurdo.
        LocalDate fecha = TiempoLima.fechaDe(Instant.now()).minusDays(1);
        int dia = fecha.getDayOfWeek().getValue();

        List<Instant> creaciones = pedidosEnFranja(fecha, 12, 39);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(LOCAL_ID)).thenReturn(Optional.of(localDe(GESTOR_ID)));
        when(pedidoRepository.findCreadoAtDePedidosConcretados(eq(LOCAL_ID), any())).thenReturn(creaciones);

        // Act
        FranjaOcupacion pico = franja(service.curvaParaCliente(LOCAL_ID), dia, 12);

        // Assert: promedio ~3 y tiempo 10 + 3×3 = 19, lejos del 127 que daría la suma.
        assertThat(pico.getPedidosTipicos()).isBetween(2.9, 3.3);
        assertThat(pico.getMinutosEstimados()).isEqualTo(DECLARADO + 3 * PESO_POR_PEDIDO);
        assertThat(pico.getMinutosEstimados()).isLessThan(50);
    }

    @Test
    void sinDatosSuficientesDevuelveAunRecopilandoPeroSiElTiempoDelAhora() {
        // Arrange: un puñado de pedidos por debajo del umbral en toda la curva.
        LocalDate fecha = TiempoLima.fechaDe(Instant.now()).minusDays(1);
        when(puntoDeVentaRepository.findByIdAndActivoTrue(LOCAL_ID)).thenReturn(Optional.of(localDe(GESTOR_ID)));
        when(pedidoRepository.findCreadoAtDePedidosConcretados(eq(LOCAL_ID), any()))
            .thenReturn(pedidosEnFranja(fecha, 12, 3));

        // Act
        OcupacionResponse curva = service.curvaParaCliente(LOCAL_ID);

        // Assert
        assertThat(curva.isHayDatosSuficientes()).isFalse();
        assertThat(curva.getMensaje()).isEqualTo("Aún recopilando datos");
        assertThat(curva.getFranjas()).isEmpty();
        assertThat(curva.getMinutosAhora()).isEqualTo(MINUTOS_AHORA);
    }

    @Test
    void elComercioNoVeLaOcupacionDeUnLocalAjeno() {
        // Arrange: el local pertenece a otro gestor.
        when(puntoDeVentaRepository.findByIdAndActivoTrue(LOCAL_ID)).thenReturn(Optional.of(localDe(GESTOR_ID)));
        Usuario otroGestor = new Usuario();
        otroGestor.setId(999L);

        // Act + Assert: un local ajeno se ve como inexistente.
        assertThatThrownBy(() -> service.curvaParaComercio(otroGestor, LOCAL_ID))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    private PuntoDeVenta localDe(Long gestorId) {
        Usuario gestor = new Usuario();
        gestor.setId(gestorId);
        PuntoDeVenta local = PuntoDeVenta.builder()
            .nombre("Café del Bloque A")
            .ubicacion("Bloque A · 1er piso")
            .tiempoPromedioDeclarado(DECLARADO)
            .gestor(gestor)
            .build();
        local.setId(LOCAL_ID);
        return local;
    }

    /** Crea {@code cantidad} pedidos en una fecha y hora dadas (zona Lima), una misma franja. */
    private List<Instant> pedidosEnFranja(LocalDate fecha, int hora, int cantidad) {
        List<Instant> instantes = new ArrayList<>();
        for (int i = 0; i < cantidad; i++) {
            instantes.add(fecha.atTime(hora, i % 60).atZone(TiempoLima.ZONA).toInstant());
        }
        return instantes;
    }

    private FranjaOcupacion franja(OcupacionResponse curva, int dia, int hora) {
        for (FranjaOcupacion f : curva.getFranjas()) {
            if (f.getDiaSemana() == dia && f.getHora() == hora) {
                return f;
            }
        }
        return null;
    }
}
