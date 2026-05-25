# ADR-0011 — Zona horaria fija (`America/Lima`) en la lógica de negocio

## Contexto

QueueLess se opera dentro del campus de UTEC, en Lima. Los locales tienen horarios de atención que el comercio define en hora local ("abrimos a las 7:00 de la mañana, cerramos a las 8:00 de la noche"). Los pedidos se identifican con un código que incluye la fecha (`QL-251024-A3FZ9` significa "pedido del 24 de octubre de 2025"). Y los pedidos se procesan con varios timestamps de auditoría: cuándo se creó, cuándo se pagó, cuándo se entregó.

Hay dos verdades técnicas que generan tensión:

1. **El servidor de producción corre en UTC.** El stack del proyecto es AWS, y la convención estándar es que los servidores corran en UTC para evitar problemas de horario de verano y de coordinación entre regiones. Lima está en UTC-5 todo el año (no aplica DST), pero el servidor sigue en UTC.

2. **Los desarrolladores trabajan en local con la zona horaria de su sistema operativo.** Cualquiera del equipo está físicamente en Lima, pero su laptop puede estar configurada en otra zona si viaja o si la configuró raro.

Si no decidimos explícitamente cómo manejar el tiempo, pasan cosas raras:

- El código `QL-YYMMDD-XXXXX` de un pedido hecho a las 23:30 de Lima quedaría estampado con la fecha del día siguiente (ya son las 04:30 UTC del día siguiente) cuando el backend está en prod.
- La validación de "el local atiende de 7:00 a 20:00" haría la comparación contra la hora UTC, rechazando pedidos válidos hechos a las 6:30 de la tarde Lima (que son las 23:30 UTC, fuera del horario configurado).
- Los timestamps en la base se guardan sin metadata de zona, así que dos servidores con zonas distintas leen valores distintos del mismo dato.

Este ADR fija la decisión de cómo manejar tiempo en QueueLess.

## Decisión

### Tres tipos de tiempo, tres reglas distintas

QueueLess distingue tres situaciones donde aparece tiempo, y cada una se maneja diferente:

**1. Instantes absolutos de auditoría** (cuándo pasó algo). Ejemplo: "el pedido se creó en `2026-05-24T22:30:00Z`". Estos NO dependen de zona horaria; son un punto exacto en la línea de tiempo universal.

- **Java**: tipo `Instant`.
- **Base de datos**: columna `TIMESTAMP` (sin zona).
- **Cómo se construye en código**: `Instant.now()`. Sin zona, no aplica.

**2. Decisiones de hora-de-pared local** (qué hora es ahora en Lima). Ejemplo: "¿el local está abierto a esta hora?". Acá sí importa la zona horaria, porque "las 7 de la noche" significa cosas distintas en zonas distintas.

- **Java**: tipo `LocalTime` o `LocalDate`.
- **Cómo se construye en código**: `LocalTime.now(ZONA_LIMA)` o `LocalDate.now(ZONA_LIMA)`. Siempre con la zona explícita, nunca sin zona.

**3. Configuración de horarios del negocio** (cuándo abre el local). Ejemplo: "el café abre a las 7:00". Esto es una hora-de-pared abstracta, sin fecha.

- **Java**: tipo `LocalTime`.
- **Base de datos**: columna `TIME`.
- **Interpretación**: siempre hora de Lima, no hora UTC.

### La constante `ZONA_LIMA`

Hoy vive como constante privada en `PedidoService`:

```java
private static final ZoneId ZONA_LIMA = ZoneId.of("America/Lima");
```

Se usa en dos lugares de esa clase:

- `LocalTime.now(ZONA_LIMA)` para validar que el cliente intenta crear un pedido dentro del horario del local.
- `LocalDate.now(ZONA_LIMA)` para generar el `YYMMDD` del código del pedido.

**Mientras un solo módulo la use, vive ahí. Cuando un segundo módulo (waittime, delivery, notifications) necesite la misma constante, se promueve a un lugar compartido.** Esto sigue la regla del 3 del proyecto: no abstraer hasta que haga falta.

### La configuración global de Hibernate

`application.yml` tiene:

```yaml
spring:
  jpa:
    properties:
      hibernate:
        jdbc:
          time_zone: America/Lima
```

Esto le dice a Hibernate cómo convertir entre `Instant` (que es UTC absoluto) y `TIMESTAMP` (que no tiene zona). Sin esta configuración, Hibernate usaría la zona del sistema del servidor, lo que daría comportamientos distintos en dev (Lima) y prod (UTC).

Con esta línea, todos los `Instant` que se guardan se interpretan como "este instante visto desde Lima", y al leerlos se reconstruye el mismo `Instant` original. La consistencia se mantiene independientemente de dónde corra el backend.

### Tests deterministas sin acoplarse al reloj

Los tests no deben depender de la hora real del sistema (eso los vuelve flaky, especialmente cerca de medianoche). La validación de horario en `PedidoService.crear` se extrajo a un helper package-private:

```java
void validarHorarioDeAtencion(PuntoDeVenta local, LocalTime ahora) {
    // ...
}
```

El método de creación llama `validarHorarioDeAtencion(local, LocalTime.now(ZONA_LIMA))`. Los tests llaman directamente al helper con horas fijas (`LocalTime.of(14, 0)`), sin pasar por `now()` ni necesitar mockear nada. Solución limpia, sin introducir `Clock` inyectado (patrón que el proyecto no usa todavía).

## Por qué no usamos `TIMESTAMP WITH TIME ZONE` en la base

Postgres ofrece dos tipos: `TIMESTAMP` (sin zona) y `TIMESTAMP WITH TIME ZONE` (con zona). El segundo guarda el instante junto con la zona en la que fue creado.

Nos quedamos con `TIMESTAMP` por dos razones:

- **Compatibilidad con `Instant` de Java**: `Instant` es UTC absoluto. Guardarlo en `TIMESTAMP` con `hibernate.jdbc.time_zone: America/Lima` da una conversión predecible: el instante se serializa como "qué hora era en Lima en ese instante". Al leer, se hace el camino inverso. Funciona perfecto.

- **El proyecto no tiene multi-zona**: si en el futuro QueueLess se expandiera a otras ciudades con otras zonas (Cusco, Arequipa siguen siendo Lima TZ, pero imaginá Quito o Bogotá), tendría sentido cambiar a `TIMESTAMP WITH TIME ZONE`. Hoy es una sola zona, no agregamos complejidad innecesaria.

## Por qué hardcodeamos `America/Lima` y no usamos una variable de entorno

Una alternativa sería leer la zona desde una variable de entorno (`TZ=America/Lima`) o desde `application.yml`, para que sea configurable por ambiente.

Lo descartamos porque:

- **El negocio es Lima, no es un parámetro técnico**: cambiar la zona requeriría cambiar también los horarios de los locales, los códigos de los pedidos ya generados, las expectativas de los clientes. No es una decisión que se tome en runtime.
- **Riesgo de bugs sutiles**: si alguien pone mal la variable en producción, los pedidos empezarían a tener fechas raras sin que nadie se dé cuenta hasta que un cliente reclame.
- **YAGNI**: no necesitamos esa flexibilidad hoy. Si algún día la necesitamos, agregamos la variable. Mientras tanto, hardcoded es más seguro y más simple.

## Alternativas consideradas

### Alternativa 1 — Usar `Instant` para todo, incluso horarios de atención

Modelar `horarioApertura` y `horarioCierre` como `Instant`. La pregunta "¿está abierto el local ahora?" se respondería comparando `Instant.now()` contra esos instantes.

Lo descartamos porque "el café abre a las 7:00" es una declaración recurrente que aplica todos los días, no un instante absoluto. Modelarlo como `Instant` te obligaría a actualizar el horario cada día a la medianoche, o a hacer cálculos de "tomar la hora del Instant, comparar con la hora actual", que es exactamente lo que `LocalTime` ya hace nativamente. `LocalTime` es el tipo natural para esto.

### Alternativa 2 — Inyectar `Clock` en todos los services

Spring soporta inyectar un bean `Clock` que en producción es `Clock.systemDefaultZone()` y en tests es `Clock.fixed(...)`. Es el patrón idiomático de Java 8+ para tests deterministas.

Lo descartamos porque introduce un patrón nuevo solo para un caso (validación de horario en `PedidoService`). La solución del helper package-private con horas fijas resuelve el mismo problema sin agregar abstracción. Si en el futuro hay 3+ lugares que necesitan el reloj inyectado para testeo, refactorizamos a `Clock` aplicando la regla del 3.

### Alternativa 3 — Configurar la JVM con `TZ=America/Lima`

Pasar la variable `TZ` al proceso Java para que `LocalTime.now()` sin argumentos devuelva hora de Lima.

Lo descartamos porque:

- En dev cada developer tendría que setear la variable. Si se olvida, el comportamiento cambia silenciosamente.
- Mezcla configuración del SO con configuración del negocio. Difícil de auditar.
- Dependerías de un detalle del entorno en lugar de explicitarlo en el código.

Es preferible ser explícito: `LocalTime.now(ZONA_LIMA)` en cada llamada, así el código documenta su propia decisión.

### Alternativa 4 — Centralizar la zona en una utility class desde el día uno

Crear `shared/util/Zonas.java` con la constante pública, listo para que cualquier módulo la use.

Lo descartamos hoy porque solo un módulo (`pedido`) la necesita. Cuando un segundo módulo aparezca, lo extraemos. La constante privada actual no es deuda técnica: es la implementación más simple que funciona para el caso real.

## Consecuencias

### Positivas

- **Reglas claras**: cualquier dev del equipo sabe qué tipo usar para cada situación (`Instant` para auditoría, `LocalTime`/`LocalDate` con zona para hora local). El ADR las documenta.
- **Comportamiento idéntico en dev y prod**: gracias a `hibernate.jdbc.time_zone: America/Lima`, los timestamps se interpretan igual independientemente de la zona del servidor.
- **Tests deterministas**: el patrón de helper con horas fijas evita tests flaky cerca de medianoche.
- **Sin overhead técnico**: no introducimos `Clock` ni utilities centralizadas hasta que sean necesarias.

### Negativas

- **Hay que recordar usar `ZONA_LIMA`**: cada vez que un desarrollador escribe `LocalTime.now()` o `LocalDate.now()` sin zona, técnicamente funciona en dev (Lima) pero rompería en prod (UTC). Mitigación: este ADR + revisión de código + lint si se quiere ser estricto.
- **Hay duplicación potencial**: cuando un segundo módulo necesite la zona, va a tener que decidir si replica la constante o la promueve a compartido. Mitigación: cuando pase, se actualiza este ADR.
- **Limitación a una sola zona**: si en el futuro QueueLess opera en varias zonas distintas, hay que refactorizar varias cosas (la constante, la config de Hibernate, los `TIMESTAMP` de la DB). Mitigación: no es un caso real hoy, lo manejamos cuando aparezca.

### Riesgos

- **Cambiar `hibernate.jdbc.time_zone` rompe la interpretación de los datos viejos**. Si alguien edita `application.yml` y cambia la zona a otra, los timestamps almacenados se reinterpretan: una creación que fue "11:30 hora Lima" pasaría a leerse como "11:30 en la otra zona", cambiando el instante real. Mitigación: este ADR documenta que la zona es parte del contrato con la DB, no una preferencia de runtime.
- **Riesgo de inconsistencia futura entre módulos**. Si Fase 4 (pagos) o Fase 5 (delivery) implementan validaciones de hora local sin usar `ZONA_LIMA`, va a haber bugs sutiles. Mitigación: este ADR + cuando se haga el refactor a `shared/util/`, se vuelve más fácil de descubrir.
- **Tests que usen `LocalTime.now()` real**. Cualquier test que dependa de la hora real del sistema es candidato a flakiness. Mitigación: el patrón del helper package-private establecido en `PedidoService` es replicable.

## Anexo — Glosario de términos técnicos

**Zona horaria.** Una región del mundo donde todos comparten la misma hora oficial. Lima está en `America/Lima` (UTC-5 todo el año). Buenos Aires está en `America/Argentina/Buenos_Aires` (UTC-3). El offset puede variar por horario de verano en algunas zonas; Lima no aplica horario de verano.

**UTC (Coordinated Universal Time).** El "tiempo universal" usado como referencia mundial. Todas las demás zonas se definen como un offset respecto a UTC. Lima es UTC-5, lo que significa que cuando en UTC son las 17:00, en Lima son las 12:00.

**`Instant`.** Tipo de Java 8+ que representa un punto exacto en la línea de tiempo universal. No tiene zona porque representa el instante absoluto. Internamente es un número de nanosegundos desde el 1 de enero de 1970 UTC. Ejemplo: `2026-05-24T22:30:00Z` (la "Z" final significa UTC).

**`LocalTime`.** Tipo de Java 8+ que representa una hora del día sin fecha y sin zona. Ejemplo: `08:30:00`. No sabés si son las 8:30 de la mañana en Lima o en Tokio; es solo "las 8:30 en alguna zona". Para resolverlo, se combina con un `ZoneId`.

**`LocalDate`.** Tipo de Java 8+ que representa una fecha sin hora y sin zona. Ejemplo: `2026-05-24`. Igual que `LocalTime`, es abstracto: no sabés si es el 24 de mayo en Lima o en Sídney; depende del contexto.

**`ZoneId`.** Tipo de Java que representa una zona horaria. Se crea con `ZoneId.of("America/Lima")`. Se usa para "anclar" un `LocalDate` o `LocalTime` a una zona concreta y poder convertirlo a `Instant`.

**`TIMESTAMP` (en Postgres).** Tipo de columna que guarda fecha y hora sin metadata de zona. Es responsabilidad del cliente (la app) interpretar qué zona le corresponde. Ocupa 8 bytes.

**`TIMESTAMP WITH TIME ZONE` (en Postgres).** Tipo de columna que guarda fecha, hora y zona juntas. Al leer, Postgres convierte automáticamente a la zona del cliente. Más robusto para sistemas multi-zona, pero ocupa lo mismo (8 bytes, la zona se infiere del cliente).

**`hibernate.jdbc.time_zone`.** Propiedad de Hibernate que le dice qué zona usar cuando lee y escribe `TIMESTAMP` sin zona. Sin esta propiedad, Hibernate usa la zona del sistema operativo. Con ella, la conversión es predecible y portable entre servidores.

**Flaky test.** Test que a veces pasa y a veces falla sin que haya cambiado el código. Causa típica: depender de algo no determinista, como la hora real del sistema, la red, o el orden de ejecución. Los flaky tests son veneno para la confianza en la suite, hay que cazarlos y eliminarlos.

**Regla del 3.** Heurística del proyecto: no extraer una abstracción hasta que el mismo código aparezca tres veces. Antes de la tercera repetición, la duplicación cuesta menos que la abstracción equivocada.

**Helper package-private.** Método o clase con visibilidad restringida al paquete (sin modificador `public` ni `private`). Solo lo pueden usar otras clases del mismo paquete Java. Útil para exponer funcionalidad a los tests (que viven en el mismo paquete) sin exponerla al resto del código.

**UTC offset.** Diferencia en horas y minutos entre una zona y UTC. Lima es UTC-5 (5 horas atrás de UTC). Tokio es UTC+9 (9 horas adelante). El offset puede ser fraccional en algunas zonas (India es UTC+5:30).

**DST (Daylight Saving Time / horario de verano).** Cambio voluntario de hora en algunos países durante el verano para aprovechar más luz del día. Causa bugs comunes en software porque un día tiene 23 horas y otro 25 horas dos veces al año. Lima NO aplica DST: ventaja para QueueLess.

## Referencias

- `backend/src/main/resources/application.yml` — `hibernate.jdbc.time_zone: America/Lima`.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/service/PedidoService.java` — constante `ZONA_LIMA` y su uso en `validarHorarioDeAtencion` y `generarCodigoUnico`.
- `backend/src/main/java/pe/edu/utec/queueless/pedido/entity/Pedido.java` — campos `Instant` para timestamps de auditoría.
- `backend/src/main/resources/db/migration/V1__schema_inicial.sql` — tipos `TIMESTAMP` en la tabla `pedido`.
- ADR-0003 — Modelo de 12 entidades (define qué campos llevan timestamps).
- ADR-0009 — Eventos de dominio (los eventos viajan con `Instant`, no con zona).
- ADR-0010 — Postgres puerto y env (configuración de la conexión a la base).
