# ADR-0008 — Ledger pattern para QueuePoints

## Contexto

QueuePoints son los puntos que el sistema otorga a los repartidores cuando completan una entrega. Cada entrega vale 50 puntos (configurable en `application.yml`). Los puntos se pueden acumular y eventualmente canjear como descuento en pedidos futuros, expirar, o ser revertidos si una entrega fue marcada por error.

La pregunta de diseño es simple en apariencia pero crítica: **¿dónde y cómo guardamos el saldo de puntos de cada usuario?**

La opción intuitiva es agregar una columna `puntos` en Usuario o en PerfilRepartidor, e ir sumándole/restándole cuando pasan cosas. Pero esa opción tiene problemas serios que no son obvios hasta que ya estás en producción.

Este ADR fija cómo modelamos QueuePoints.

## Decisión

Aplicamos el **patrón Ledger** (libro mayor contable). En lugar de guardar el saldo, guardamos **cada movimiento** que afecta el saldo. El saldo se calcula sumando los movimientos.

Modelamos esto con una entidad `MovimientoQueuePoints`:

```java
@Entity
public class MovimientoQueuePoints {
    private Long id;
    private Usuario usuario;
    private TipoMovimiento tipo;       // GANADO, CANJEADO, EXPIRADO, REVERTIDO
    private Integer monto;             // siempre positivo
    private String referenciaTipo;     // "PEDIDO", "ENTREGA", "BONO"
    private Long referenciaId;
    private String descripcion;
    private Instant createdAt;
}
```

**No existe** un campo `puntos` ni en Usuario ni en PerfilRepartidor.

Para saber el saldo de Camila, hacemos:

```sql
SELECT
  SUM(CASE WHEN tipo IN ('GANADO') THEN monto
           WHEN tipo IN ('CANJEADO', 'EXPIRADO') THEN -monto
           ELSE 0
      END) AS saldo
FROM movimiento_queuepoints
WHERE usuario_id = 42;
```

(En código JPA esto se hace con un query derivado o JPQL; el cálculo es el mismo.)

## Por qué ledger y no un campo `puntos`

El patrón Ledger es estándar en sistemas que manejan dinero o cualquier "saldo" donde la **auditoría y reversibilidad importan**. Lo usan Visa, MasterCard, Starbucks, MercadoPago, Mercado Libre. Las razones son fuertes:

**Razón 1 — Auditoría completa.** Con un campo `puntos = 250`, el día que un usuario pregunte "¿de dónde salieron mis 250 puntos?", no tenemos respuesta. Con ledger, mostramos:

```
+50  GANADO     entrega del pedido #1290 (2026-04-01)
+50  GANADO     entrega del pedido #1305 (2026-04-03)
-30  CANJEADO   descuento aplicado al pedido #1320 (2026-04-05)
+50  GANADO     entrega del pedido #1340 (2026-04-07)
+130 GANADO     bono de bienvenida (2026-04-08)
+50  GANADO     entrega del pedido #1355 (2026-04-10)
```

Total: 250 puntos. Cada uno con su fecha, motivo y referencia. La auditoría es la consulta misma.

**Razón 2 — Reversibilidad sin perder historia.** Imaginá que el pedido #1290 fue marcado como entregado por error. Camila no entregó nada, alguien apretó el botón equivocado. Tenés que quitarle 50 puntos.

Con un campo `puntos`, hacemos `puntos = puntos - 50`. Pero ahora la auditoría no calza: el pedido #1290 sigue en la base como "entregado", pero los puntos correspondientes ya no están. Si alguien hace una revisión forense, no entiende.

Con ledger, agregamos un movimiento nuevo:

```
-50  REVERTIDO  reverso de entrega errónea del pedido #1290 (2026-04-12)
```

La historia queda intacta. Nada se borra. El saldo refleja la corrección. Y cualquier auditor puede ver exactamente qué pasó.

**Razón 3 — Concurrencia segura.** Con un campo `puntos`, dos operaciones concurrentes pueden tener race conditions:

- Operación A lee `puntos = 250`, va a hacer `250 + 50`.
- Operación B lee `puntos = 250` (al mismo tiempo), va a hacer `250 - 30`.
- A escribe `puntos = 300`.
- B escribe `puntos = 220`.

Resultado: se "perdió" la suma de 50 puntos. Esto se mitiga con locking optimista (`@Version` en JPA) pero requiere reintentos y código defensivo.

Con ledger, NO hay locking necesario. Cada operación es un INSERT independiente. Si las dos operaciones del ejemplo corren al mismo tiempo, ambas insertan su movimiento. El saldo correcto sale al consultar.

**Razón 4 — Reportes naturales.** Reportes como "puntos ganados por usuario en abril", "puntos canjeados por tipo", "ranking de repartidores por puntos ganados en el mes" son queries triviales con ledger. Con un campo `puntos`, esos reportes requerirían una tabla auxiliar de historial que termina siendo... un ledger improvisado.

## Cómo se implementa en el flujo

El flujo concreto desde que Camila entrega un pedido hasta que sus puntos aparecen:

1. El comercio marca el pedido como `ENTREGADO`.
2. `PedidoService.cambiarEstado` publica el evento `PedidoEstadoCambiadoEvent`.
3. `EntregaCompletadaListener` (en el módulo `queuepoints/`) escucha el evento.
4. Si el evento corresponde a una transición a `ENTREGADO` Y el pedido tenía SolicitudDelivery, el listener llama a `QueuePointsService.registrarGanancia(repartidorId, 50, "Entrega de pedido #N")`.
5. `QueuePointsService` hace un `INSERT` en `movimiento_queuepoints` con tipo `GANADO`, monto 50, referencia al pedido.

La próxima vez que alguien consulta el saldo de Camila, ese movimiento ya está incluido.

## Reglas del modelo

Reglas que definimos para mantener el ledger consistente:

- **`monto` siempre positivo.** El signo lo determina el `tipo`. Esto evita confusión y permite el CHECK constraint `monto > 0`.
- **`tipo` controla la dirección del movimiento.** `GANADO` suma, `CANJEADO` resta, `EXPIRADO` resta, `REVERTIDO` resta el monto del movimiento original.
- **Cada movimiento tiene una referencia.** `referenciaTipo` y `referenciaId` apuntan al origen (PEDIDO, ENTREGA, BONO). Eso permite ir desde un movimiento hasta el evento que lo causó.
- **Los movimientos son inmutables.** Nunca se hace UPDATE en `movimiento_queuepoints`. Si hay que corregir algo, se inserta un movimiento nuevo de tipo `REVERTIDO`.
- **Solo el repartidor gana QueuePoints.** El cliente NO gana QueuePoints (al menos en el MVP). Esto es una decisión de producto, no técnica.

## Restricciones que evitamos

Hay variantes del patrón ledger que sí descartamos para este proyecto:

- **No agregamos partida doble (double-entry).** En contabilidad real, cada movimiento tiene dos entradas (débito en una cuenta, crédito en otra) para que el sistema siempre cuadre. Acá tenemos un solo "lado": el saldo de un usuario. No hay otra cuenta del otro lado. Eso simplifica el modelo sin perder las propiedades importantes.
- **No precomputamos saldo en cache.** Recalcular el saldo desde los movimientos cada vez que se consulta es barato con un índice en `usuario_id`. Mientras la cantidad de movimientos por usuario sea razonable (cientos en un año típico), no hace falta cache. Si en el futuro un usuario tiene millones de movimientos, evaluamos snapshots periódicos.

## Alternativas consideradas

### Alternativa 1 — Campo `puntos` en Usuario

Lo más simple aparentemente: `usuario.puntos = 250`. Descartado por las 4 razones de arriba (auditoría, reversibilidad, concurrencia, reportes).

### Alternativa 2 — Campo `puntos` en PerfilRepartidor

Variante de la anterior, poniendo el campo en el perfil específico. Mismo problema: sin historial, sin auditoría, sin reversibilidad limpia.

### Alternativa 3 — Tabla `saldo_puntos` + tabla `historial_puntos`

Mantener un saldo precomputado en una tabla y guardar el historial por separado. Es básicamente un ledger con cache, pero con la complicación extra de mantener las dos tablas sincronizadas (transacciones, locks, etc.). Descartado por agregar complejidad sin beneficio claro al volumen esperado.

### Alternativa 4 — Event sourcing completo

Modelar TODO el dominio como una secuencia de eventos persistidos, no solo los puntos. Descartado porque es overkill para nuestro caso. Event sourcing brilla cuando todo el sistema necesita auditoría temporal completa. Acá solo los puntos lo necesitan.

## Consecuencias

### Positivas

- **Auditoría completa, gratis.** Cualquier consulta de "¿de dónde salieron mis puntos?" es directa.
- **Reversibilidad limpia.** Errores se corrigen con movimientos nuevos, no con sobrescritura.
- **Concurrencia sin locks.** INSERTs independientes no chocan entre sí.
- **Reportes triviales.** Group by y agregaciones funcionan directo sobre la tabla.
- **Compatible con regulaciones futuras.** Si alguna vez QueuePoints toca aspectos tributarios o legales, ya tenemos el rastro completo.

### Negativas

- **Saldo no está pre-calculado.** Cada consulta de saldo es un `SUM`. Para un usuario con cientos de movimientos es trivial. Mitigación si crece: índice cubierto en `(usuario_id, monto, tipo)`.
- **La tabla crece monótonamente.** Cada entrega agrega una fila, nunca se borra. Mitigación: a años vista, particionado por fecha o archivado de movimientos viejos.

### Riesgos

- **Riesgo de movimientos huérfanos.** Si por error agregamos un movimiento `GANADO` sin que haya entrega real, el saldo se infla. Mitigación: la `referenciaId` apunta al pedido/entrega; un job de consistencia puede verificar que cada movimiento `GANADO` tipo `ENTREGA` corresponda a una SolicitudDelivery en estado `ENTREGADO`.
- **Riesgo de duplicación.** Si un listener async procesa dos veces el mismo evento (por reintento), se duplican movimientos. Mitigación: idempotencia en el listener (verificar que no exista ya un movimiento con esa `referenciaTipo` + `referenciaId`).

## Anexo — Glosario de términos técnicos

**Ledger (libro mayor).** Concepto que viene de la contabilidad. Un ledger es un registro cronológico de todos los movimientos (entradas y salidas) que afectan una cuenta. El saldo no se guarda, se calcula sumando los movimientos. Es la base de cómo funcionan los bancos, las tarjetas de crédito, y todo sistema serio que maneja dinero o valores intercambiables.

Ejemplo concreto en el proyecto: la tabla `movimiento_queuepoints` es nuestro ledger. Cada fila es un movimiento. El saldo de un usuario es la suma neta de sus movimientos.

**Partida doble (double-entry bookkeeping).** Variante del ledger usada en contabilidad seria, donde cada movimiento tiene dos entradas: un débito en una cuenta y un crédito en otra. Eso garantiza que la suma global del sistema siempre sea cero, lo cual permite detectar inconsistencias.

Ejemplo: cuando un banco transfiere 100 USD de tu cuenta a otra, hace dos asientos: -100 en tu cuenta, +100 en la otra. La suma del sistema sigue siendo cero. En QueueLess no usamos partida doble porque no hay "otra cuenta" del lado contrario.

**Reversibilidad.** Propiedad de un sistema de poder deshacer una operación sin perder historia. Con ledger, deshacer una operación se hace agregando un movimiento contrario, no borrando ni sobrescribiendo el original.

Ejemplo concreto: si Camila ganó 50 puntos por una entrega que después se canceló, agregamos un movimiento `REVERTIDO -50` referenciando al movimiento original. Ambos quedan en la tabla. El saldo refleja la corrección, la historia muestra qué pasó.

**Race condition (en bases de datos).** Situación donde dos operaciones concurrentes leen y escriben el mismo dato sin coordinación, resultando en estados inconsistentes. Típicamente: dos transacciones leen el mismo valor, cada una lo modifica, y al escribir una "pisa" a la otra perdiendo el cambio.

Ejemplo concreto del problema que ledger evita: dos requests simultáneos sumando puntos a Camila. Con `puntos = puntos + 50`, podés perder uno de los dos. Con ledger, cada uno hace un INSERT independiente, y ambos quedan.

**Locking optimista (`@Version` en JPA).** Mecanismo donde cada entidad tiene un campo `version` que se incrementa con cada UPDATE. Al actualizar, JPA verifica que la versión leída coincida con la actual; si no, lanza una excepción y la transacción se reintenta. Soluciona race conditions pero agrega complejidad.

**Idempotencia.** Propiedad de una operación de poder ejecutarse múltiples veces sin que el resultado cambie. Importante para sistemas distribuidos donde un mismo mensaje puede llegar dos veces. En el contexto del ledger, idempotencia significa que insertar el mismo movimiento dos veces no debería duplicar el saldo.

Ejemplo concreto: el `EntregaCompletadaListener` debería verificar que ya no exista un movimiento con `referenciaTipo=PEDIDO` y `referenciaId=1290` antes de insertar uno nuevo. Si ya existe, no hace nada. Eso lo vuelve idempotente.

**Snapshot (en patrones de event sourcing y ledger).** Cálculo precomputado del estado actual a un momento dado, guardado para no tener que recalcular desde cero. En ledger, un snapshot sería un saldo guardado a fecha X, de modo que para calcular el saldo actual solo hace falta sumar los movimientos posteriores a esa fecha. No lo usamos al MVP, pero es una optimización conocida si crece el volumen.

## Referencias

- `backend/src/main/java/pe/edu/utec/queueless/queuepoints/entity/MovimientoQueuePoints.java` — la entidad.
- `backend/src/main/java/pe/edu/utec/queueless/queuepoints/entity/TipoMovimiento.java` — los tipos posibles.
- `backend/src/main/java/pe/edu/utec/queueless/queuepoints/service/QueuePointsService.java` — service (con TODOs de Semana 3).
- `backend/src/main/java/pe/edu/utec/queueless/queuepoints/listener/EntregaCompletadaListener.java` — listener que dispara movimientos al completar entregas.
- `backend/src/main/resources/db/migration/V1__schema_inicial.sql` — tabla `movimiento_queuepoints` con sus constraints.
- ADR-0003 — Modelo de 12 entidades (este es subdetalle de la decisión 12).
- ADR-0009 — Eventos de dominio (mecanismo por el cual los movimientos se disparan).
