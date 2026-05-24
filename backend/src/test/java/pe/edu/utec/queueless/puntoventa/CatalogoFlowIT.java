package pe.edu.utec.queueless.puntoventa;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.ProductoResponse;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.Producto;
import pe.edu.utec.queueless.puntoventa.entity.PuntoDeVenta;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.repository.ProductoRepository;
import pe.edu.utec.queueless.puntoventa.repository.PuntoDeVentaRepository;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
import pe.edu.utec.queueless.shared.exception.ResourceNotFoundException;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Flujo end-to-end del catalogo contra un Postgres real (TestContainers). Cada test
 * corre en su propia transaccion con rollback, asi la base queda limpia entre casos.
 */
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class CatalogoFlowIT extends AbstractIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PuntoDeVentaService puntoDeVentaService;

    @Autowired
    private ProductoService productoService;

    @Autowired
    private PuntoDeVentaRepository puntoDeVentaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private Usuario registrar(String email, Rol... roles) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("password123");
        request.setNombreCompleto("Demo " + email);
        request.setRoles(new HashSet<>(Set.of(roles)));
        authService.register(request);
        return usuarioRepository.findByEmail(email).orElseThrow();
    }

    private CrearPuntoDeVentaRequest localRequest(String nombre) {
        CrearPuntoDeVentaRequest request = new CrearPuntoDeVentaRequest();
        request.setNombre(nombre);
        request.setUbicacion("Bloque A");
        return request;
    }

    private CrearProductoRequest productoRequest(Long puntoDeVentaId, String nombre) {
        CrearProductoRequest request = new CrearProductoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setNombre(nombre);
        request.setPrecio(new BigDecimal("10.00"));
        request.setTipoPreparacion(TipoPreparacion.PREPARADO);
        return request;
    }

    @Test
    @DisplayName("un comercio crea su local y producto, y todo persiste en la base")
    void comercioGestionaSuCatalogo() {
        // Arrange
        Usuario comercio = registrar("dueno.cafe@utec.edu.pe", Rol.COMERCIO);

        // Act
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest("Cafe IT"));
        ProductoResponse producto = productoService.crear(comercio, productoRequest(local.getId(), "Cafe americano"));
        productoService.eliminar(comercio, producto.getId());

        // Assert
        PuntoDeVenta localGuardado = puntoDeVentaRepository.findById(local.getId()).orElseThrow();
        assertThat(localGuardado.getActivo()).isTrue();
        assertThat(localGuardado.getGestor().getId()).isEqualTo(comercio.getId());

        Producto productoGuardado = productoRepository.findById(producto.getId()).orElseThrow();
        assertThat(productoGuardado.getDisponible()).isFalse();   // marcado, no borrado
    }

    @Test
    @DisplayName("el catalogo publico muestra solo locales abiertos y productos disponibles")
    void catalogoPublicoFiltraInactivosYNoDisponibles() {
        // Arrange
        Usuario comercio = registrar("dueno.menu@utec.edu.pe", Rol.COMERCIO);
        PuntoDeVentaResponse abierto = puntoDeVentaService.crearComoComercio(comercio, localRequest("Abierto IT"));
        PuntoDeVentaResponse cerrado = puntoDeVentaService.crearComoComercio(comercio, localRequest("Cerrado IT"));
        puntoDeVentaService.cambiarEstado(comercio, cerrado.getId(), false);

        ProductoResponse visible = productoService.crear(comercio, productoRequest(abierto.getId(), "Visible"));
        ProductoResponse oculto = productoService.crear(comercio, productoRequest(abierto.getId(), "Oculto"));
        productoService.eliminar(comercio, oculto.getId());

        // Act
        List<PuntoDeVentaResponse> localesPublicos = puntoDeVentaService.listarAbiertos();
        List<ProductoResponse> productosPublicos = productoService.listarPorPuntoDeVenta(abierto.getId());

        // Assert
        assertThat(localesPublicos).extracting(PuntoDeVentaResponse::getNombre)
            .contains("Abierto IT")
            .doesNotContain("Cerrado IT");
        assertThat(productosPublicos).extracting(ProductoResponse::getNombre)
            .contains("Visible")
            .doesNotContain("Oculto");
    }

    @Test
    @DisplayName("un local dado de baja desaparece del listado publico y del dashboard del gestor")
    void localEliminadoDesapareceDeListados() {
        // Arrange
        Usuario comercio = registrar("dueno.baja@utec.edu.pe", Rol.COMERCIO);
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest("Temporal IT"));

        // Act
        puntoDeVentaService.eliminar(comercio, local.getId());

        // Assert
        assertThat(puntoDeVentaService.listarPorGestor(comercio)).isEmpty();
        assertThat(puntoDeVentaService.listarAbiertos())
            .extracting(PuntoDeVentaResponse::getId)
            .doesNotContain(local.getId());
        assertThat(puntoDeVentaRepository.findById(local.getId())).isPresent();   // sigue en DB
        assertThatThrownBy(() -> puntoDeVentaService.obtenerDetallePublico(local.getId()))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @WithMockUser(username = "cliente.it@utec.edu.pe", roles = {"CLIENTE"})
    @DisplayName("un usuario sin rol COMERCIO recibe 403 al crear un punto de venta")
    void usuarioSinRolComercioRecibe403() throws Exception {
        String body = objectMapper.writeValueAsString(localRequest("No deberia crearse"));

        mockMvc.perform(post("/api/comercio/puntos-de-venta")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isForbidden());
    }
}
