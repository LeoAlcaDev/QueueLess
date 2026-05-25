# ADR-0017 — Almacenamiento de archivos: disco local en dev, S3 en producción

## Contexto

QueueLess guarda imágenes: las fotos de los productos del menú y los avatares de
los usuarios. En desarrollo conviene guardarlas en el disco de la máquina, sin
depender de ningún servicio externo. En producción no podemos hacer eso: el
backend corre en una plataforma de hosting donde el disco es efímero (se borra en
cada redeploy) y donde eventualmente puede haber más de una instancia, así que las
imágenes tienen que vivir en un almacenamiento compartido y persistente. Para eso
usamos Amazon S3.

Al arrancar la Fase 6, el módulo `shared/storage/` ya tenía la estructura puesta:

- `StorageService` es la interfaz con dos métodos: `upload(folder, file)` (sube un
  archivo y devuelve su URL pública) y `delete(url)` (lo borra).
- `LocalStorageService` ya está implementado y funcional: guarda en disco y
  devuelve URLs `/uploads/...`.
- `S3StorageService` existe como esqueleto: hoy sus dos métodos lanzan
  `UnsupportedOperationException`. Implementarlo es el trabajo que cierra esta fase.

La configuración ya reserva las claves bajo `queueless.storage`: `impl` (que vale
`local` por defecto y `s3` en producción), `local-base-path` (`./uploads`), y la
sección `s3` con `region` (por defecto `us-east-1`) y `bucket`. El tamaño máximo
de archivo ya está topado en `2MB` en la configuración de multipart.

Este ADR fija cómo funciona la implementación de S3, cómo se construyen y se
borran las URLs, qué política de acceso tiene el bucket, y por qué elegimos S3
entre los proveedores posibles. No redocumentamos el patrón de interfaz con
implementaciones intercambiables: ya está en el ADR-0013 (gateway de pagos). Acá
lo aplicamos y lo citamos.

## Decisión

### Una interfaz, dos implementaciones intercambiables

`StorageService` tiene dos implementaciones que se eligen con
`@ConditionalOnProperty(name = "queueless.storage.impl")`: `LocalStorageService`
se carga cuando la propiedad vale `local` (o si no está configurada, como red de
seguridad), y `S3StorageService` cuando vale `s3`. Es el mismo patrón de "una
interfaz, varias implementaciones, una propiedad elige cuál" que el gateway de
pagos del ADR-0013. En dev y test la propiedad es `local`; en producción es `s3`.

### `LocalStorageService` (ya implementado)

Guarda cada archivo bajo `{queueless.storage.local-base-path}/{carpeta}/{uuid}.{ext}`
(la base por defecto es `./uploads`) y devuelve una URL del estilo
`/uploads/{carpeta}/{uuid}.{ext}`. Esa URL la sirve `WebMvcConfig` como recurso
estático, de modo que el navegador o la app pueden pedirla directo. Lo
documentamos como lo que ya existe; el trabajo de esta fase es la otra
implementación.

### `S3StorageService` (nuevo): subida con `S3Client`

La implementación productiva usa `S3Client`, el cliente del AWS SDK v2 (ver
glosario) que ya está en el `pom.xml`. Al subir un archivo:

- Lo guarda en el bucket configurado en `queueless.storage.s3.bucket` con una
  *key* (ver glosario) de la forma `{carpeta}/{uuid}.{ext}`. Por ejemplo,
  `productos/3f2a....webp`.
- Le pone el `Content-Type` correcto según la extensión (ver glosario):
  `image/jpeg` para `jpg`/`jpeg`, `image/png` para `png`, `image/webp` para
  `webp`. Sin el `Content-Type` correcto, el navegador podría no mostrar la imagen
  o descargarla en vez de renderizarla.

### URL pública con formato estándar de S3

La URL pública que `upload` devuelve se arma a mano con el formato estándar de S3:

```
https://{bucket}.s3.{region}.amazonaws.com/{key}
```

Por ejemplo, `https://queueless-prod.s3.us-east-1.amazonaws.com/productos/3f2a....webp`.
Se construye con el bucket y la región que ya están en configuración
(`queueless.storage.s3.bucket` y `queueless.storage.s3.region`). No usamos un
endpoint personalizado ni una URL firmada: es la dirección pública directa del
objeto.

### Política de acceso: bucket de lectura pública, escritura privada

El bucket es de **lectura pública y escritura privada**. Cualquiera que tenga la
URL puede ver el archivo, porque las imágenes que guardamos (fotos del menú,
avatares) no son información sensible: son justamente lo que queremos mostrar.
Escribir, en cambio, es privado: solo el backend puede subir o borrar, usando sus
credenciales de AWS.

Esas credenciales de escritura (`AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`) no
van en `application.yml`. El SDK de AWS las toma de las variables de entorno del
servidor a través de su cadena de proveedores de credenciales por defecto. Así las
llaves viven solo en el entorno del servidor de producción, nunca en el código ni
en la configuración versionada. (La convención de variables de entorno está en el
ADR-0010.)

### Extensiones permitidas y tamaño máximo

Las extensiones permitidas son las mismas que en local: `jpg`, `jpeg`, `png`,
`webp`. El tamaño máximo por archivo es 2MB, topado en la configuración de
multipart de Spring (`spring.servlet.multipart.max-file-size`). Mantener las
mismas reglas en local y en S3 evita que un archivo que se acepta en dev sea
rechazado en prod o al revés.

### Carpetas lógicas por tipo de imagen

El primer parámetro de `upload(folder, file)` es una carpeta lógica: un nombre como
`productos` o `avatares` que agrupa las imágenes por su uso. Ese nombre lo decide
quien llama (el service de productos sube a `productos`, el de usuarios a
`avatares`), no la implementación de almacenamiento. Cada implementación lo
materializa a su manera, pero el contrato es el mismo:

- En local, la carpeta es un subdirectorio real bajo la base: `./uploads/productos/`.
- En S3, la carpeta es el prefijo de la key: `productos/3f2a....webp`.

Mantener el mismo concepto de "carpeta" en las dos implementaciones permite que el
código que sube imágenes sea idéntico en dev y en producción: pide subir a
`productos` y recibe una URL, sin saber si por detrás fue disco o S3. Si en el
futuro hace falta un tipo de imagen nuevo (por ejemplo, `comprobantes`), es una
carpeta lógica más, sin cambios en `StorageService` ni en sus implementaciones.

### Nombre por UUID, se pierde el nombre original

Cada archivo se renombra a `{uuid}.{ext}`, generando un identificador único. El
nombre original que mandó el cliente se descarta a propósito. En QueueLess el
nombre original no aporta nada: las imágenes se identifican por la URL guardada en
la base, no por cómo se llamaba el archivo en la computadora del usuario.
Descartarlo además simplifica (no hay que sanitizar nombres raros, espacios, ni
evitar choques entre dos archivos que se llamaban igual).

### Borrado robusto: la key se extrae parseando la URL

`delete(url)` necesita la key del objeto para pedirle a S3 que lo borre. La extrae
parseando la URL con `URI`, que es más robusto que cortar la cadena con una
expresión regular (maneja bien las barras, el host y el path sin suposiciones
frágiles). Con la key, llama a `S3Client.deleteObject(...)`.

Si el archivo no existe, S3 responde OK igual, sin error. Esto es lo correcto:
borrar algo que ya no está no es un fallo. El método no se rompe ni lanza
excepción por intentar borrar una imagen que alguien ya borró.

### Fallar al arrancar lo resuelve el propio SDK

Si la implementación de S3 está activa (`STORAGE_IMPL=s3`) pero falta el bucket o
las credenciales, no agregamos una validación propia en un método de arranque. El
`S3Client` ya falla con un error claro al construirse o en el primer pedido, y ese
error es suficientemente accionable. Agregar nuestra propia verificación sería
duplicar lo que el SDK ya hace bien.

Esto contrasta a propósito con la decisión del adapter de notificaciones
(ADR-0016), que sí valida y corta el arranque a mano. La diferencia es que allá la
alternativa al fallo explícito era caer en silencio a un modo degradado, invisible
para el operador; acá no hay modo degradado silencioso: si S3 está mal
configurado, el SDK grita con un mensaje claro por sí solo. Donde el silencio es el
riesgo, validamos; donde el propio componente ya falla con claridad, no duplicamos.

### Costos esperados

El bucket es S3 estándar en la región `us-east-1` por defecto. El volumen esperado
(cientos de fotos de productos, de hasta 2MB cada una) entra en la capa gratuita de
AWS (ver glosario) o cuesta menos de un dólar al mes. Lo dejamos como contexto para
que el almacenamiento no se perciba como un costo a vigilar en esta etapa.

## Por qué S3 y no Cloudflare R2, Google Cloud Storage o Backblaze B2

Hay varios proveedores de almacenamiento de objetos viables, y los evaluamos:

- **Amazon S3** es el estándar de hecho del rubro. Su SDK de Java es maduro y está
  bien documentado, las credenciales son simples de generar, y AWS ofrece una capa
  gratuita de 12 meses que cubre de sobra el almacenamiento mínimo que vamos a
  usar.
- **Cloudflare R2** es atractivo porque no cobra por el tráfico de salida (egreso),
  algo que a escala importa. Pero usa un cliente distinto que habría que aprender.
- **Google Cloud Storage** y **Backblaze B2** son igualmente válidos, pero cada uno
  trae su propio SDK y su propia curva.

Elegimos S3 por una razón concreta para un proyecto académico: es la opción
estándar y reconocida que el evaluador del curso identifica de inmediato, su SDK ya
está en el `pom.xml`, y el resto del stack del proyecto apunta a AWS (el deploy
futuro contempla RDS y ECS). Aprender un cliente nuevo de otro proveedor no
aportaría valor en esta etapa. Si en el futuro el costo de egreso pesara, R2 sería
el candidato a evaluar, y como toda la integración vive detrás de `StorageService`,
cambiar de proveedor es escribir una implementación nueva de la interfaz, sin tocar
el resto del sistema.

## Alternativas consideradas

### Alternativa 1 — Bucket privado con URLs pre-firmadas

En vez de un bucket de lectura pública, tener el bucket privado y generar una URL
pre-firmada (ver glosario) con expiración cada vez que el frontend necesita ver una
imagen.

Descartada para el MVP. Es más segura, pero exige regenerar la URL cada vez que el
cliente la consume (o cachearla con un tiempo de vida y manejar su vencimiento), lo
que agrega complejidad a la app móvil. Y la información que subimos es
deliberadamente pública: el catálogo de un comercio está para que todos lo vean. El
día que QueueLess guarde contenido sensible (documentos de identidad, comprobantes),
agregamos un segundo bucket privado con URLs pre-firmadas solo para eso, sin tocar
el bucket público de catálogo.

### Alternativa 2 — Otro proveedor de almacenamiento (R2, GCS, B2)

Descartada por la razón de la sección anterior: para un proyecto académico, S3 es
la opción estándar, con el SDK ya incluido y coherente con el resto del stack AWS.

### Alternativa 3 — Validar bucket y credenciales en un método de arranque propio

Agregar una verificación nuestra que corte el arranque si falta el bucket.
Descartada porque el `S3Client` ya falla con un error claro por su cuenta;
duplicar esa verificación no aporta y suma código que mantener.

### Alternativa 4 — Conservar el nombre original del archivo

Guardar el archivo con el nombre que mandó el cliente. Descartada porque obliga a
sanitizar nombres (espacios, caracteres raros, choques entre archivos homónimos) a
cambio de un nombre que no usamos para nada: las imágenes se referencian por su URL
en la base. El UUID es más simple y sin sorpresas.

## Consecuencias

### Positivas

- **Imágenes persistentes en producción.** Sobreviven a los redeploys y son
  visibles desde cualquier instancia del backend, porque viven en S3 y no en el
  disco efímero del servidor.
- **Dev sin dependencias externas.** En local, `LocalStorageService` guarda en
  disco; nadie necesita una cuenta de AWS para levantar el proyecto.
- **Cambio de proveedor barato.** Toda la integración está detrás de
  `StorageService`; migrar a otro proveedor es una implementación nueva de la
  interfaz.
- **Sin secretos en el repo.** Las credenciales de escritura viven solo en las
  variables de entorno del servidor.
- **Costo despreciable.** El volumen esperado cae en la capa gratuita o cerca.

### Negativas

- **Acoplamiento al formato de URL de S3.** Construimos la URL pública a mano con
  el patrón `https://{bucket}.s3.{region}.amazonaws.com/{key}`. Si AWS cambiara ese
  formato (improbable, es estándar desde hace años) habría que ajustarlo.
  Mitigación: está contenido en una sola clase.
- **Lectura pública sin control de acceso.** Cualquiera con la URL ve la imagen.
  Mitigación: es deliberado; el contenido es público por naturaleza. El contenido
  sensible, si aparece, iría a un bucket privado aparte.
- **Dos comportamientos distintos entre dev y prod.** Local devuelve `/uploads/...`
  y S3 devuelve una URL absoluta de AWS. Mitigación: ambas cumplen el mismo
  contrato de `StorageService`; el resto del código solo ve "una URL".

### Riesgos

- **Credenciales de AWS filtradas.** Permitirían subir o borrar objetos del bucket.
  Mitigación: viven solo en variables de entorno del servidor, nunca en el código
  ni en `.env.example`; se rotan desde la consola de AWS si se filtran.
- **Bucket mal configurado (lectura no pública) deja las imágenes invisibles.** El
  catálogo cargaría sin fotos. Mitigación: la configuración de acceso del bucket es
  parte del checklist de despliegue; se verifica al hacer el primer deploy.
- **Borrado que apunta a una key mal parseada.** Si una URL viniera con un formato
  inesperado, la key extraída podría ser incorrecta. Mitigación: usar `URI` para
  parsear es más robusto que recortar a mano, y borrar una key inexistente no rompe
  nada (S3 responde OK).

## Anexo — Glosario de términos técnicos

**S3 bucket.** Un "bucket" (balde) es el contenedor de nivel superior donde S3
guarda archivos. Cada bucket tiene un nombre único en todo AWS y vive en una
región. Los archivos (objetos) van adentro.

Ejemplo concreto del proyecto: QueueLess tiene un bucket (por ejemplo,
`queueless-prod`) donde se guardan todas las fotos de productos y avatares.

**AWS region.** La región geográfica donde AWS aloja físicamente el bucket
(por ejemplo, `us-east-1` es Virginia, EE.UU.). Afecta latencia y, a veces, costo.

Ejemplo concreto: QueueLess usa `us-east-1` por defecto, configurable con la
variable `AWS_REGION`. La región aparece en la URL pública de cada imagen.

**ACL (Access Control List).** Lista que define quién puede hacer qué sobre un
recurso. En S3 controla quién puede leer y quién puede escribir cada objeto o
bucket.

Ejemplo concreto: el bucket de QueueLess tiene una política de lectura pública
(cualquiera puede ver las imágenes) y escritura privada (solo el backend, con sus
credenciales, puede subir o borrar).

**URL pre-firmada (presigned URL).** URL temporal que da acceso a un objeto privado
de S3 por un tiempo limitado, sin necesidad de credenciales. La genera el servidor
firmándola con su clave; cuando expira, deja de funcionar.

Ejemplo concreto: QueueLess NO las usa hoy porque su contenido es público. Si en el
futuro guardáramos un comprobante privado, generaríamos una URL pre-firmada que
expire en, digamos, cinco minutos, para que solo el dueño pueda verlo.

**AWS SDK v2.** La versión 2 del kit de desarrollo de AWS para Java, con clases
como `S3Client` que envuelven las operaciones de S3 (subir, borrar, listar) sin que
tengamos que armar las peticiones HTTP a mano.

Ejemplo concreto: `S3StorageService` usa `S3Client.putObject(...)` para subir y
`S3Client.deleteObject(...)` para borrar. La dependencia ya está en el `pom.xml`.

**Content-Type.** Etiqueta que dice de qué tipo es un archivo (por ejemplo,
`image/png`), para que el navegador sepa cómo tratarlo (mostrarlo como imagen en
vez de ofrecerlo para descargar).

Ejemplo concreto: al subir una foto `.webp`, QueueLess le pone `Content-Type:
image/webp`, así la app la renderiza directo.

**Key (en S3).** El identificador de un objeto dentro de un bucket; funciona como
su "ruta". Aunque S3 no tiene carpetas reales, las barras en la key simulan una
jerarquía.

Ejemplo concreto: la key `productos/3f2a....webp` ubica la foto de un producto
dentro del bucket. La URL pública es el host del bucket más la key.

**Objeto (en S3).** Cada archivo guardado en S3 es un "objeto": el contenido más
sus metadatos (entre ellos, el `Content-Type`). Es la unidad que se sube, se lee y
se borra.

Ejemplo concreto: cada foto de producto de QueueLess es un objeto en el bucket,
identificado por su key.

**Capa gratuita de AWS (free tier).** Nivel de uso sin costo que AWS ofrece, en
parte por 12 meses para cuentas nuevas. Para S3 incluye una cantidad de
almacenamiento y de peticiones mensuales.

Ejemplo concreto: el volumen de QueueLess (cientos de fotos de hasta 2MB) entra en
la capa gratuita o cuesta menos de un dólar al mes.

## Referencias

- ADR-0001 — Estructura feature-first (ubica `StorageService` y sus implementaciones en `shared/storage/`).
- ADR-0013 — Integración con pasarela de pagos (mismo patrón de interfaz con implementaciones intercambiables por `@ConditionalOnProperty`).
- ADR-0010 — Postgres puerto y env (de dónde salen `AWS_S3_BUCKET`, `AWS_REGION` y las credenciales de AWS).
- ADR-0016 — Notificaciones push (contraste de criterio sobre cuándo validar al arranque y cuándo dejar que el componente falle solo).
- `backend/src/main/java/pe/edu/utec/queueless/shared/storage/StorageService.java` — la interfaz.
- `backend/src/main/java/pe/edu/utec/queueless/shared/storage/LocalStorageService.java` — implementación de disco (dev/test).
- `backend/src/main/java/pe/edu/utec/queueless/shared/storage/S3StorageService.java` — implementación de S3 (producción).
- `backend/src/main/java/pe/edu/utec/queueless/config/WebMvcConfig.java` — sirve las URLs `/uploads/...` como recursos estáticos en local.
- `backend/src/main/resources/application.yml` — sección `queueless.storage` (`impl`, `local-base-path`, `s3.region`, `s3.bucket`) y `spring.servlet.multipart.max-file-size`.
