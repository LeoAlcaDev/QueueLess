package pe.edu.utec.queueless.puntoventa;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.utec.queueless.auth.dto.RegisterRequest;
import pe.edu.utec.queueless.auth.service.AuthService;
import pe.edu.utec.queueless.integration.AbstractIntegrationTest;
import pe.edu.utec.queueless.puntoventa.dto.CrearProductoRequest;
import pe.edu.utec.queueless.puntoventa.dto.CrearPuntoDeVentaRequest;
import pe.edu.utec.queueless.puntoventa.dto.PuntoDeVentaResponse;
import pe.edu.utec.queueless.puntoventa.entity.TipoPreparacion;
import pe.edu.utec.queueless.puntoventa.service.ProductoService;
import pe.edu.utec.queueless.puntoventa.service.PuntoDeVentaService;
import pe.edu.utec.queueless.usuario.entity.Rol;
import pe.edu.utec.queueless.usuario.entity.Usuario;
import pe.edu.utec.queueless.usuario.repository.UsuarioRepository;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests del catalogo publico con MockMvc: listado, detalle, productos, tiempo
 * estimado y el 404 de un local inexistente. Endpoints abiertos, sin token.
 */
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class CatalogoMockMvcIT extends AbstractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AuthService authService;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PuntoDeVentaService puntoDeVentaService;

    @Autowired
    private ProductoService productoService;

    private Long puntoDeVentaId;

    @BeforeEach
    void setUp() {
        Usuario comercio = registrar("comercio.cat@utec.edu.pe");
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest());
        productoService.crear(comercio, productoRequest(local.getId()));
        puntoDeVentaId = local.getId();
    }

    @Test
    @DisplayName("el listado de puntos de venta responde 200")
    void shouldListStoresWhenPublic() throws Exception {
        mockMvc.perform(get("/api/puntos-de-venta"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("el detalle de un local existente responde 200 con su nombre")
    void shouldReturnStoreDetailWhenExists() throws Exception {
        mockMvc.perform(get("/api/puntos-de-venta/{id}", puntoDeVentaId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.nombre").value("Local Catalogo"));
    }

    @Test
    @DisplayName("un local inexistente responde 404")
    void shouldReturn404WhenStoreMissing() throws Exception {
        mockMvc.perform(get("/api/puntos-de-venta/{id}", 999999))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("los productos del local responden 200")
    void shouldListProductsWhenStoreExists() throws Exception {
        mockMvc.perform(get("/api/puntos-de-venta/{id}/productos", puntoDeVentaId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    @Test
    @DisplayName("el tiempo estimado responde 200 con los minutos")
    void shouldReturnEstimatedTimeWhenStoreExists() throws Exception {
        mockMvc.perform(get("/api/puntos-de-venta/{id}/tiempo-estimado", puntoDeVentaId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.minutos").isNumber());
    }

    private Usuario registrar(String email) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("password123");
        request.setNombreCompleto("Demo " + email);
        request.setRoles(new HashSet<>(Set.of(Rol.COMERCIO)));
        authService.register(request);
        return usuarioRepository.findByEmail(email).orElseThrow();
    }

    private CrearPuntoDeVentaRequest localRequest() {
        CrearPuntoDeVentaRequest request = new CrearPuntoDeVentaRequest();
        request.setNombre("Local Catalogo");
        request.setUbicacion("Bloque A");
        return request;
    }

    private CrearProductoRequest productoRequest(Long puntoDeVentaId) {
        CrearProductoRequest request = new CrearProductoRequest();
        request.setPuntoDeVentaId(puntoDeVentaId);
        request.setNombre("Cafe");
        request.setPrecio(new BigDecimal("7.00"));
        request.setTipoPreparacion(TipoPreparacion.PREPARADO);
        return request;
    }
}
