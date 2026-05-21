# ADR-0004 — Swagger UI / OpenAPI como contrato de la API

## Contexto

QueueLess es un sistema con tres clientes que consumen el backend: la app web del comercio (`web/`), la app móvil para clientes y repartidores (`mobile/`), y el equipo mismo durante desarrollo. Los tres necesitan saber qué endpoints existen, qué reciben, qué devuelven y cómo autenticarse.

Hay varias formas de mantener esa información sincronizada:

- **Documentar a mano en Markdown.** Riesgo: el documento se desactualiza apenas cambia el código.
- **Mantener una colección de Postman.** Útil para testing manual, pero no se acopla al código fuente.
- **Generar la documentación automáticamente desde el código.** El código es la fuente de verdad y la documentación se regenera con cada build.

Este ADR fija que usamos la tercera opción.

## Decisión

Usamos **springdoc-openapi 2.6.0** para generar automáticamente:

- Un documento OpenAPI 3.0 (también conocido como Swagger) en formato JSON, accesible en `/v3/api-docs`.
- Una interfaz interactiva web (Swagger UI) en `/swagger-ui.html`, donde se puede ver y probar todos los endpoints.

springdoc escanea las clases `@RestController`, lee las anotaciones JPA y de validación (`@Valid`, `@NotBlank`, etc.) y construye el contrato OpenAPI sin que tengamos que escribir nada extra. Si queremos añadir descripciones o ejemplos, usamos anotaciones específicas como `@Tag`, `@Operation`, `@Schema`.

La configuración vive en `OpenApiConfig`:

```java
@Configuration
public class OpenApiConfig {
    @Bean
    public OpenAPI queuelessOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("QueueLess API")
                .version("0.0.1-SNAPSHOT")
                .description("..."))
            .components(new Components()
                .addSecuritySchemes("bearer-jwt",
                    new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")));
    }
}
```

Eso registra el esquema de autenticación Bearer JWT, así Swagger UI tiene un botón "Authorize" donde se pega el token y todos los requests subsiguientes lo incluyen automáticamente.

## Qué obtenemos

Una vez levantado el backend, en `http://localhost:8090/swagger-ui.html` se ve una lista navegable de todos los endpoints, agrupados por `@Tag`:

- **Auth** (`/api/auth/*`)
- **Pedidos (cliente)** (`/api/cliente/pedidos/*`)
- **Pedidos (comercio)** (`/api/comercio/pedidos/*`)
- **Puntos de venta**
- **Pagos**
- **Reseñas**
- **Delivery**
- **QueuePoints**

Cada endpoint muestra:

- Método HTTP (GET, POST, PATCH, etc.) y ruta.
- Descripción si la pusimos.
- Parámetros de path/query.
- Body esperado (con su esquema JSON).
- Posibles códigos de respuesta y los esquemas de cada uno.
- Un botón "Try it out" que permite ejecutar el request real desde el navegador.

## Por qué springdoc y no SpringFox

SpringFox fue la librería estándar para generar OpenAPI en Spring Boot durante años. Hoy está prácticamente abandonada: la última versión estable es de 2020, no soporta Spring Boot 3.x, y tiene incompatibilidades conocidas con Jakarta EE.

springdoc-openapi es el reemplazo recomendado por la comunidad y por el propio equipo de Spring. Soporta Spring Boot 3, Jakarta EE, y se mantiene activamente. La sintaxis de las anotaciones es la del propio OpenAPI 3 (`io.swagger.v3.oas.annotations.*`), que es estándar y portable.

## Cómo se integra con la autenticación JWT

El esquema de seguridad declarado en `OpenApiConfig` (`bearer-jwt`) le dice a Swagger UI que los endpoints protegidos requieren un header `Authorization: Bearer <token>`. En la UI hay un botón "Authorize" en la esquina superior derecha donde se pega el token. Una vez autorizado, todos los requests subsiguientes incluyen el header automáticamente.

El flujo típico de prueba en Swagger UI es:

1. Llamar `POST /api/auth/login` con email y password de un usuario seed.
2. Copiar el `token` de la respuesta.
3. Hacer clic en "Authorize" y pegar el token.
4. Llamar cualquier endpoint protegido (`/api/cliente/pedidos`, etc.) que ahora envía el JWT automáticamente.

## Configuración por ambiente

- **Dev**: Swagger UI accesible en `http://localhost:8090/swagger-ui.html`. Activo por default.
- **Test**: igual que dev pero contra el Postgres efímero. No se usa interactivamente, pero springdoc no estorba.
- **Producción**: el plan es **desactivar Swagger UI** en `application-prod.yml` por dos razones:
  - Reducir superficie de ataque: cuanto menos expongas en prod, mejor.
  - El contrato OpenAPI se genera una vez al hacer release y se publica fuera del backend (idealmente en un site estático o en el repo de docs).

La configuración para desactivar en prod sería:

```yaml
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

(Esto está pendiente de aplicar en `application-prod.yml`, lo dejamos como TODO.)

## Alternativas consideradas

### Alternativa 1 — Documentación manual en Markdown

Mantener un archivo `API.md` con la lista de endpoints, parámetros y ejemplos. Descartado porque el documento se desactualiza apenas alguien cambia un endpoint y olvida actualizar el MD. La documentación pierde confiabilidad rápido.

### Alternativa 2 — Colección de Postman compartida

Compartir un workspace de Postman entre los miembros del equipo. Útil para testing manual, pero:

- No es contrato. Es una herramienta de exploración.
- No se versiona con el código (vive en Postman Cloud o en archivos JSON exportados).
- El frontend no puede generar tipos TypeScript desde una colección de Postman fácilmente.

Lo podemos usar como complemento (collection para tests manuales recurrentes), pero la fuente de verdad es OpenAPI.

### Alternativa 3 — Escribir el OpenAPI YAML a mano y generar el código

Enfoque "API-first": el contrato se define en un YAML, y herramientas como openapi-generator crean los controllers/DTOs a partir del YAML.

Descartado porque:

- Curva de aprendizaje extra.
- Para un equipo de 2 personas que ya domina Spring, "code-first" con springdoc es más rápido.
- El curso CS2031 enseña Swagger generado del código.

## Consecuencias

### Positivas

- **Documentación siempre sincronizada.** Si agregamos un endpoint, aparece automáticamente.
- **Exploración interactiva.** Probar endpoints desde el navegador sin Postman ni curl.
- **Generación de clientes.** Si en el futuro queremos generar un cliente TypeScript automático para el frontend, openapi-generator lo hace desde el `/v3/api-docs`.
- **Contrato versionable.** El JSON OpenAPI se puede commitear si queremos snapshots, aunque por default se regenera en cada build.
- **Aprobación implícita por el curso.** El profesor reconoce Swagger inmediatamente.

### Negativas

- **Superficie expuesta.** En dev y test todos los endpoints son visibles para cualquiera con acceso al backend. Mitigación: desactivar en producción.
- **Anotaciones extra para documentación rica.** Si queremos ejemplos por endpoint, descripciones detalladas, etc., hay que agregar anotaciones que ensucian un poco el código. Mitigación: usar anotaciones solo donde aportan valor real, no en todos lados.

### Riesgos

- **Riesgo de exponer secrets en ejemplos.** Si un developer pone un ejemplo de request con un token JWT real en una anotación `@Schema`, ese token termina en el documento OpenAPI público. Mitigación: revisión de anotaciones en code reviews; nunca ejemplos con datos reales.
- **Riesgo de "schema drift" entre dev y prod.** Si la versión de springdoc en dev y prod difiere, los contratos generados pueden tener diferencias sutiles. Mitigación: versión fija en `pom.xml`.

## Anexo — Glosario de términos técnicos

**OpenAPI.** Estándar abierto para describir APIs REST en formato legible por máquinas y humanos. La versión 3 es la actual. Define en formato JSON o YAML qué endpoints existen, qué métodos HTTP soportan, qué reciben, qué devuelven, qué errores tiran, qué autenticación requieren.

Ejemplo concreto: el documento que springdoc genera para QueueLess incluye una entrada por cada endpoint, con su path, su método, su body schema, y los códigos de respuesta posibles. Es texto plano JSON, que se puede leer, versionar y publicar.

**Swagger.** Originalmente el nombre del estándar mismo. Hoy es el nombre comercial de un conjunto de herramientas alrededor de OpenAPI: Swagger UI (la interfaz web), Swagger Editor, Swagger Codegen. Cuando alguien dice "Swagger" suele referirse a Swagger UI específicamente.

**Swagger UI.** Interfaz web que toma un documento OpenAPI y lo muestra como una página navegable e interactiva. Permite ver todos los endpoints, sus esquemas, y ejecutar requests de prueba directamente desde el navegador.

Ejemplo concreto del proyecto: cuando levantás el backend con perfil dev y vas a `http://localhost:8090/swagger-ui.html`, lo que ves es Swagger UI renderizando el documento OpenAPI que springdoc generó automáticamente.

**springdoc-openapi.** Librería Java que genera documentos OpenAPI 3 automáticamente desde un proyecto Spring Boot. Escanea controllers, anotaciones de validación, esquemas JPA, y construye el documento sin que el developer escriba YAML a mano.

**SpringFox.** Librería antigua que hacía lo mismo que springdoc en versiones viejas de Spring. Hoy está abandonada. Si alguien encuentra tutoriales viejos que mencionan SpringFox, conviene ignorarlos: la herramienta moderna es springdoc.

**Schema (en OpenAPI).** Definición de la estructura de un objeto JSON, similar a un type de TypeScript o una clase Java. Ejemplo: el schema de `LoginRequest` declara que tiene dos campos string (`email` y `password`), y que `email` debe ser un email válido y `password` no puede estar vacío.

**Tag (en OpenAPI).** Agrupación lógica de endpoints. Sirve para que Swagger UI los muestre organizados por funcionalidad en lugar de en una lista plana. En QueueLess usamos `@Tag(name = "Pedidos (cliente)", description = "...")` en los controllers para agrupar.

**Security scheme.** Definición de cómo se autentica una API. OpenAPI soporta varios tipos: `apiKey`, `http` (Basic, Bearer), `oauth2`, `openIdConnect`. Nosotros declaramos un esquema `bearer-jwt` que es `http` + `bearer` + formato `JWT`.

**Code-first vs API-first.** Dos enfoques para mantener el contrato de una API:

- **Code-first**: se escribe el código primero, las herramientas generan el contrato. Más rápido para empezar. Riesgo: el contrato puede salir feo o inconsistente.
- **API-first**: se escribe el contrato primero, se genera código stub a partir de él. Más disciplinado, mejor para equipos grandes con frontend/backend separados. Más lento al principio.

Adoptamos code-first con springdoc.

**Contrato (en el sentido de APIs).** El acuerdo entre backend y frontend sobre cómo se comunican: qué endpoints existen, qué reciben, qué devuelven, qué errores tiran. Es contrato porque ambos lados se comprometen a respetarlo. Si el backend cambia un endpoint sin avisar, rompe el contrato y el frontend deja de funcionar.

## Referencias

- `backend/src/main/java/pe/edu/utec/queueless/config/OpenApiConfig.java` — configuración.
- `backend/pom.xml` — dependencia `springdoc-openapi-starter-webmvc-ui:2.6.0`.
- `backend/src/main/resources/application.yml` — sección `springdoc:` con paths y opciones de UI.
- Documentación oficial de springdoc: https://springdoc.org/
- Especificación OpenAPI 3.0: https://spec.openapis.org/oas/v3.0.0
