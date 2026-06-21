# ADR-0025 — Alérgenos estructurados y hábitos en el perfil

## Contexto

Hoy el cliente declara sus alergias en un solo campo de texto libre
(`PerfilCliente.alergias`) y el producto no declara nada sobre lo que contiene.
Eso alcanza para que el cliente escriba una nota, pero no para que el sistema
haga algo con ella: "maní", "manies", "alérgico al maní" y "PEANUT" son la misma
cosa para una persona y cuatro cosas distintas para una consulta. Y aunque el
texto del cliente fuera perfecto, del lado del producto no hay con qué cruzarlo,
porque el producto no dice qué alérgenos tiene.

Lo que viene a fijar este ADR es la fundación de datos para poder, más adelante,
responder preguntas como "¿este producto tiene algo que este cliente evita?". Para
eso necesitamos que las dos puntas hablen el mismo idioma: una lista cerrada de
alérgenos, compartida, que el producto usa para declarar y el cliente para evitar.
De paso sumamos los otros hábitos del cliente que esa misma función futura va a
mirar (restricciones de dieta, tolerancia al picante, presupuesto de referencia).

Quien consume todo esto —un asistente que recomienda o filtra el catálogo según
el perfil— llega en una fase posterior. Este ADR solo deja los datos bien
guardados y editables; no construye ninguna recomendación todavía. El perfil del
cliente como entidad y la composición de perfiles por rol ya están decididos
(ADR-0003, ADR-0007); acá los extendemos, no los rediscutimos.

## Decisión

### Un enum `Alergeno` cerrado y compartido

Definimos un enum `Alergeno` con nueve valores, los alérgenos de declaración
habitual en comida: `MANI`, `FRUTOS_SECOS`, `MARISCOS`, `PESCADO`, `LACTEOS`,
`HUEVO`, `GLUTEN`, `SOYA`, `AJONJOLI`. Es una lista **cerrada** (solo esos nueve,
no texto libre) y **compartida**: el mismo enum lo usa el producto para declarar
lo que contiene y el cliente para marcar lo que evita.

Vive en `shared/domain`, no dentro de `usuario` ni de `puntoventa`, justamente
porque lo comparten los dos lados. Que sea cerrado y compartido es lo que después
permite cruzar con confianza: si el producto guarda `MANI` y el cliente guarda
`MANI`, son exactamente el mismo valor, sin depender de cómo cada quien lo
escribió.

### Se guarda como `Set<Alergeno>` con `@ElementCollection`, en tabla hija

Un enum de **un** valor se guarda como una columna: el estado de un pedido es una
columna `estado` (ADR-0003). Pero acá un producto puede tener **varios**
alérgenos a la vez, y un cliente puede evitar **varios**. Un conjunto de valores
no entra en una columna; va en una **tabla hija**, una fila por cada valor del
conjunto, atada por clave foránea a su dueño. Lo mapeamos con `@ElementCollection`,
el mismo patrón con el que el usuario ya guarda su `Set<Rol>` (ADR-0007); es el
único precedente de colección de enums en el repo y lo seguimos tal cual.

Elegimos la tabla hija, y no apretar los alérgenos en una sola columna de texto,
porque la tabla hija se puede **consultar**. Con una fila por alérgeno, "dame los
productos de este local que no contienen ninguno de estos tres alérgenos" es una
consulta normal; con un texto `"MANI,GLUTEN"` metido en una columna, sería buscar
subcadenas, que es frágil y no escala.

Son **dos tablas independientes**: `producto_alergeno` (lo que el producto
contiene) y `perfil_cliente_alergeno` (lo que el cliente evita). **No** es una
sola tabla que cruce cliente con producto. La compatibilidad entre un cliente y
un producto no se guarda: se calcula en el momento, en código o en una consulta,
comparando los dos conjuntos. Guardar el cruce sería precalcular algo que cambia
cada vez que el cliente edita su perfil o el comercio edita su producto; preferimos
no tener nada que mantener sincronizado.

### Cuatro campos de hábitos en `PerfilCliente`, junto al texto que ya existe

Al `PerfilCliente`, sin tocar el `alergias` de texto libre que ya tiene, le
sumamos cuatro campos:

- `alergenosEvitar` (`Set<Alergeno>`) — los alérgenos que el cliente evita, en su
  propia tabla hija.
- `restriccionesDieteticas` (`Set<RestriccionDietetica>`) — un enum nuevo con
  `VEGETARIANO`, `VEGANO`, `SIN_GLUTEN`. Es un `Set` porque pueden convivir: un
  cliente vegano que además evita el gluten marca los dos.
- `toleranciaPicante` (`ToleranciaPicante`) — una escala chica y ordenada:
  `NINGUNA`, `BAJA`, `MEDIA`, `ALTA`. Es opcional (nullable); si el cliente no la
  declara, queda en nulo y nadie asume un valor.
- `presupuestoReferencia` (`BigDecimal`, nullable) — cuánto suele querer gastar,
  como referencia para filtrar. Opcional también.

El alérgeno y la restricción dietética son dos ejes distintos aunque a veces se
toquen: evitar `GLUTEN` por alergia es una restricción de salud; marcar
`SIN_GLUTEN` como dieta es una elección. Pueden coexistir y no se deducen uno del
otro, por eso son campos separados.

Conservamos `alergias` de texto libre a propósito: la lista cerrada captura los
nueve casos que sirven para cruzar, pero el texto libre todavía guarda el matiz
que la lista no tiene ("alergia leve al kiwi", "molestia con la cebolla cruda").
Los dos conviven, cada uno para lo suyo.

### Declarar no es obligatorio, y "sin alérgenos declarados" nunca significa "seguro"

Ni el cliente está obligado a declarar lo que evita, ni el comercio a declarar lo
que su producto contiene. Y, sobre todo, que un producto no liste un alérgeno **no
garantiza** que no lo tenga: puede que el comercio no lo haya cargado todavía. Esa
advertencia es copy que el frontend muestra al usuario; la consecuencia en el
backend es una regla que respetamos siempre: **nunca tratamos la ausencia de
alérgenos declarados como una señal de que el producto es seguro**. La función
futura que recomiende tendrá que asumir lo mismo: ausencia de dato es ausencia de
dato, no es un "no contiene".

### Alcance de esta fase: solo se guarda y se edita

En esta fase estos campos solo se persisten y se editan. El cliente los edita por
el endpoint de perfil que ya existe (`PUT /api/v1/me/perfiles/cliente`), que
extendemos para aceptar los campos nuevos; el producto declara sus alérgenos por
el flujo de alta y edición de producto del comercio, que también extendemos. No
construimos ninguna recomendación ni filtro acá: eso lo hará el asistente de una
fase posterior, que es el que de verdad consume estos datos.

## Por qué una lista cerrada y no texto libre

El texto libre es cómodo para escribir y inútil para cruzar. "Maní", "mani",
"cacahuate", "alérgico al maní" son la misma alergia escrita de cuatro formas; una
consulta las ve distintas. Si queremos que el sistema compare lo que el cliente
evita con lo que el producto contiene, las dos puntas tienen que elegir de la
misma lista corta y fija. Por eso cerramos el vocabulario a nueve valores: no para
limitar al usuario —el texto libre sigue ahí para el matiz— sino para tener un
terreno común donde la comparación sea confiable.

## Por qué dos tablas independientes y no una de cruce

La tentación sería guardar, por cada par cliente-producto, si son compatibles. Lo
evitamos porque ese dato se pudre solo: cambia cada vez que el cliente edita lo que
evita y cada vez que el comercio edita lo que el producto contiene, y habría que
recalcular y reescribir filas en cada edición. En cambio, con las dos listas
guardadas por separado, la compatibilidad se resuelve en el momento de
necesitarla, comparando dos conjuntos chicos. Es menos que mantener y siempre está
al día.

## Por qué conservamos el texto libre de alergias

Podríamos haber reemplazado `alergias` por la lista cerrada y listo. No lo
hicimos porque perderíamos información: la lista cubre los nueve alérgenos que
sirven para cruzar, pero un cliente puede querer anotar algo que no está en la
lista o un detalle ("solo el maní tostado, el hervido no"). El texto libre guarda
eso; la lista cerrada guarda lo que se compara. Tirar el texto sería angostar lo
que el cliente puede decir, sin ganar nada.

## Alternativas consideradas

### Alternativa 1 — Seguir solo con el texto libre

Dejar todo como está y que el cliente y el comercio escriban sus alérgenos en
prosa. Lo descartamos porque es exactamente lo que no se puede cruzar: sin un
vocabulario común, comparar lo que el cliente evita con lo que el producto
contiene es adivinar subcadenas. La fundación que este ADR necesita dejar no se
puede construir sobre texto libre.

### Alternativa 2 — Una sola columna con los alérgenos serializados

Guardar el conjunto apretado en una columna, como `"MANI,GLUTEN"` o un JSON. Lo
descartamos porque mata la consulta: "productos sin ninguno de estos alérgenos"
pasa a ser búsqueda de subcadenas dentro de una columna, frágil y lenta, en vez de
un filtro normal sobre filas. La tabla hija cuesta una tabla más y a cambio deja
todo consultable.

### Alternativa 3 — Una tabla de compatibilidad cliente×producto

Precalcular y guardar, por cada par, si el producto es apto para el cliente. Lo
descartamos porque es un dato derivado que hay que mantener sincronizado con dos
fuentes que cambian (el perfil y el producto), y porque no lo necesitamos: el
cruce es barato de calcular en el momento. Guardarlo sería crear trabajo de
mantenimiento para ahorrar una comparación de conjuntos que no es cara.

## Consecuencias

### Positivas

- **Las dos puntas hablan el mismo idioma.** Producto y cliente eligen alérgenos
  de la misma lista cerrada, así que cruzarlos después es confiable y no depende
  de cómo se escribió cada uno.
- **Todo queda consultable.** Las tablas hijas permiten filtrar el catálogo por
  alérgenos con consultas normales, que es lo que la función futura va a necesitar.
- **Reusa el patrón que ya está.** El `@ElementCollection` calca el `Set<Rol>` del
  usuario; no inventamos un mapeo nuevo ni sumamos dependencias.
- **El matiz no se pierde.** El texto libre de alergias sigue para lo que la lista
  cerrada no captura.

### Negativas

- **Dos tablas hijas más en el esquema.** `producto_alergeno` y
  `perfil_cliente_alergeno` se suman al modelo. Mitigación: es el costo mínimo de
  guardar conjuntos en relacional, y son tablas chicas y simples (clave foránea +
  valor).
- **La compatibilidad se calcula cada vez.** Al no guardar el cruce, hay que
  compararlo en cada consulta. Mitigación: son conjuntos de a lo sumo nueve
  valores; comparar dos así es trivial, mucho más barato que mantener un cruce
  precalculado al día.

### Riesgos

- **Confiar en la ausencia de datos.** El riesgo real no es técnico sino de
  interpretación: que alguien lea "el producto no lista maní" como "el producto no
  tiene maní". Mitigación: la regla de no tratar nunca la ausencia como seguridad
  queda escrita acá y el frontend muestra la advertencia al usuario; la función
  futura debe respetar lo mismo.
- **La lista cerrada puede quedar corta.** Nueve alérgenos cubren lo habitual,
  pero podría faltar alguno. Mitigación: agregar un valor es un cambio chico —un
  valor más en el enum y una migración corta para ampliar el `CHECK` de las tablas
  de alérgenos—, y mientras tanto el campo de texto libre absorbe lo que la lista
  no tiene.

## Anexo — Glosario de términos técnicos

**`@ElementCollection`.** La anotación de JPA para guardar una colección de
valores simples (no de otras entidades) que pertenecen a una entidad. En vez de
una columna, crea una tabla hija con una fila por cada elemento de la colección.

Ejemplo concreto: `PerfilCliente.alergenosEvitar` es un `Set<Alergeno>` anotado
con `@ElementCollection`; si un cliente evita `MANI` y `MARISCOS`, en la tabla
`perfil_cliente_alergeno` quedan dos filas, las dos apuntando a ese cliente.

**Tabla hija (de colección).** La tabla que `@ElementCollection` arma para guardar
los elementos. Tiene una clave foránea al dueño y una columna con el valor; la
combinación de las dos es la clave primaria, así que no se repite el mismo valor
para el mismo dueño.

Ejemplo concreto: `producto_alergeno` tiene `producto_id` (a qué producto
pertenece) y `alergeno` (el valor, como texto). Un producto con maní y gluten
ocupa dos filas: `(42, 'MANI')` y `(42, 'GLUTEN')`.

**Enum guardado como `STRING`.** Un enum de Java que en la base se guarda con su
nombre como texto, no con su número de orden. Es la convención del proyecto
(ADR-0003) para que el dato sea legible y no se rompa si se reordenan los valores
del enum.

Ejemplo concreto: el valor `AJONJOLI` se guarda en la columna `alergeno` como la
cadena `'AJONJOLI'`. Si mañana agregamos `APIO` en cualquier posición del enum,
las filas viejas siguen diciendo lo mismo, porque guardan el nombre, no la
posición.

**`Set` (conjunto) frente a columna.** Un `Set` es una colección sin repetidos y
sin orden. Lo usamos cuando un dato puede tener varios valores a la vez —varios
alérgenos, varias restricciones— que es justo lo que no entra en una sola columna
y por eso va a tabla hija.

Ejemplo concreto: `restriccionesDieteticas` es un `Set<RestriccionDietetica>`
porque un cliente vegano y sin gluten tiene las dos a la vez; marcarlas no se
pisan ni se ordenan, simplemente están las dos.

**Escala ordinal.** Un enum cuyos valores tienen un orden con sentido (de menos a
más), a diferencia de uno donde los valores son solo etiquetas sueltas.

Ejemplo concreto: `ToleranciaPicante` va de `NINGUNA` a `ALTA` pasando por `BAJA`
y `MEDIA`; ese orden significa algo (cuánto picante aguanta el cliente), cosa que
en `Alergeno` no pasa: ahí `MANI` y `SOYA` no están uno "antes" del otro.

## Referencias

- ADR-0003 — Modelo de entidades (el `PerfilCliente` que extendemos, el `Producto`
  al que le sumamos alérgenos, y la convención de guardar enums como `STRING`).
- ADR-0007 — Multi-rol y composición (el `Set<Rol>` con `@ElementCollection` que
  tomamos como precedente para mapear los conjuntos de alérgenos).
- ADR-0022 — Versionado y autorización por método (el endpoint
  `PUT /api/v1/me/perfiles/cliente` que extendemos vive bajo esas reglas).
- `backend/src/main/java/pe/edu/utec/queueless/shared/domain/Alergeno.java` — el enum compartido.
- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/RestriccionDietetica.java` y `ToleranciaPicante.java` — los enums de hábitos del cliente.
- `backend/src/main/java/pe/edu/utec/queueless/usuario/entity/PerfilCliente.java` — los cuatro campos nuevos.
- `backend/src/main/java/pe/edu/utec/queueless/puntoventa/entity/Producto.java` — la declaración de alérgenos del producto.
- `backend/src/main/java/pe/edu/utec/queueless/usuario/dto/ActualizarPerfilClienteRequest.java` y `PerfilClienteResponse.java` — la entrada y salida del perfil con los campos nuevos.
- `backend/src/main/java/pe/edu/utec/queueless/usuario/service/PerfilService.java` — donde se persisten los campos editados.
- `backend/src/main/resources/db/migration/V6__perfil_y_producto_alergenos.sql` — las tablas hijas y las columnas nuevas.
