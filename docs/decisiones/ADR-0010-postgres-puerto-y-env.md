# ADR-0010 — Postgres en puerto 5467 y configuración con `.env`

## Contexto

Postgres por convención escucha en el puerto 5432. La mayoría de proyectos lo usan tal cual. Pero en máquinas reales del equipo, ese puerto está ocupado: por una instalación de pgAdmin local, por otro proyecto en docker, o por un Postgres instalado nativo del sistema.

Cuando levantamos QueueLess local con `docker compose up -d`, si exponemos el contenedor de Postgres en el 5432 y el desarrollador ya tiene algo ahí, el comando falla con "port already in use". Solución obvia: usar otro puerto en el host.

Pero también necesitamos que el equipo no tenga que tocar archivos commiteables para configurar su entorno local. Y queremos que las credenciales, los tokens, y las URLs de servicios externos vivan fuera del código fuente.

Este ADR fija dos decisiones relacionadas: qué puerto usa Postgres en el host, y cómo manejamos la configuración por ambiente.

## Decisión

### Postgres en puerto 5467 por defecto

El contenedor de Postgres internamente sigue escuchando en 5432, pero **se expone al host en el puerto 5467**. Configurado en `docker-compose.yml`:

```yaml
postgres:
  image: postgres:16-alpine
  ports:
    - "${POSTGRES_HOST_PORT:-5467}:5432"
```

El default es 5467 (no 5432), así el backend conecta sin necesidad de archivo `.env`. Si un desarrollador tiene también el 5467 ocupado, puede sobreescribirlo con un `.env` que defina `POSTGRES_HOST_PORT=5468` u otro.

Eligimos 5467 porque:

- Está cerca de 5432 (fácil de recordar como "el de Postgres").
- No es un puerto de servicio conocido (no choca con HTTP, SSH, MySQL, etc.).
- No tiene reservas oficiales en la lista IANA de puertos comunes.

### Backend en puerto 8090 en dev (8080 en prod)

`application-dev.yml` configura `server.port: 8090`. La razón es similar al Postgres: muchos developers tienen el 8080 ocupado (otro Spring Boot, Tomcat instalado, otros proyectos Java). El default en `application.yml` queda en 8080 (que es lo que usa producción).

### `.env.example` commiteado, `.env` ignorado

El repo tiene un archivo `.env.example` con todas las variables que el proyecto puede usar, con valores placeholder o vacíos:

```
POSTGRES_HOST_PORT=5467
JWT_SECRET=dev-secret-change-me-in-prod-this-must-be-32-bytes-or-more
MERCADOPAGO_ACCESS_TOKEN=
FIREBASE_CREDENTIALS_JSON=
FIREBASE_ENABLED=false
AWS_REGION=
AWS_S3_BUCKET=
```

Y `.gitignore` excluye `.env`, `.env.local`, `.env.*.local`. Cada desarrollador puede copiar `.env.example` a `.env` y poner sus valores específicos sin riesgo de subirlos al repo.

### docker-compose lee `.env` automáticamente, Spring Boot NO

Aclaración importante porque genera confusión:

- **Docker Compose** lee `.env` del directorio donde está `docker-compose.yml` y sustituye las variables (`${POSTGRES_HOST_PORT:-5467}`). Esto pasa automáticamente, sin configuración.
- **Spring Boot** NO lee `.env`. Lee variables de entorno del sistema o de `application*.yml`. Para que Spring Boot use una variable de `.env`, tendrías que cargarla en el shell antes de arrancar (`source .env`), o usar una librería como `spring-dotenv`.

En QueueLess, `.env` lo usa principalmente `docker-compose`. El backend lee la URL de la base directamente de `application-dev.yml` (`jdbc:postgresql://localhost:5467/queueless`) sin pasar por `.env`. Si en producción necesitamos pasar variables al backend, se hacen variables de entorno del SO directamente (en Kubernetes ConfigMap, en AWS Task Definition, etc.), no a través de `.env`.

## Por qué hardcodear `localhost:5467` en application-dev.yml

Una alternativa sería hacer `application-dev.yml` usar `${POSTGRES_HOST_PORT:-5467}` para que sea consistente con docker-compose. Decidimos hardcodear porque:

- El backend siempre conecta a Postgres en localhost en dev (el contenedor mapea al host).
- Si alguien sobreescribe `POSTGRES_HOST_PORT` en `.env` para el compose, tiene que también acordarse de actualizar `application-dev.yml` o exportar la variable manualmente. Es una doble configuración.
- En la práctica, el caso del 5467 ya cubre el 99% de los desarrolladores. Si alguien tiene también el 5467 ocupado, le toca tocar dos lugares; es manejable y excepcional.

Esta decisión es revisable: si en algún momento el equipo crece y aparecen más conflictos de puerto, refactorizamos a usar variables consistentes.

## Variables que el `.env.example` documenta

| Variable | Para qué | Default en `.env.example` |
|---|---|---|
| `POSTGRES_HOST_PORT` | Puerto donde docker-compose expone Postgres | `5467` |
| `JWT_SECRET` | Secret para firmar JWTs | placeholder de 32 chars |
| `MERCADOPAGO_ACCESS_TOKEN` | Token de la pasarela (Semana 2) | vacío |
| `FIREBASE_CREDENTIALS_JSON` | Credenciales de FCM en base64 (Semana 2) | vacío |
| `FIREBASE_ENABLED` | Activar push notifications | `false` |
| `AWS_REGION` | Región AWS para S3 (Semana 3) | vacío |
| `AWS_S3_BUCKET` | Nombre del bucket S3 | vacío |

Las variables vacías corresponden a integraciones futuras. En dev no las necesitamos (usamos `MockPaymentGateway` y `LocalStorageService`).

## Alternativas consideradas

### Alternativa 1 — Usar el puerto 5432 estándar

Lo descartamos porque rompe en máquinas con otro Postgres corriendo. Y forzar al desarrollador a desinstalar su Postgres local para correr el proyecto es mala UX.

### Alternativa 2 — Usar un puerto random del host

Algunos proyectos hacen `ports: - "5432"` (sin especificar puerto del host), lo que hace que Docker asigne uno aleatorio. Descartado porque entonces hay que buscarlo con `docker ps` cada vez y actualizar la configuración del backend dinámicamente. Demasiada fricción.

### Alternativa 3 — Spring Cloud Config / Vault para todas las configuraciones

Centralizar las configuraciones de todos los ambientes en un servidor de configuración. Descartado por sobreingeniería: para un proyecto de 3 semanas con 2 ambientes (dev y prod), basta con archivos YAML y variables de entorno.

### Alternativa 4 — Usar `spring-dotenv` para que Spring Boot lea `.env`

La librería existe y permite que Spring lea `.env` igual que docker-compose. Descartado porque agrega una dependencia para un beneficio pequeño. Preferimos la separación clara: `.env` es para docker-compose, `application*.yml` es para Spring.

## Consecuencias

### Positivas

- **Funciona out-of-the-box.** Cualquier developer clona el repo, hace `docker compose up -d`, arranca el backend, y funciona. Sin configurar nada manualmente.
- **`.env.example` documenta TODAS las variables.** Quien quiera entender qué se puede configurar abre ese archivo.
- **Secretos seguros.** El `.env` real con tokens reales nunca se commitea.
- **Configuración por ambiente clara.** `application.yml` base, `-dev`, `-test`, `-prod` cada uno con su override.

### Negativas

- **Doble fuente de configuración (env vs yml).** Algunos valores están en `.env` (puerto), otros en `application*.yml` (URL JDBC). Confunde al principio. Mitigado con esta documentación.
- **Puerto no estándar.** Cuando alguien busca "conectarse al Postgres" en herramientas como DBeaver, tiene que recordar `localhost:5467` en lugar de 5432. Mitigado documentando claramente en READMEs.

### Riesgos

- **Riesgo de olvidar copiar `.env.example` a `.env` en algún ambiente nuevo.** Si pasa, `docker compose` igual usa el default `:-5467` y arranca, pero las variables que NO tienen default (como tokens) quedan vacías. Mitigación: el README documenta el paso.
- **Riesgo de commitear `.env` por error.** Si alguien lo agrega al staging y pushea, los secretos quedan en la historia. Mitigación: `.gitignore` lo excluye preventivamente.
- **Riesgo de discrepancia entre `.env` de docker y `application-dev.yml` de Spring.** Si alguien cambia el puerto en `.env` y olvida actualizar el YAML, el backend no conecta. Mitigación: documentación + en la práctica casi nadie cambia el default.

## Anexo — Glosario de términos técnicos

**Puerto (en redes).** Un número que identifica a un servicio dentro de una IP. Cuando un cliente se conecta a una IP, también debe especificar el puerto. Postgres usa 5432 por defecto, HTTP usa 80, HTTPS 443, etc. Pueden coexistir muchos servicios en una misma IP, siempre que usen puertos distintos.

Ejemplo concreto: cuando tu backend hace `jdbc:postgresql://localhost:5467/queueless`, está pidiéndole al SO "conectame a la dirección 127.0.0.1, puerto 5467". El docker-compose se aseguró que el contenedor de Postgres reciba esos packets ahí.

**Mapeo de puertos (en Docker).** Cuando un contenedor Docker expone un puerto al host, hay dos números: el del contenedor (interno) y el del host (externo). Se escribe `"host:contenedor"`. En QueueLess es `"5467:5432"`, que significa "Postgres adentro escucha en 5432, y se expone al host en 5467".

**`.env`.** Convención del ecosistema Docker y de muchos lenguajes (Node, Python). Un archivo de texto con líneas `VARIABLE=valor`. Docker Compose lo lee automáticamente del directorio del `docker-compose.yml`. Se ignora con `.gitignore` porque contiene secretos por dev.

**`.env.example`.** Archivo plantilla que se SÍ commitea al repo. Lista todas las variables que el proyecto soporta, con valores placeholder o defaults sin secretos. Cada developer hace `cp .env.example .env` y completa los valores reales.

**Variable de entorno.** Variable disponible globalmente para los procesos del SO. En Linux/Mac se setean con `export VAR=valor`, en Windows PowerShell con `$env:VAR = "valor"`. Spring Boot las lee automáticamente y pueden usarse para overridear cualquier propiedad del `application.yml`.

**Sintaxis `${VAR:-default}`.** Convención de bash y de Docker Compose. Significa "usá el valor de la variable VAR; si no está definida o está vacía, usá `default`". Lo usamos en `docker-compose.yml`: `${POSTGRES_HOST_PORT:-5467}` se evalúa a 5467 si no hay nada en el `.env`.

**Perfil de Spring (`application-X.yml`).** Spring Boot soporta perfiles, que son configuraciones específicas por ambiente. Si activás el perfil `dev`, Spring carga `application.yml` Y `application-dev.yml`, con el segundo overridando al primero. Los perfiles se activan con `spring.profiles.active=dev` (en YAML, en variables de entorno, o en la línea de comandos).

**Hardcodear.** Poner un valor literal en el código fuente en lugar de leerlo de configuración. Tiene mala fama generalmente pero a veces es lo correcto: hardcodear `localhost:5467` para dev es razonable porque dev siempre es localhost. Hardcodear una URL de producción sería un error.

## Referencias

- `docker-compose.yml` — mapeo de puertos.
- `.env.example` — plantilla de variables.
- `.gitignore` — exclusión de `.env` real.
- `backend/src/main/resources/application.yml` — defaults para todos los ambientes.
- `backend/src/main/resources/application-dev.yml` — overrides para dev (puertos 5467 y 8090).
- `backend/src/main/resources/application-prod.yml` — overrides para prod (variables de entorno).
- README raíz — instrucciones de arranque.
- `backend/README.md` — detalles de configuración del backend.
