package pe.edu.utec.queueless.pedido;

import org.junit.jupiter.api.BeforeEach;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Tests de los controladores de pedido con MockMvc: el cliente crea su pedido, y las
 * reglas de rol bloquean el acceso cruzado. Usa usuarios simulados con su rol.
 */
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class PedidoMockMvcIT extends AbstractIntegrationTest {

    private static final String CLIENTE = "cliente.pmvc@utec.edu.pe";
    private static final String COMERCIO = "comercio.pmvc@utec.edu.pe";

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
    private Long productoId;

    @BeforeEach
    void setUp() {
        Usuario comercio = registrar(COMERCIO, Rol.COMERCIO);
        PuntoDeVentaResponse local = puntoDeVentaService.crearComoComercio(comercio, localRequest());
        ProductoResponse producto = productoService.crear(comercio, productoRequest(local.getId()));
        puntoDeVentaId = local.getId();
        productoId = producto.getId();
        registrar(CLIENTE, Rol.CLIENTE);
    }

    @Test
    @WithMockUser(username = CLIENTE, roles = {"CLIENTE"})
    @DisplayName("el cliente crea un pedido y recibe 201 con estado pendiente de pago")
    void shouldCreatePedidoWhenClient() throws Exception {
        String body = """
            {"puntoDeVentaId":%d,"tipoEntrega":"PICKUP","items":[{"productoId":%d,"cantidad":1}]}"""
            .formatted(puntoDeVentaId, productoId);

        mockMvc.perform(post("/api/cliente/pedidos")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.data.id").isNumber())
            .andExpect(jsonPath("$.data.estado").value("PENDIENTE_PAGO"));
    }

    @Test
    @WithMockUser(username = CLIENTE, roles = {"CLIENTE"})
    @DisplayName("un cliente recibe 403 al entrar a la cola del comercio")
    void shouldReturn403WhenClientHitsComercioRoute() throws Exception {
        mockMvc.perform(get("/api/comercio/pedidos/cola"))
            .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = COMERCIO, roles = {"COMERCIO"})
    @DisplayName("el comercio ve su cola con 200")
    void shouldListQueueWhenComercio() throws Exception {
        mockMvc.perform(get("/api/comercio/pedidos/cola"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data").isArray());
    }

    private Usuario registrar(String email, Rol rol) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setPassword("password123");
        request.setNombreCompleto("Demo " + email);
        request.setRoles(new HashSet<>(Set.of(rol)));
        authService.register(request);
        return usuarioRepository.findByEmail(email).orElseThrow();
    }

    private CrearPuntoDeVentaRequest localRequest() {
        CrearPuntoDeVentaRequest request = new CrearPuntoDeVentaRequest();
        request.setNombre("Local Pedido MVC");
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
