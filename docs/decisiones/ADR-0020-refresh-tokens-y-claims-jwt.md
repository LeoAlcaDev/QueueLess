# ADR-0020 — Refresh tokens y claims enriquecidos en el JWT

## Contexto

Hoy, cuando un usuario se registra o hace login, emitimos **un solo token JWT**. Ese token tiene dos características que se nos quedan cortas:

- **Dura 24 horas** (la propiedad `queueless.jwt.expiration-ms`).
- **Lleva un único dato útil:** el `subject`, que en QueueLess es el email del usuario. No lleva ni el id ni los roles. Para resolver cualquiera de esas dos cosas, el backend tiene que ir a la base de datos.

Para una app móvil —que es el cliente principal de QueueLess— una sola expiración es un mal compromiso:

- Si la hacemos **corta** (por ejemplo 1 hora), el usuario se desloguea seguido y tiene que volver a escribir su contraseña. Experiencia pobre.
- Si la hacemos **larga** (las 24 horas de hoy, o más), un token robado le sirve al atacante todo ese tiempo. Riesgo alto.

La práctica estándar de la industria para salir de ese dilema es emitir **dos tokens** con roles distintos: un **access token corto** que viaja en cada request, y un **refresh token largo** que solo viaja a un endpoint dedicado para conseguir un access nuevo. Si roban el access, vale poco tiempo; el refresh, que vale mucho, casi no se expone porque solo se manda a un endpoint.

Además, la rúbrica del curso pide explícitamente dos cosas que hoy no tenemos: **"extracción de claims (userId, email, roles)"** y **"refresh tokens implementados"**. No es una mejora opcional.

Dos cosas que ya están en el proyecto y son relevantes para este ADR:

- **Spring Security trabaja sin estado** (`SessionCreationPolicy.STATELESS`): no hay sesión en el servidor, cada request se autentica únicamente con el token que trae. Esto hace que los datos que metamos en el token (como los roles) estén disponibles para resolver la autorización de cada request sin volver a consultar la base.
- **`/api/auth/**` quedó sin versionar a propósito** (ADR-0022), pensando justamente en este endpoint de refresh: es el punto de entrada más estable de la API y no queremos romperlo con un cambio de versión.

## Decisión

Tomamos cinco decisiones.

### 1. Dos tipos de token con expiraciones distintas

- **Access token: 15 minutos.** Es el que viaja en `Authorization: Bearer <token>` en cada request a un endpoint protegido.
- **Refresh token: 30 días.** Es el que viaja **solo** a `POST /api/auth/refresh` para obtener un par nuevo.

### 2. Claims nuevos en el access token

El access token lleva, además del `subject` (email) que ya tenía:

- **`uid`**: el id del usuario (un número).
- **`roles`**: la lista de roles como nombres (por ejemplo `["CLIENTE"]` o `["CLIENTE", "REPARTIDOR"]`).
- **`type`**: el literal `"access"`.

El refresh token es mínimo: lleva el `subject` y **`type`** con el valor `"refresh"`. No lleva `uid` ni `roles` porque no se usa para autorizar requests, solo para pedir un par nuevo.

### 3. Endpoint nuevo: `POST /api/auth/refresh`

Recibe el refresh token en el body y devuelve un par nuevo (access + refresh). Va **sin** `/v1/` (es `/api/auth/refresh`, no `/api/v1/auth/refresh`), consistente con el resto de `/api/auth/**` (ADR-0022).

### 4. Rotación "soft" del refresh

Cada llamada a `/api/auth/refresh` emite un refresh nuevo además del access. Pero el refresh anterior **sigue siendo criptográficamente válido hasta su expiración natural**: no lo invalidamos. No implementamos invalidación real porque no tenemos dónde guardar el estado de los tokens (ni una tabla de tokens, ni un campo `tokenVersion` en `Usuario`, ni Redis). Es una mitigación **parcial**, y la documentamos como tal en Consecuencias.

### 5. Expiraciones configurables por variable de entorno

Las dos expiraciones quedan en `application.yml` con defaults razonables y override por env var:

```yaml
queueless:
  jwt:
    secret: ${JWT_SECRET:dev-secret-change-me-in-prod-this-must-be-32-bytes-or-more}
    access-expiration-ms: ${JWT_ACCESS_EXPIRATION_MS:900000}        # 15 minutos
    refresh-expiration-ms: ${JWT_REFRESH_EXPIRATION_MS:2592000000}  # 30 días
    issuer: queueless
```

**Un detalle de firma:** los dos tokens se firman con la **misma secret HS256** (`queueless.jwt.secret`). No usamos dos secrets distintas (una para el access, otra para el refresh) porque no tenemos ningún caso de uso que lo justifique: no necesitamos rotar la firma de un tipo sin el otro ni revocar en masa solo los refresh. Una sola secret es más simple de operar y de validar al arrancar (lo hace `JwtSecretValidator`).

## Por qué

### Por qué 15 minutos para el access

Es el balance habitual entre experiencia y mitigación de robo. Lo bastante largo para que el usuario no note renovaciones (la app las hace sola con el refresh, en segundo plano), y lo bastante corto para que un access robado sirva poco. El número exacto es configurable por si queremos ajustarlo sin recompilar.

### Por qué 30 días para el refresh

Es el estándar de facto en apps móviles: el usuario abre la app, no tiene que loguearse de nuevo durante semanas, y mientras tanto el access se renueva solo. Si el usuario no usa la app en 30 días, vuelve a loguearse una vez. Aceptable.

### Por qué meter `uid` y `roles` como claims

Hoy el filtro de seguridad (`JwtAuthenticationFilter`), en **cada** request autenticado, hace `loadUserByUsername(email)` —una consulta a la base— solo para conocer los roles del usuario y armar su `Authentication`. Con los roles dentro del token, el filtro arma el `Authentication` leyendo el propio token, **sin tocar la base**.

Importa ser honestos con el alcance: esto elimina el lookup **del filtro**, no todos los lookups. Los controllers siguen haciendo `usuarioService.findByEmail(...)` cuando necesitan la entidad `Usuario` completa (por ejemplo `PedidoClienteController` para crear un pedido a nombre del cliente). O sea, pasamos de **dos** consultas por request (la del filtro + la del controller) a **una** (la del controller). El claim `uid` deja la puerta abierta a optimizar también esa —resolviendo por id, o evitándola— pero eso queda fuera de este issue.

### Por qué un claim `type` (access/refresh)

Sin un campo que distinga los dos tokens, un **access token robado** se podría enviar a `/api/auth/refresh` y, como es un JWT válido y todavía no expiró, el endpoint emitiría un par nuevo —incluido un refresh de 30 días—. El atacante convertiría un robo de 15 minutos en un acceso persistente, anulando todo el beneficio del access corto. Con el claim `type`:

- `/api/auth/refresh` exige `type=refresh`. Un access (que lleva `type=access`) es rechazado con 401.
- El filtro exige `type=access`. Un refresh usado como Bearer no autentica.

Cierra el hueco y mantiene coherente el argumento de seguridad de todo el diseño.

### Por qué rotación soft y no completa

La rotación **completa** —invalidar el refresh anterior en cada renovación— exige guardar estado: un campo `tokenVersion` en `Usuario`, o una lista de revocación en Redis. No tenemos ninguna de las dos, y el costo de agregarlas no se justifica para un proyecto académico sin usuarios reales en producción. La protección real contra el robo viene de otro lado: el access es corto (15 min) y el refresh casi no se expone (solo viaja a un endpoint). La rotación soft agrega una mejora menor —el cliente siempre recibe un refresh fresco— sin la complejidad de la invalidación real.

### Por qué `/api/auth/refresh` sin `/v1/`

Por consistencia con la decisión del ADR-0022: todo `/api/auth/**` queda sin versionar porque es el punto de entrada más estable y el primero que llama cualquier cliente o integración. El refresh es parte de ese flujo de entrada.

### Por qué meter los roles en el claim si pueden cambiar

El ADR-0007 (multi-rol) describe que un usuario puede activar roles nuevos en tiempo de ejecución: Camila Rojas es cliente y, cuando se anota como repartidora, su set de roles pasa a `{CLIENTE, REPARTIDOR}`. Si los roles viven en el access token, un cambio de rol **no se refleja hasta que el token se renueva** (como máximo, 15 minutos después). Cuando se renueva sí lo refleja, porque `/api/auth/refresh` recarga los roles desde la base al emitir el access nuevo. El propio ADR-0007 ya anticipaba esto: dice que el rol nuevo aparece "la próxima vez que el usuario hace login (o refresca su token)". Es un trade-off aceptable y estándar: 15 minutos de desfase a cambio de no consultar la base en cada request.

## Alternativas consideradas

### Alternativa 1 — Un solo token largo con lista de revocación en Redis

Mantener un token y, para poder revocarlo, llevar una blacklist en Redis. Descartada: agrega una dependencia operacional (un Redis corriendo, monitoreado, con su propia disponibilidad) que el proyecto no tiene ni necesita. La complejidad no se paga.

### Alternativa 2 — Refresh token sin rotación

Emitir el refresh una vez en el login y reusar el mismo hasta que expire. Descartada: si ese refresh se filtra, el atacante lo usa los 30 días completos sin que el sistema emita nunca uno nuevo que delate el uso. La rotación soft, aunque parcial, al menos hace que el cliente legítimo siempre tenga el último.

### Alternativa 3 — Seguir con un token único, pero corto (1 hora)

Bajar la expiración actual a 1 hora y no implementar refresh. Descartada: en móvil, obligar a reloguear cada hora es inaceptable, y además no cumple el requisito explícito de la rúbrica de tener refresh tokens.

### Alternativa 4 — Rotación completa con `tokenVersion` en `Usuario`

Agregar una columna `tokenVersion` a `Usuario`, meterla como claim, e invalidar todos los tokens viejos subiéndola. Descartada: agrega una migración, un claim más y una consulta de verificación, para un beneficio marginal en un proyecto sin usuarios reales. Queda anotada como pendiente por si algún día aparece un caso como "cerrar sesión en todos los dispositivos".

## Consecuencias

### Lo que mejora

- **Experiencia móvil:** el usuario no se desloguea; la app renueva el access en segundo plano con el refresh.
- **Una consulta menos por request:** el filtro ya no va a la base para resolver roles (ver la nota honesta arriba: queda la del controller).
- **Mitigación parcial de robo:** un access robado vale 15 minutos y no se puede escalar a un refresh (gracias al claim `type`).
- **Cumple la rúbrica:** claims (`uid`, `roles`) y refresh tokens, los dos requisitos explícitos.

### Lo que cuesta

- **`AuthResponse` cambia:** el campo `token` se reemplaza por `accessToken` y `refreshToken`. Los clientes (web y móvil) deben actualizarse. Hoy sin impacto real: los esqueletos `web/` y `mobile/` todavía no consumen el backend.
- **Un endpoint más que mantener** (`/api/auth/refresh`) y la lógica de rotación que testear.
- **Los cambios de rol tardan hasta 15 minutos en propagarse** (la expiración del access).

### Limitaciones conocidas

- **La rotación es soft.** Si un refresh se filtra y se usa antes de su expiración natural, el atacante puede generar tokens hasta que ese refresh expire (hasta 30 días). La mitigación es que el access es corto y el refresh casi no viaja, pero la limitación existe y la dejamos escrita.
- **Sin fallback para tokens viejos.** Al desplegar este cambio, los tokens emitidos con el esquema anterior (sin `uid`/`roles`/`type`) dejan de autenticar y los usuarios tienen que loguearse de nuevo. Para un proyecto académico sin usuarios reales activos, es aceptable.

### Pendientes para el futuro

- Rotación real con `tokenVersion` o Redis, si el proyecto crece o aparece un caso como "logout en todos los dispositivos".
- Aprovechar el claim `uid` para evitar también el `findByEmail` de los controllers.

## Anexo — Glosario de términos técnicos

**Claim.** Cada dato que viaja dentro de un JWT. Un claim es un par clave-valor. Ejemplo del payload de un access token de QueueLess:

```json
{ "sub": "camila@utec.edu.pe", "uid": 42, "roles": ["CLIENTE", "REPARTIDOR"], "type": "access", "iat": 1748000000, "exp": 1748000900 }
```

**Access token vs. refresh token.** El **access** es el que se manda en `Authorization: Bearer <token>` en cada request a un endpoint protegido; es corto (15 min). El **refresh** solo se manda a `POST /api/auth/refresh` para conseguir un par nuevo; es largo (30 días) y casi no se expone.

**Rotación de tokens.** Emitir un refresh nuevo en cada renovación. En QueueLess es **soft**: el refresh anterior no se invalida, sigue válido hasta su expiración natural (a diferencia de la rotación "completa", que sí invalidaría el viejo).

**Subject (`sub`).** Claim estándar de JWT que identifica al titular del token. En QueueLess es el email del usuario. El filtro lo usa para saber a quién pertenece el token, y los controllers lo leen vía `authentication.getName()`.

**`type` (claim propio).** Claim que agregamos para distinguir los dos tokens: `"access"` o `"refresh"`. Permite que `/api/auth/refresh` rechace un access y que el filtro rechace un refresh, evitando usarlos de forma cruzada.

**`iat` y `exp`.** Dos claims estándar de tiempo, expresados en segundos desde el epoch Unix (1 de enero de 1970). `iat` (*issued at*) es cuándo se emitió el token; `exp` (*expiration*) es cuándo deja de ser válido. La librería de JWT rechaza automáticamente, al parsearlo, un token cuyo `exp` ya pasó. Ejemplo: un access emitido a las 12:00 lleva un `iat` de las 12:00 y un `exp` de las 12:15.

**HS256 / HMAC SHA-256.** El algoritmo con el que firmamos el token. Toma el contenido del token más una clave secreta (nuestra `queueless.jwt.secret`) y produce una firma; cualquier modificación del contenido invalida la firma. Es simétrico: la misma secret firma y verifica. Ejemplo en QueueLess: `Keys.hmacShaKeyFor(secret.getBytes(UTF_8))` construye la clave de firma a partir de la secret.

**Round-trip a la base.** Una consulta SQL para traer datos del usuario. Hoy el filtro hace un round-trip por request (cargar el usuario para conocer sus roles); con los roles en el claim, el filtro deja de hacerlo.

## Referencias

- `backend/src/main/java/pe/edu/utec/queueless/auth/service/JwtService.java` — generación y validación de tokens; acá viven `generateAccessToken`, `generateRefreshToken` y los extractores de claims.
- `backend/src/main/java/pe/edu/utec/queueless/auth/jwt/JwtAuthenticationFilter.java` — el filtro que lee los claims y arma el `Authentication` sin tocar la base.
- `backend/src/main/java/pe/edu/utec/queueless/auth/service/AuthService.java` — emite el par en register/login y resuelve el refresh.
- `backend/src/main/java/pe/edu/utec/queueless/auth/controller/AuthController.java` — `/api/auth/register`, `/login` y `/refresh`.
- `backend/src/main/java/pe/edu/utec/queueless/auth/dto/AuthResponse.java` — el DTO de respuesta (`accessToken` + `refreshToken`).
- `backend/src/main/java/pe/edu/utec/queueless/config/JwtSecretValidator.java` — valida la secret HS256 al arrancar (sin cambios en este issue).
- `backend/src/main/resources/application.yml` — propiedades `queueless.jwt.*`.
- ADR-0007 — Multi-rol y composición: por la propagación de los cambios de rol al renovar el token.
- ADR-0018 — Hardening del perfil de producción: la secret y su validación siguen igual.
- ADR-0019 — Taxonomía de excepciones y códigos HTTP: el 401 que devuelve `/api/auth/refresh` ante un token inválido reusa el mapeo de `BadCredentialsException`, no lo inventa.
- ADR-0022 — Versionado de la API: por qué `/api/auth/refresh` no lleva `/v1/`.
