# ADR-0022 — Versionado de la API bajo /api/v1 y autorización con @PreAuthorize

## Contexto

El backend lo van a consumir clientes reales: el panel web del comercio y la app móvil de
clientes y repartidores. Antes de exponerlo conviene **congelar el contrato bajo un prefijo
de versión**. Si más adelante hay un cambio que rompe compatibilidad, se publica como
`/api/v2/...` sin romper a los clientes que ya están en `/api/v1/...`. Es una práctica REST
estándar y, además, la rúbrica del curso la pide explícitamente: el nivel "Excelente" del
criterio 7.1 (Diseño RESTful) exige URIs versionadas (`/api/v1/`).

En paralelo, hasta ahora la autorización vivía en un solo lugar: las reglas por prefijo de
URL en `SecurityConfig` (la cadena de filtros de Spring Security). Funciona y es la opción
más performante —rechaza la petición antes de llegar al controller—, pero deja la decisión
de autorización lejos del método que protege. La rúbrica (criterio 6.3) pide `@PreAuthorize`
en los métodos sensibles.

Este ADR fija dos decisiones de la Fase de mejoras (Issue #11): (1) versionar todos los
endpoints productivos bajo `/api/v1/`, con un puñado de excepciones documentadas, y (2)
sumar `@PreAuthorize` a nivel de clase en los controllers principales, **complementario** a
las reglas de URL, no en reemplazo.

## Decisión

### Todo lo productivo pasa a /api/v1

Los 14 controllers productivos pasan de `/api/...` a `/api/v1/...` (trece a nivel de clase
con `@RequestMapping`, y `ResenaPublicaController`, que usa rutas a nivel de método, en sus
dos `@GetMapping`). Las reglas por rol y las públicas de `SecurityConfig` se actualizan a
`/api/v1/`.

**Excepciones que se mantienen sin versionar**, a propósito:

| Prefijo | Por qué sin versión |
|---|---|
| `/api/auth/**` | Registro y login. Son el primer contacto del cliente y de cualquier integración externa; no queremos romperlos con un cambio de versión. El endpoint de refresh (Issue #12) vive también acá. |
| `/api/pago/webhook/**` | El webhook lo invoca la pasarela de pagos, no nuestros clientes; su URL la fija la configuración de la pasarela. |
| `/api/dev/**` | Endpoint de ayuda en desarrollo (`DevPedidoController`), no contractual, no lo consume ningún cliente. |

Las rutas de framework (`/actuator`, `/swagger-ui`, `/v3/api-docs`, `/uploads`) no son parte
del contrato de la API y no se tocan. `CorsConfig` mapea `/api/**`, que ya cubre `/api/v1/**`
y las excepciones, así que **no cambia** (estrecharlo a `/api/v1/**` rompería auth y webhook).

### @PreAuthorize a nivel de clase, complementario a las reglas de URL

`SecurityConfig` ya tiene `@EnableMethodSecurity`, así que `@PreAuthorize` funciona sin
configuración extra. Lo aplicamos **a nivel de clase** en los diez controllers principales:

| Controllers | Anotación |
|---|---|
| Pedido (cliente), Pago (cliente), Reseña (cliente) | `@PreAuthorize("hasRole('CLIENTE')")` |
| Pedido (comercio), Producto (comercio), Punto de venta (comercio) | `@PreAuthorize("hasRole('COMERCIO')")` |
| Solicitud de delivery (repartidor) | `@PreAuthorize("hasRole('REPARTIDOR')")` |
| Perfiles, QueuePoints, Usuario (cuenta del autenticado) | `@PreAuthorize("isAuthenticated()")` |

Esta capa **no reemplaza** las reglas de URL: las dos conviven. La cadena de filtros rechaza
temprano (antes del controller); `@PreAuthorize` es una segunda línea, visible y declarativa,
justo encima de la clase que protege.

Los controllers **públicos** (catálogo de puntos de venta, productos, tiempo estimado y
reseñas públicas) **no** llevan `@PreAuthorize`: lo bloquearía pese al `permitAll` de la
cadena de filtros. La verificación de propiedad (que un cliente solo vea su propio pedido)
sigue en los services, devolviendo 404 ante un acceso cruzado por id (ADR-0013); no la
movemos a SpEL.

## Defensa

### Por qué versionar en la URI y no en un header

Las alternativas de versionado por header (`Accept-Version: 1`) o por media-type
(`Accept: application/vnd.queueless.v1+json`) son más "puristas", pero opacas: no se ven en
la URL, son más difíciles de probar con `curl` o Postman, complican el caché y no es lo que
enseña el curso. El versionado en la URI (`/api/v1/`) es explícito, fácil de documentar y
probar, y es el que pide la rúbrica. Para un proyecto académico es la opción correcta.

### Por qué `/api/auth` y el webhook quedan sin versión

`/api/auth` es el punto de entrada más estable y el primero que llama cualquier cliente;
versionarlo agregaría fricción sin beneficio, y el refresh token del Issue #12 se apoya en
ese mismo prefijo. El webhook lo controla la pasarela: su URL la fija la integración externa,
no nuestro contrato. `/api/dev` es una herramienta interna. Versionar estos tres no aporta y
sí podría romper integraciones.

### Por qué `@PreAuthorize` complementario y no en reemplazo

Quitar las reglas de URL para depender solo de `@PreAuthorize` perdería el rechazo temprano
de la cadena de filtros y dispersaría el modelo de seguridad por todos los controllers.
Mantener ambas capas es *defense-in-depth*: si una se configura mal, la otra cubre. El costo
—la misma regla de rol en dos lugares— es bajo y los tests de controlador (MockMvc) validan
el resultado.

### Por qué a nivel de clase y sin SpEL de propiedad

Ningún controller mezcla endpoints públicos y privados (el catálogo público vive en
controllers separados de la gestión del comercio), así que el nivel de clase es correcto y
conciso; el nivel de método solo haría falta para controllers mixtos, que no tenemos. Y la
propiedad ("este pedido es tuyo") ya la resuelven los services (ADR-0013): meterla como SpEL
(`#id == authentication.principal...`) sería frágil y redundante. `@PreAuthorize` se queda en
granularidad de rol / autenticación.

## Alternativas consideradas

### Alternativa 1 — No versionar

Dejar todo en `/api/...`. Descartada: la rúbrica 7.1 exige `/api/v1/` para el nivel
"Excelente", y un cambio futuro que rompa compatibilidad no tendría salida sin versión.

### Alternativa 2 — Versionado por header o media-type

`Accept-Version` o `Accept: ...vnd...v1+json`. Descartada por opaca y difícil de probar; la
URI versionada es más simple y estándar para este contexto.

### Alternativa 3 — `@PreAuthorize` en reemplazo de las reglas de URL

Mover toda la autorización a método. Descartada: pierde el rechazo temprano y dispersa el
modelo. Las dos capas juntas son más robustas.

### Alternativa 4 — Versionar también auth y webhook

Descartada: estabilidad para clientes/integraciones externas y la URL del webhook la fija la
pasarela.

### Alternativa 5 — SpEL de propiedad en `@PreAuthorize`

Descartada: los services ya verifican propiedad (ADR-0013); duplicarlo en SpEL es frágil.

## Consecuencias

### Positivas

- **Contrato preparado para evolucionar.** Un cambio incompatible futuro sale como `/api/v2`
  sin romper a los clientes de `/api/v1`.
- **Autorización visible y redundante.** Se lee junto al código y suma una segunda línea de
  defensa a la cadena de filtros.
- **Cumple la rúbrica:** 7.1 (versionado) de lleno y aporta a 6.3 (`@PreAuthorize`).

### Negativas

- **Los clientes deben usar `/api/v1`.** Hoy sin impacto: los esqueletos `web/` y `mobile/`
  todavía no consumen el backend.
- **Pequeña inconsistencia:** auth, webhook y dev quedan sin versión. Documentada y
  justificada (estabilidad / control externo / no-contractual).
- **Misma regla de rol en dos capas** (URL y método). Si un rol cambia, se tocan ambas.
  Mitigación: son pocas reglas y los tests de controlador validan el resultado.

### Riesgos

- **Un path olvidado sin versionar** daría 404 al cliente. Mitigación: el refactor se hizo
  con un reemplazo acotado por lista blanca de prefijos + un `grep` de verificación (las
  únicas rutas `/api/` que no son `/api/v1/` son las excepciones) + un smoke con `curl` + la
  CI corre los `*MockMvcIT` y `*FlowIT` contra los paths nuevos.
- **Un `@PreAuthorize` mal puesto en un controller público** lo bloquearía. Mitigación: los
  públicos no llevan la anotación; solo los protegidos.

## Anexo — Glosario de términos técnicos

**Versionado de API (URI versioning).** Incluir la versión del contrato en la ruta
(`/api/v1/...`). Permite publicar una `/api/v2/...` con cambios incompatibles mientras los
clientes viejos siguen usando `/api/v1/...` sin romperse.

Ejemplo concreto: el catálogo público pasó de `/api/puntos-de-venta` a
`/api/v1/puntos-de-venta`. Si algún día cambia su forma de respuesta, se publicaría
`/api/v2/puntos-de-venta` sin tocar la v1.

**`@PreAuthorize`.** Anotación de Spring Security que evalúa una expresión de autorización
**antes** de ejecutar el método (o todos los métodos de la clase, si está a nivel de clase).
Si la expresión es falsa, lanza `AccessDeniedException` (403) y el método no corre.

Ejemplo concreto: `@PreAuthorize("hasRole('CLIENTE')")` sobre `PedidoClienteController` exige
que el usuario autenticado tenga el rol CLIENTE para cualquier endpoint de la clase.

**`@EnableMethodSecurity`.** Anotación que activa la seguridad a nivel de método (incluido
`@PreAuthorize`). Sin ella, las anotaciones de método se ignoran. En QueueLess ya estaba en
`SecurityConfig`.

**Cadena de filtros vs. seguridad de método.** Dos lugares donde se decide la autorización.
La **cadena de filtros** (las reglas `requestMatchers(...).hasRole(...)` de `SecurityConfig`)
corre antes que el controller y rechaza temprano. La **seguridad de método**
(`@PreAuthorize`) corre al invocar el método. En QueueLess usamos ambas, complementarias.

**Defense-in-depth.** Estrategia de poner varias capas de control en vez de confiar en una
sola: si una falla o se configura mal, otra cubre. Acá, las reglas de URL y `@PreAuthorize`
protegen lo mismo desde dos lugares.

**SpEL (Spring Expression Language).** El lenguaje de expresiones que `@PreAuthorize` puede
evaluar (`hasRole('X')`, `isAuthenticated()`, o lógica más compleja como
`#id == authentication.principal.id`). Mantenemos el uso simple (rol / autenticación); la
lógica de propiedad vive en los services.

## Referencias

- ADR-0004 — Swagger / OpenAPI (la documentación ahora refleja `/api/v1`).
- ADR-0007 — Multi-rol y composición de perfiles (los roles CLIENTE/COMERCIO/REPARTIDOR que usan las anotaciones).
- ADR-0013 — Integración con pasarela de pagos (verificación de propiedad y 404 ante acceso cruzado en los services; el webhook que queda sin versionar).
- ADR-0019 — Taxonomía de excepciones y códigos HTTP (el 403 que produce `@PreAuthorize` y el `AccessDeniedException` que mapea el handler).
- `backend/src/main/java/pe/edu/utec/queueless/config/SecurityConfig.java` — reglas de URL bajo `/api/v1/` y `@EnableMethodSecurity`.
- Los 14 controllers versionados (paquetes `pedido`, `pago`, `puntoventa`, `delivery`, `queuepoints`, `usuario`, `waittime`) y los 10 con `@PreAuthorize`.
