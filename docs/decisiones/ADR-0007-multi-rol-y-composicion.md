# ADR-0007 — Multi-rol y composición de perfiles

## Contexto

En el ADR-0003 explicamos por qué los 3 perfiles (cliente, comercio, repartidor) son entidades separadas de Usuario. Este ADR profundiza la siguiente pregunta: **¿cómo se conectan Usuario y sus perfiles? ¿Y cómo manejamos que un mismo usuario pueda tener varios roles a la vez?**

El caso típico que tenemos que soportar: Camila Rojas (que aparece en los seeds de desarrollo) es estudiante. Por la mañana pide su almuerzo como **cliente**. Por la tarde, cuando tiene tiempo libre, activa el rol **repartidor** y entrega pedidos a compañeros para ganar QueuePoints. No es que sea cliente "los lunes" y repartidora "los martes": **es las dos cosas al mismo tiempo**, todo el tiempo. Lo que cambia es qué interfaz del sistema está usando en cada momento.

Eso significa que el modelo tiene que soportar multi-rol genuino. Este ADR fija cómo lo hacemos.

## Decisión

Usamos **composición** entre Usuario y los perfiles, no herencia.

Concretamente:

- `Usuario` tiene un campo `Set<Rol> roles` (modelado como `@ElementCollection`) que indica qué roles tiene activos un usuario en este momento. Camila tiene `{CLIENTE, REPARTIDOR}` en ese set.

- Por cada rol activo, el usuario **tiene** una entidad de perfil asociada vía relación `@OneToOne` con `@MapsId`. Camila tiene un `PerfilCliente` (con su dirección preferida y alergias) y un `PerfilRepartidor` (con su rating y disponibilidad), pero no tiene `PerfilComercio` porque no es vendedora.

- Spring Security carga los roles desde el set y los expone como `GrantedAuthority` con prefijo `ROLE_`. Cada endpoint protegido valida que el JWT del usuario contenga el rol necesario.

Diagrama mental:

```
Usuario (id=42, email=camila@utec.edu.pe)
  ├── roles = {CLIENTE, REPARTIDOR}
  ├── perfil_cliente (usuario_id=42, alergias="maní", direccion="Casa")
  └── perfil_repartidor (usuario_id=42, rating=4.85, disponible=true)
```

## Por qué composición y no herencia JPA

JPA ofrece tres estrategias de herencia: `SINGLE_TABLE`, `JOINED` y `TABLE_PER_CLASS`. En las tres, una entidad hija es **de un solo tipo**.

Si modeláramos esto con `JOINED`, tendríamos:

```java
@Entity
@Inheritance(strategy = JOINED)
abstract class Usuario { ... }

@Entity class Cliente extends Usuario { String alergias; }
@Entity class Comercio extends Usuario { String ruc; }
@Entity class Repartidor extends Usuario { BigDecimal rating; }
```

Eso obliga a que Camila sea **una sola cosa**: o Cliente, o Comercio, o Repartidor. No las dos a la vez. Si quisiéramos agregarle el rol Repartidor a una Camila que ya es Cliente, tendríamos que:

- Cambiar el discriminador en la base (sucio).
- O destruir el row Cliente y crear uno Repartidor (pierde datos).
- O modelar "Camila como Cliente" y "Camila como Repartidora" como dos usuarios distintos con dos emails distintos (rompe la identidad real del usuario).

Ninguna de las tres es aceptable. Y todas surgen del mismo problema raíz: la herencia modela "es un", pero en nuestro dominio queremos "tiene un". Camila **tiene** un perfil cliente Y **tiene** un perfil repartidor. No es que **sea** un cliente o **sea** un repartidor en el sentido excluyente.

Por eso composición. Cada perfil es una entidad independiente que se asocia al Usuario vía relación.

## Cómo se conectan en JPA

Cada perfil usa el patrón `@OneToOne` + `@MapsId`. Acá está el código real:

```java
@Entity
@Table(name = "perfil_cliente")
public class PerfilCliente {

    @Id
    @Column(name = "usuario_id")
    private Long usuarioId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(name = "direccion_preferida")
    private String direccionPreferida;

    // ... otros campos
}
```

Lo que pasa acá:

- **`@Id` directamente sobre `usuarioId`.** La PK de `perfil_cliente` es la misma que su FK a `usuario`. No hay columna `id` independiente.
- **`@MapsId`.** Le dice a JPA: "la PK de esta entidad se mapea desde el ID de la relación con Usuario". O sea, cuando seteás el `usuario`, el `usuarioId` se actualiza automáticamente.
- **`@OneToOne` LAZY.** Solo carga al Usuario cuando lo accedés explícitamente, no en cada query.

El resultado: la tabla `perfil_cliente` tiene una sola columna PK que también es FK. No puede existir un PerfilCliente sin Usuario, y nunca puede haber dos PerfilCliente con el mismo usuario_id (porque eso violaría la unicidad de la PK).

Lo mismo aplica para `PerfilComercio` y `PerfilRepartidor`.

## Cómo se manejan los roles en autenticación

El campo `roles` en Usuario es un `@ElementCollection`:

```java
@ElementCollection(targetClass = Rol.class, fetch = FetchType.EAGER)
@CollectionTable(name = "usuario_roles",
                 joinColumns = @JoinColumn(name = "usuario_id"))
@Column(name = "rol", length = 20)
@Enumerated(EnumType.STRING)
private Set<Rol> roles = new HashSet<>();
```

Eso se materializa en una tabla `usuario_roles` con dos columnas (`usuario_id`, `rol`). Cada combinación es una fila. Si Camila tiene `{CLIENTE, REPARTIDOR}`, en esa tabla hay dos filas:

```
| usuario_id | rol         |
|------------|-------------|
| 42         | CLIENTE     |
| 42         | REPARTIDOR  |
```

Cuando Camila hace login, `CustomUserDetailsService` carga el Usuario y traduce el `Set<Rol>` a Spring Security:

```java
String[] authorities = usuario.getRoles().stream()
    .map(rol -> "ROLE_" + rol.name())
    .toArray(String[]::new);
```

Camila recibe `["ROLE_CLIENTE", "ROLE_REPARTIDOR"]`. Cuando intenta acceder a `/api/cliente/pedidos`, Spring Security verifica que tenga `ROLE_CLIENTE` y la deja pasar. Si intenta `/api/comercio/cola`, verifica `ROLE_COMERCIO`, no lo encuentra, y devuelve 403.

## Cómo se activa un rol nuevo

Cuando un usuario quiere activar un rol que no tiene (ejemplo: un cliente que se anota para ser repartidor), el flujo es:

1. El cliente hace POST a `/api/usuarios/me/activar-rol` con `{ "rol": "REPARTIDOR" }`.
2. `UsuarioService.activarRol(usuarioId, REPARTIDOR)`:
   - Verifica que el rol no esté ya activo.
   - Agrega `REPARTIDOR` al set de roles del usuario.
   - **Crea el `PerfilRepartidor` vacío** asociado al usuario, con valores default (`disponible = false`, `total_entregas = 0`, etc.).
   - Persiste todo en transacción.
3. La próxima vez que el usuario hace login (o refresca su token), su JWT incluye el nuevo rol.

**Importante:** el método `UsuarioService.activarRol` está marcado como TODO de Semana 1 en el código actual. La creación automática del perfil vacío es la pieza que falta. Sin esa pieza, un usuario podría tener el rol activo pero sin perfil asociado, lo que rompe queries que asumen "si tiene rol REPARTIDOR, tiene PerfilRepartidor".

Lo mismo aplica para `AuthService.register`, que también tiene un TODO para crear los perfiles correspondientes al momento de registrar a un usuario nuevo con uno o más roles iniciales.

## Endpoints organizados por rol

Los endpoints están agrupados por rol en la URL, y Spring Security valida el rol a nivel del filtro de seguridad (no por método). El mapping completo:

| Path | Quién puede acceder |
|---|---|
| `/api/auth/**` | Público (register, login) |
| `GET /api/puntos-de-venta/**` | Público (cualquiera puede ver el catálogo) |
| `/api/cliente/**` | Solo usuarios con rol CLIENTE |
| `/api/comercio/**` | Solo usuarios con rol COMERCIO |
| `/api/repartidor/**` | Solo usuarios con rol REPARTIDOR |
| `/api/usuarios/me` | Cualquier usuario autenticado |
| `/api/pago/webhook/**` | Público (la firma se valida adentro del handler) |
| `/v3/api-docs/**`, `/swagger-ui/**` | Público |

Esto es lo que está en `SecurityConfig.securityFilterChain`. El matching se hace a nivel de path, no de método, por simplicidad y performance.

Si Camila (CLIENTE + REPARTIDOR) intenta acceder a `/api/comercio/cola`, Spring Security la rechaza con 403, aunque sí tenga otros roles activos. No hay confusión: una petición es a un endpoint específico, y ese endpoint pertenece a un rol específico.

## Alternativas consideradas

### Alternativa 1 — Herencia JPA con `@Inheritance(strategy = JOINED)`

Ya cubierta arriba: bloquea multi-rol, lo descartamos.

### Alternativa 2 — Un solo Perfil con campos opcionales

Una sola entidad `Perfil` con todos los campos posibles (`alergias`, `ruc`, `rating`), NULL los que no apliquen, y un campo `tipo` que indique CLIENTE/COMERCIO/REPARTIDOR.

Descartado porque:

- Es justamente el problema de sparse columns que ya discutimos en el ADR-0003.
- No soporta multi-rol: una sola fila Perfil con `tipo=CLIENTE` no puede a la vez ser COMERCIO.
- Forzaría a tener 3 filas Perfil para Camila (una por rol), lo que es exactamente lo mismo que 3 entidades separadas pero peor (sin tipo seguro).

### Alternativa 3 — Patrón "Role" como entidad con datos polimórficos

Modelar `Rol` como entidad con un campo `datos` tipo JSONB, donde se guardan los atributos específicos de cada rol.

Descartado porque:

- Perdés tipo seguro: cualquier query sobre RUC o rating tiene que parsear JSON.
- Postgres soporta queries sobre JSONB pero son más lentas y menos legibles que columnas tipadas.
- Validaciones complicadas: ¿cómo asegurás que un PerfilComercio siempre tenga RUC?
- Sobre-ingeniería para un dominio con 3 roles fijos.

## Consecuencias

### Positivas

- **Multi-rol genuino.** Camila puede tener N roles activos sin truchadas.
- **Tipo seguro en código Java.** `usuario.getPerfilCliente()` devuelve un `PerfilCliente`, no un `Map<String, Object>`.
- **Schema limpio.** Cada tabla tiene columnas relevantes a su entidad, sin NULLs sistemáticos.
- **Lazy loading.** Las relaciones LAZY hacen que cargar un Usuario no traiga sus perfiles a menos que los necesites.
- **Autorización por rol simple.** El matcher en `SecurityConfig` es legible: `/api/cliente/**` → `hasRole("CLIENTE")`. Nada más.

### Negativas

- **Más JOINs cuando queremos el perfil completo.** Para mostrar el dashboard de Camila con sus datos de cliente Y de repartidora, hay que joinear 3 tablas. Manageable con `@EntityGraph` o queries específicos cuando importa.
- **La creación de perfiles tiene que coordinarse con la activación de roles.** Activar el rol sin crear el perfil deja al usuario en estado inconsistente. Por eso el TODO en `AuthService.register` y `UsuarioService.activarRol`.

### Riesgos

- **Riesgo de inconsistencia: rol activo sin perfil asociado.** Si por un bug el set de roles tiene REPARTIDOR pero no hay fila en `perfil_repartidor`, cualquier query que asuma "tiene rol → tiene perfil" explota. Mitigación: implementar el TODO de crear perfiles automáticamente al activar el rol. Validación adicional con constraint a nivel de DB (no implementado aún pero posible).
- **Riesgo de roles huérfanos en `usuario_roles`.** Si borramos un usuario sin cascada, los roles quedan colgados. Mitigación: el `ON DELETE CASCADE` en la FK de `usuario_roles` lo previene.

## Anexo — Glosario de términos técnicos

**Composición (programación orientada a objetos).** Relación entre clases donde una clase **contiene** o **tiene** otra clase como atributo. Lo opuesto a herencia, donde una clase **es** un tipo de otra.

Ejemplo concreto: en QueueLess, Usuario **tiene** un PerfilCliente (composición). Si usáramos herencia, diríamos que Usuario **es** un Cliente, lo cual nos limitaría a un solo rol por usuario.

**Herencia (en JPA).** Estrategia donde una entidad hija extiende una entidad padre y JPA traduce esa relación a tablas. Tiene tres modos:

- `SINGLE_TABLE`: padre e hijos en una sola tabla con una columna discriminadora.
- `JOINED`: tabla del padre + tablas de hijos con FK al padre.
- `TABLE_PER_CLASS`: una tabla por cada hijo, sin tabla del padre.

Todas asumen que una instancia es **de un solo tipo concreto**, lo cual bloquea multi-rol.

**`@MapsId`.** Anotación de JPA que indica que la clave primaria de la entidad actual se "mapea" desde el ID de una relación. Lo usamos para que la PK de PerfilCliente sea directamente el `usuario_id`, sin tener una columna `id` separada.

Ejemplo concreto: cuando hacemos `perfilCliente.setUsuario(camila)`, automáticamente `perfilCliente.usuarioId` queda en `42` (el ID de Camila). No hace falta setearlo a mano.

**`@ElementCollection`.** Anotación que mapea una colección de valores simples (no entidades) a una tabla separada, sin que esos valores tengan identidad propia.

Ejemplo concreto: el `Set<Rol>` de Usuario se guarda en una tabla `usuario_roles` con dos columnas (`usuario_id`, `rol`). Cada fila es un rol activo. No tiene sentido tener una entidad Rol con su propio ID porque CLIENTE/COMERCIO/REPARTIDOR son valores fijos del enum.

**`GrantedAuthority` (Spring Security).** Interfaz que representa un permiso o rol que un usuario tiene. Spring Security usa estas autoridades para decidir si un usuario puede acceder a un endpoint protegido. Convencionalmente, los roles se prefijan con `ROLE_` (entonces el rol CLIENTE se representa como la autoridad `ROLE_CLIENTE`).

**Lazy loading (en JPA).** Estrategia donde una relación entre entidades se carga solo cuando se accede explícitamente, no en la query inicial. Útil para no traer datos que no vas a usar. La alternativa es `EAGER`, que carga todo de una.

Ejemplo concreto: cuando cargás un Usuario con `findById`, no se traen sus perfiles automáticamente. Solo cuando llamás `usuario.getPerfilCliente()` se ejecuta un query adicional para traerlo.

**JWT (JSON Web Token).** Token criptográficamente firmado que contiene información sobre un usuario autenticado (ID, email, roles, fecha de expiración). El cliente lo recibe al hacer login y lo envía en cada request en el header `Authorization: Bearer <token>`. El servidor lo valida sin necesidad de consultar la base.

**Filtro de seguridad (Spring Security).** Componente que interceptа cada request HTTP antes de que llegue al controller. Verifica autenticación (¿hay un JWT válido?) y autorización (¿el rol del usuario permite acceder a este endpoint?). En QueueLess es `JwtAuthenticationFilter`.

**`hasRole("X")`.** Método de Spring Security que verifica si el usuario actual tiene el rol X. Internamente compara contra la autoridad `ROLE_X`. Por eso en `CustomUserDetailsService` mapeamos los roles del enum agregándoles el prefijo `ROLE_`.

## Referencias

- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/Usuario.java`
- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/PerfilCliente.java`
- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/PerfilComercio.java`
- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/PerfilRepartidor.java`
- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/Rol.java`
- `backend/src/main/java/pe/edu/utec/queueless/auth/service/CustomUserDetailsService.java`
- `backend/src/main/java/pe/edu/utec/queueless/config/SecurityConfig.java`
- `backend/src/main/resources/db/migration/V1__schema_inicial.sql` — schema de `usuario_roles` y los 3 perfiles.
- ADR-0003 — Modelo de 12 entidades (decisión más amplia de la que este ADR es subdetalle).
