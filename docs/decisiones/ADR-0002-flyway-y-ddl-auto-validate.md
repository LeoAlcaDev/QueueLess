# ADR-0002 — Migraciones con Flyway y `ddl-auto: validate`

## Contexto

Cuando uno arranca un proyecto Spring Boot con JPA, lo primero que tenemos que decidir es **quién maneja el schema de la base de datos**. Hay dos caminos principales:

1. **Que Hibernate lo maneje automáticamente**: cada vez que arrancamos el backend, Hibernate compara las entidades Java con las tablas existentes y aplica los cambios necesarios (`ddl-auto: create`, `update`, etc.).
2. **Que un sistema de migraciones versionadas lo maneje**: nosotros escribimos los cambios al schema como archivos SQL numerados (`V1__schema.sql`, `V2__agregar_columna.sql`), y la herramienta los aplica en orden, una sola vez por ambiente.

La decisión afecta cosas críticas: cómo agregar columnas, cómo manejar producción, cómo recrear la base, cómo coordinar cambios entre miembros del equipo. Este ADR fija la decisión.

## Decisión

Usamos **Flyway** para gestionar el schema, con migraciones SQL versionadas. Hibernate se configura con `ddl-auto: validate`, que significa: **Hibernate no toca el schema, solo verifica que las entidades Java calcen con lo que ya está en la base**, y falla al arrancar si hay mismatch.

La estructura de migraciones es:

```
backend/src/main/resources/db/migration/
├── V1__schema_inicial.sql      Schema completo: 13 tablas + índices + triggers + constraints
├── V2__catalogos_base.sql      Datos de catálogo necesarios para todos los ambientes
└── V99__seed_dev_data.sql      Datos demo para desarrollo (no se aplica en tests ni prod)
```

La numeración `V99` para los seeds de desarrollo es intencional: deja espacio para muchas migraciones reales (V3, V4, ..., V50) sin chocar.

En `application-test.yml` configuramos `flyway.target: 2` para que en tests **no se carguen los seeds de demo** (V99). Los tests trabajan contra una base vacía que cada test rellena con lo que necesita.

## Por qué no `ddl-auto: update`

`ddl-auto: update` parece cómodo: cambias una entidad, reinicias el backend, Hibernate agrega la columna. Pero tiene problemas serios cuando dejás dev:

- **No maneja renames.** Si renombrás una columna en Java, Hibernate ve "una columna nueva con nombre nuevo" y "una columna vieja que ya no aparece en las entidades". No las conecta. Resultado: agrega la nueva, deja la vieja, y los datos quedan en la columna vieja huérfana.
- **No maneja cambios de tipo.** Si cambiamos `VARCHAR(50)` a `VARCHAR(100)`, Hibernate puede no detectarlo o intentar algo destructivo según la versión.
- **No maneja datos de catálogo.** Las filas iniciales que toda instalación necesita (estados base, categorías, tipos predefinidos) no son schema, son datos. Hibernate no los pone.
- **No maneja triggers, funciones, índices parciales, vistas materializadas.** Cualquier objeto de base más allá de tablas y columnas básicas queda fuera del alcance de Hibernate.
- **No es reversible ni auditable.** Si queremos saber "qué cambió en el schema entre el 1 y el 15 de mayo", no hay manera.
- **No es production-ready.** Ningún sistema serio usa `update` en producción. Es solo para prototipos.

## Por qué `validate` y no `none`

`ddl-auto: validate` es la mejor opción de las que Hibernate ofrece cuando Flyway maneja el schema. Hace exactamente una cosa: cuando arranca la app, compara las entidades Java con las tablas reales y **falla al arrancar si hay mismatch**.

Por ejemplo, si en `PerfilRepartidor.java` tenemos el campo `medioTransporte` pero la tabla `perfil_repartidor` no tiene la columna `medio_transporte`, el backend no arranca y dice:

```
Schema-validation: missing column [medio_transporte] in table [perfil_repartidor]
```

Eso te avisa **antes** de que tu primer request rompa. La alternativa `none` no hace nada, y el error aparece recién cuando un query intenta usar la columna inexistente. `validate` es una red de seguridad sin costo.

## Flujo para agregar una columna nueva

Esto es lo que un developer hace cuando necesita agregar un campo:

1. Crear un archivo nuevo: `V3__agregar_telefono_a_usuario.sql` con el `ALTER TABLE`.
2. Actualizar la entidad JPA correspondiente (`Usuario.java`).
3. Arrancar el backend.

Flyway detecta que V3 no está aplicada, la corre, registra que ya está aplicada en la tabla interna `flyway_schema_history`, y arranca el backend. Hibernate ve que las entidades calzan con las tablas, da OK, y la app funciona.

**Importante:** una migración aplicada NUNCA se edita. Si V1 ya corrió en producción y queremos cambiar algo, hacemos un V5 que aplique el cambio incremental. Editar V1 después de aplicada haría que Flyway detecte un checksum mismatch y aborte al arrancar.

**Excepción durante desarrollo pre-producción:** mientras estamos en setup, antes de la primera entrega P1, todavía editamos V1 directamente (es lo que hicimos con la eliminación del campo `medioTransporte`). Esto es válido porque:

- No hay datos reales en juego, los seeds de V99 los regeneran.
- Tirar y recrear la base local es trivial (`docker compose down -v && up`).
- La historia limpia de migraciones es preferible a tener V1 + V3 corrigiendo decisiones de la misma semana.

Una vez que pasemos a producción, esta excepción deja de aplicar.

## Alternativas consideradas

### Alternativa 1 — `ddl-auto: update` puro

Dejar que Hibernate maneje todo. Descartada por todos los problemas que mencionamos arriba: no maneja renames, no maneja seeds, no es reversible, no es production-ready.

### Alternativa 2 — Liquibase en lugar de Flyway

Liquibase es la otra herramienta grande del ecosistema Java para migraciones. Es más potente (XML, YAML, JSON, no solo SQL; cambios reversibles automáticamente). Descartada porque:

- Flyway es más simple. SQL puro es legible para cualquiera que sepa SQL.
- El curso CS2031 enseña Flyway explícitamente.
- Liquibase brilla en proyectos enterprise con muchos ambientes y muchas reglas de rollback. Para un proyecto académico de 3 semanas, es overkill.

### Alternativa 3 — Scripts SQL manuales sin herramienta

Mantener una carpeta de SQL y aplicarlos a mano cuando hace falta. Descartada porque:

- Imposible coordinar entre miembros del equipo (¿quién aplicó V3 en su PC y quién no?).
- Sin tracking automático, terminamos aplicando el mismo cambio dos veces.
- En CI no funciona: la base efímera arranca limpia y necesita que algo aplique el schema.

## Consecuencias

### Positivas

- **Schema versionado en Git.** Cualquiera puede ver cómo evolucionó la base mirando los archivos de migración.
- **Reproducible en cualquier ambiente.** El backend levantado en CI, en dev local o en producción arranca con exactamente el mismo schema.
- **Coordinación automática entre miembros del equipo.** Cuando alguien agrega una migración, el resto solo hace `git pull` y arranca el backend; Flyway aplica lo que falta.
- **Errores tempranos.** Si las entidades Java se desincronizan del schema, el backend falla al arrancar con un mensaje claro, no en runtime con un query opaco.
- **Auditoría.** La tabla `flyway_schema_history` guarda quién aplicó cada migración y cuándo.

### Negativas

- **Curva de aprendizaje inicial.** Hay que entender la diferencia entre "agregar el campo en Java" y "agregar la columna en SQL", y que las dos cosas deben hacerse juntas.
- **No podés cambiar V1 una vez aplicada en producción.** Tenés que vivir con la decisión y hacer correcciones incrementales.
- **Coordinación de numeración.** Si dos developers hacen V3 al mismo tiempo en branches distintas, el segundo que mergea tiene que renombrar su V3 a V4. Manageable con comunicación.

### Riesgos

- **Riesgo de mismatch al editar V1 durante desarrollo.** Quien ya haya arrancado el backend con la V1 vieja tiene el checksum viejo guardado. Al actualizar V1, el siguiente arranque falla con "checksum mismatch". Mitigación: en dev, `docker compose down -v && up -d` borra el volumen y todo arranca desde cero. Documentado en el README.
- **Riesgo de olvidar la entidad Java al hacer la migración.** Si agregamos la columna en SQL pero no en `Usuario.java`, Hibernate `validate` falla al arrancar. Eso es bueno, avisa. Pero si lo hacemos al revés (Java sin migración), también falla. Mitigación: el flujo "migración primero, entidad después" es la convención.

## Anexo — Glosario de términos técnicos

**Migración (en bases de datos).** Un cambio incremental al schema, expresado como SQL, que se aplica una sola vez. Ejemplo: "agregar la columna `telefono` a la tabla `usuario`". Las migraciones se numeran y se aplican en orden, garantizando que la base evolucione de forma predecible y reproducible.

**Flyway.** Herramienta Java para gestionar migraciones SQL versionadas. Lee los archivos `V*__nombre.sql` en orden, los aplica a la base, y registra en una tabla interna (`flyway_schema_history`) cuáles ya están aplicadas. La próxima vez que arranca, solo aplica las que faltan.

**`ddl-auto` (de Hibernate).** Configuración que le dice a Hibernate qué hacer con el schema al arrancar. Los valores comunes son:

- `none` — Hibernate no toca nada, asume que el schema ya existe correcto.
- `validate` — Hibernate verifica que las entidades calcen con las tablas, falla al arrancar si no.
- `update` — Hibernate intenta sincronizar agregando lo que falta. No production-ready.
- `create` — Hibernate borra y recrea todo el schema. Destructivo, solo para tests muy específicos.
- `create-drop` — Como `create` pero además borra todo al cerrar la app.

**Checksum (de Flyway).** Un hash del contenido de cada archivo de migración. Flyway lo guarda al aplicar la migración por primera vez. Si después modificás el archivo, el checksum cambia, y Flyway detecta la diferencia al siguiente arranque. Esto previene que alguien edite migraciones ya aplicadas sin querer.

**Seeds (de datos).** Datos iniciales que se cargan en la base para tener algo con qué trabajar. En desarrollo son datos demo (productos de ejemplo, usuarios de prueba); en producción son datos de catálogo necesarios para el funcionamiento (estados base, configuraciones por defecto). Los seeds NO son schema, son contenido.

**`flyway_schema_history`.** Tabla que Flyway crea automáticamente en la base de datos para llevar el registro de qué migraciones aplicó, cuándo, y con qué checksum. Si la borramos manualmente, Flyway pierde el rastro y al siguiente arranque va a querer aplicar todas las migraciones desde V1.

## Referencias

- `backend/src/main/resources/application.yml` — configuración de Hibernate y Flyway.
- `backend/src/main/resources/application-test.yml` — `flyway.target: 2` para tests sin seeds.
- `backend/src/main/resources/db/migration/` — las 3 migraciones del proyecto.
- Documentación oficial de Flyway: https://documentation.red-gate.com/fd
