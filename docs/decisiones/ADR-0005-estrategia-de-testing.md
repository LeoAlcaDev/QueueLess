# ADR-0005 — Estrategia de testing

## Contexto

Cualquier proyecto Java con Spring Boot necesita decidir cómo va a testear. Hay muchas formas de hacerlo y todas tienen pros y contras: tests unitarios puros, tests de integración con base de datos real, tests de slices de Spring, tests end-to-end con servidor HTTP arriba. Cada uno tiene su lugar, pero no podés usarlos todos sin que el costo de mantenimiento se vuelva ingobernable.

Este ADR fija la estrategia que adoptamos para QueueLess: qué se testea, con qué herramienta, dónde viven los archivos, qué corre en local y qué corre en CI.

## Decisión

Adoptamos la **pirámide de testing clásica**, con énfasis en la base:

```
       /\
      /  \    E2E (no aplica todavía, llegará en Semana 3)
     /----\
    /      \   Tests de integración (DB real, *IT.java)
   /--------\
  /          \  Tests unitarios (lógica pura, *Test.java)
 /------------\
```

**Lo concreto:**

- **Tests unitarios** terminan en `*Test.java`. Corren con `maven-surefire-plugin` durante la fase `test`. No requieren Docker ni base de datos. Tests rápidos, milisegundos cada uno.

- **Tests de integración** terminan en `*IT.java`. Corren con `maven-failsafe-plugin` durante la fase `verify`. Heredan de una clase base `AbstractIntegrationTest` que arranca un Postgres efímero usando TestContainers. Tardan segundos cada uno (por el contenedor que se levanta).

- **Smoke test** (`QueuelessApplicationTests.contextLoads`) que verifica que Spring arranca con todo cableado correctamente. Marcado con `@Disabled` en local por razones que explicamos abajo, pero corre en GitHub Actions sin problema.

- **Patrón AAA estricto** (Arrange / Act / Assert) en todos los tests, con `@DisplayName` para que los reportes sean legibles.

- **AssertJ** como librería de aserciones (`assertThat(...).isEqualTo(...)`), que viene incluida en `spring-boot-starter-test` sin agregar dependencias.

## Tests que ya existen al cierre de Semana 1

| Archivo | Tipo | Qué prueba | Tiempo |
|---|---|---|---|
| `PedidoStateMachineTest.java` | Unit (5 tests) | La máquina de estados de `EstadoPedido`: transiciones legales, transiciones ilegales, estados terminales, reglas de cancelación, timestamps | ~0.1s para los 5 |
| `AbstractIntegrationTest.java` | Clase base | No tiene tests propios; provee infraestructura para tests de integración futuros (Postgres con TestContainers) | N/A |
| `QueuelessApplicationTests.java` | Smoke (1 test) | Que Spring arranca con todo bien cableado | ~10s con Docker |

Los 5 tests de `PedidoStateMachineTest` son la **referencia de estilo** para todos los unit tests futuros del proyecto. Cualquier nueva lógica de dominio se testea siguiendo ese mismo patrón.

## Tests que llegan en Fase 6

La Fase 6 (tiempos de espera, notificaciones push, jobs de scheduling, S3 y
hardening de producción) suma su propia tanda de pruebas, siguiendo la misma
convención de nombres (`*Test.java` para unit, `*IT.java` para integración):

- **Modelo de tiempos de espera** (unit): pruebas del modelo de regresión por bins
  con datos sintéticos, que verifican que cada celda promedia bien los tiempos
  reales y que una celda sin datos cae al tiempo declarado del local (ver
  ADR-0015).
- **`CancelarPagosPendientesJobTest`** (unit): que el job cancela los pedidos
  atascados en `PENDIENTE_PAGO` más allá del tiempo configurado y deja en paz a los
  que siguen dentro del plazo. Sigue el patrón del `BusquedaTimeoutJobTest` que ya
  existe.
- **`JwtSecretValidator`** (unit): los cuatro casos del validador de secret —perfil
  `prod` con el secret por defecto, con un secret demasiado corto y con un secret
  válido, más perfil `dev` con el secret por defecto (ver ADR-0018).
- **`PickupFlowIT`** (integración): el camino feliz completo de un pedido PICKUP de
  punta a punta, como complemento del `DeliveryFlowIT` que ya cubre el flujo de
  delivery.

Con estas, la fase cierra con al menos seis pruebas nuevas.

## Por qué `@Disabled` en `QueuelessApplicationTests`

`QueuelessApplicationTests` extiende `AbstractIntegrationTest`, que usa TestContainers para levantar un Postgres efímero. TestContainers usa por debajo la librería `docker-java`, que en Windows con Docker Desktop reciente (backend WSL2) tiene un bug conocido: no logra completar el handshake HTTP-sobre-pipe contra el daemon. El CLI de Docker funciona perfecto, pero la librería Java no.

Probamos varias soluciones (cambiar el endpoint, usar TCP en lugar de named pipe, configurar variables de entorno). Ninguna funcionó de forma estable en local. Después de varias horas de troubleshooting, tomamos la decisión pragmática de marcar el test con `@Disabled` en local **y dejar que corra en GitHub Actions**, donde el runner es Ubuntu y Docker funciona con socket Unix nativo, sin el bug.

El equivalente práctico en local es ejecutar `mvn spring-boot:run` y verificar que el backend arranca con Swagger UI accesible. Si Spring arranca completo, el contexto carga; si no, falla con un mensaje claro. La CI corre el smoke test de verdad y bloquea merges si rompe.

Esta decisión es temporal y revisable. Si en el futuro el bug de `docker-java` se arregla o encontramos un workaround estable, removemos el `@Disabled` y corremos el smoke test también en local.

## Convención de nombres y por qué importa

La convención `*Test.java` vs `*IT.java` no es decorativa. Maven Surefire y Failsafe son dos plugins distintos con dos roles distintos:

- **Surefire** corre en la fase `test`, que se ejecuta con `mvn test`. Está pensado para tests rápidos que NO tienen dependencias externas. Si Surefire tarda 30 segundos, el feedback loop de desarrollo se rompe.

- **Failsafe** corre en la fase `verify`, que se ejecuta con `mvn verify`. Está pensado para tests más lentos que requieren infraestructura (DB, servidor, brokers). Si Failsafe tarda 2 minutos, está bien — es el último paso antes de mergear.

Por convención, Surefire toma `*Test.java` y Failsafe toma `*IT.java`. Eso nos permite:

- Durante desarrollo, correr solo unit tests: `mvn test` (rápido).
- Antes de pushear, correr todo: `mvn verify` (lento pero completo).
- En CI, siempre `mvn verify` (todo).

## Qué se testea y qué NO

**Sí se testea con unit tests:**

- Máquina de estados (`EstadoPedido`).
- Validaciones de DTOs cuando son no triviales.
- Cálculos puros (totales de pedido, conversiones, etc.).
- Lógica de servicio que pueda aislarse con mocks.

**Sí se testea con integration tests (a implementar en Semanas 2-3):**

- Flujos completos que tocan la DB: crear pedido + verificar persistencia.
- Auth flow: register + login + endpoint protegido.
- Repositorios JPA con queries derivadas no triviales.
- Eventos publicados que disparan listeners en cadena.

**NO se testea (decisión consciente):**

- Controllers REST que solo delegan al service, **a nivel de lógica de negocio**: si el service ya tiene test, repetir esa lógica en el controller es redundante. Lo que sí cubrimos (desde el Issue #9) es el **contrato HTTP** del controller —código de estado y autorización por rol— con MockMvc, que es justo la excepción que ya mencionaba este punto (extracción del `SecurityContext`). Ver «Actualización — Issue #9».
- Getters y setters generados por Lombok.
- Configuraciones de Spring (`@Configuration` beans), porque el smoke test ya valida que cargan.
- Llamadas a librerías externas (Firebase, MercadoPago) que están detrás de adapters. Lo que sí testeamos es nuestro código contra una implementación mock del adapter.

## Alternativas consideradas

### Alternativa 1 — Tests E2E con un servidor HTTP arriba

Levantar el backend completo en cada test y hacer HTTP requests reales contra `localhost`. Descartado por costo: cada test tardaría 5-10 segundos solo en arrancar el servidor. Para un proyecto de 3 semanas, ese costo en feedback loop no se justifica. Cuando lleguemos a CI/CD con deploy automático en Semana 3, evaluaremos si vale la pena agregar un puñado de E2E críticos.

### Alternativa 2 — Tests con H2 en memoria en lugar de TestContainers

H2 es una base de datos Java en memoria, mucho más rápida que levantar un Postgres real. Descartado porque H2 NO es 100% compatible con Postgres. Cosas como triggers PL/pgSQL, índices parciales, `JSONB`, `INTERVAL` se comportan distinto o no funcionan. Si testeamos contra H2, tenemos tests verdes en local y rojos en producción. TestContainers nos da la misma base que producción.

### Alternativa 3 — Test slices de Spring (`@DataJpaTest`, `@WebMvcTest`)

Spring Boot ofrece anotaciones que arrancan solo un "slice" del contexto: `@DataJpaTest` arranca solo JPA, `@WebMvcTest` arranca solo MVC. Son útiles para tests aislados de capas específicas. Decidimos NO usarlos por default, sino preferir tests unitarios puros (sin Spring) cuando se puede, y tests de integración completos cuando hace falta DB real. Los slices están a mitad de camino y agregan complejidad sin un beneficio claro para nuestro caso. Los podemos adoptar puntualmente si en algún test específico vemos que ayudan. **Ver «Actualización — Issue #9».**

## Actualización — Issue #9 (adopción de slices de repositorio y tests de controlador)

La Alternativa 3 dejó la puerta abierta a adoptar slices "puntualmente si en algún test
específico vemos que ayudan". En el Issue #9 la cruzamos, con dos adopciones concretas:

- **Tests de repositorio con `@DataJpaTest`.** Para los repositorios con queries
  personalizadas (finders derivados y `@Query`), un slice de JPA contra el Postgres real de
  TestContainers es la herramienta justa: arranca solo la capa de persistencia, deja que
  Flyway construya el schema (`replace = NONE`) y verifica las consultas sin levantar el
  contexto completo. Viven en `*RepositoryIT.java`, heredan de `AbstractRepositoryTest` y
  siguen siendo `*IT` (corren en `verify`, no en `test`) porque dependen de Docker.

- **Tests de contrato de controlador con MockMvc.** Para validar el contrato HTTP —códigos
  de estado, cuerpos y autorización por rol— usamos MockMvc sobre `@SpringBootTest`
  (`@AutoConfigureMockMvc`), no `@WebMvcTest`. Elegimos el contexto completo a propósito:
  así la cadena de seguridad real interviene y un `@WithMockUser` con el rol equivocado da
  un 403 de verdad, cosa que un slice de MVC con la seguridad mockeada no probaría con
  fidelidad. Viven en `*MockMvcIT.java`.

Lo que seguimos sin adoptar: `@WebMvcTest` (preferimos el contexto completo por la seguridad)
y H2 (sigue vigente la Alternativa 2: TestContainers da el mismo Postgres que producción).
La pirámide no cambia de forma; ganamos dos capas intermedias bien delimitadas.

## Consecuencias

### Positivas

- **Feedback loop rápido en desarrollo.** Los unit tests corren en milisegundos. `mvn test` es prácticamente instantáneo.
- **Tests confiables.** TestContainers garantiza que los tests de integración corren contra el mismo Postgres que producción. Cero falsos positivos por incompatibilidad.
- **Convención clara de naming.** Cualquier desarrollador nuevo entiende inmediatamente que `*Test.java` es rápido y `*IT.java` es lento.
- **CI en GitHub Actions corre todo.** El smoke test `@Disabled` localmente sí corre en CI Linux.
- **Cobertura proporcionada al riesgo.** Lo crítico (máquina de estados, eventos, persistencia) está bien cubierto. Lo trivial (getters, DTOs) no se testea.

### Negativas

- **TestContainers requiere Docker corriendo.** En local Windows, el bug de `docker-java` complica las cosas. Mitigado con `@Disabled` selectivo.
- **Tests de integración son lentos.** Un suite de 20 tests de integración tarda más de un minuto. Es esperable.
- **`mvn verify` en cada PR consume minutos de CI.** Aceptable, dado el plan free de GitHub Actions.

### Riesgos

- **Riesgo de cobertura insuficiente al final del proyecto.** Si no escribimos tests de integración durante Semana 2-3, vamos a llegar a la entrega P1 con solo los 5 unit tests originales. Mitigación: definir tests de integración mínimos por feature en cada PR de implementación.
- **Riesgo de tests flaky por timing en eventos asíncronos.** Algunos listeners (`@Async`) corren en otro thread. Si un test de integración asume que el evento ya se procesó cuando en realidad sigue en cola, falla intermitentemente. Mitigación: usar `Awaitility` o cambiar la configuración del executor para sincronizar en tests cuando haga falta.

## Anexo — Glosario de términos técnicos

**Unit test (test unitario).** Test que prueba una unidad pequeña de código (típicamente una clase o método) **sin depender de infraestructura externa**: nada de base de datos, ni Spring, ni red, ni filesystem. Las dependencias se reemplazan por mocks. Resultado: el test corre en milisegundos y es totalmente determinista.

Ejemplo concreto del proyecto: `PedidoStateMachineTest` prueba el método `transicionarA` de `EstadoPedido` creando un `Pedido` en memoria, llamando al método, y verificando el resultado. No persiste nada, no levanta Spring.

**Integration test (test de integración).** Test que prueba cómo varias piezas funcionan juntas, **incluyendo infraestructura real o muy parecida a la real**: base de datos, configuración de Spring, transacciones, eventos. Resultado: el test tarda más (segundos) pero detecta problemas que los unit tests no pueden ver, como queries mal escritas, transacciones que no commitean, o eventos que no llegan a sus listeners.

Ejemplo concreto del proyecto: un futuro `PedidoServiceIT` arrancaría Spring con TestContainers, crearía un Pedido vía el service, y verificaría que está realmente en la base de Postgres.

**End-to-end test (E2E).** Test que arranca el sistema completo (servidor, base, todo) y le pega como lo haría un cliente real, vía HTTP. Es el más realista pero el más lento. No los usamos en QueueLess al menos por ahora.

**TestContainers.** Librería Java que levanta contenedores Docker durante los tests. Sirve para tener una base de datos real (Postgres, MySQL, lo que sea), un broker (Kafka, RabbitMQ), o cualquier servicio externo, sin instalar nada permanente en la máquina de quien corre los tests. Cuando el test termina, el contenedor se borra.

En QueueLess usamos TestContainers solo para Postgres. La clase base `AbstractIntegrationTest` levanta un `postgres:16-alpine` antes de la suite de tests, le pasa la URL/usuario/password a Spring vía `@DynamicPropertySource`, y al terminar lo destruye.

**Patrón AAA (Arrange / Act / Assert).** Estructura estándar para escribir tests legibles:

- **Arrange**: preparás el escenario (creás objetos, mockeás dependencias).
- **Act**: ejecutamos la acción que queremos testear, idealmente en una sola línea.
- **Assert**: verificás que el resultado es el esperado.

Ejemplo concreto del proyecto, simplificado:

```java
// Arrange
Pedido pedido = Pedido.builder().estado(PENDIENTE_PAGO).build();

// Act
pedido.transicionarA(PAGADO_ESPERANDO_COMERCIO);

// Assert
assertThat(pedido.getEstado()).isEqualTo(PAGADO_ESPERANDO_COMERCIO);
assertThat(pedido.getPagadoAt()).isNotNull();
```

**AssertJ.** Librería de aserciones para Java con sintaxis fluida y legible. En lugar del estilo viejo `assertEquals(expected, actual)`, escribimos `assertThat(actual).isEqualTo(expected)`. Es más legible y los mensajes de error son más claros cuando algo falla. Viene incluida con Spring Boot, no agrega dependencias.

**Smoke test.** Test mínimo que solo verifica que el sistema "no echa humo": arranca, se cablea sin errores, y queda listo para recibir requests. No prueba lógica de negocio, solo verifica que la base está sana. Si un smoke test falla, significa que hay un problema serio de configuración (un `@Autowired` que no encuentra su bean, un YAML mal escrito, etc.).

**Surefire y Failsafe.** Son los dos plugins de Maven que ejecutan tests. Surefire es el viejo (corre en la fase `test`), pensado para unit tests rápidos. Failsafe (corre en la fase `verify`) es para tests de integración lentos. Por convención, Surefire toma `*Test.java` y Failsafe toma `*IT.java`.

**`@DynamicPropertySource`.** Anotación de Spring Test que permite inyectar propiedades en el contexto **al momento de arrancar el test**, no en archivos YAML estáticos. Es lo que usamos en `AbstractIntegrationTest` para pasarle a Spring la URL del Postgres que TestContainers acaba de crear (con su puerto aleatorio).

**`@Disabled`.** Anotación de JUnit que marca un test (o una clase entera de tests) como "no ejecutar". El test aparece en los reportes como "skipped" en lugar de "passed" o "failed". Útil para deshabilitar temporalmente tests que rompen por problemas de entorno conocidos, siempre dejando claro por qué.

## Referencias

- `backend/src/test/java/pe/edu/utec/queueless/pedido/PedidoStateMachineTest.java` — los 5 unit tests de máquina de estados.
- `backend/src/test/java/pe/edu/utec/queueless/integration/AbstractIntegrationTest.java` — clase base para tests de integración.
- `backend/src/test/java/pe/edu/utec/queueless/QueuelessApplicationTests.java` — smoke test con `@Disabled`.
- `backend/pom.xml` — configuración de `maven-surefire-plugin` y `maven-failsafe-plugin`.
- `backend/README.md` — sección "Tests con TestContainers" con setup de Docker Desktop.
- ADR-0009 — eventos de dominio (testing de listeners async tendrá su sección ahí).
- ADR-0015 — Modelo de tiempos de espera (tests del modelo de regresión por bins con datos sintéticos).
- ADR-0018 — Hardening del perfil de producción (tests del validador de secret de JWT).
