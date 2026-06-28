# Términos y Condiciones de QueueLess

**Versión vigente: 2026-06-28**

Este documento explica, en lenguaje claro, qué es QueueLess, qué datos te pedimos y
para qué, y qué reglas aceptás al usar la plataforma. Está escrito para que lo entiendas
sin abogado: cada regla viene con su porqué. Es un **documento vivo**: cuando cambie lo
que la plataforma hace, cambia este texto y sube su versión. La versión de arriba es la
misma que el sistema registra cuando aceptás estos términos.

Regla que nos imponemos al escribirlo: **no afirmamos acá nada que el sistema no haga
hoy.** Lo que todavía no existe se marca como "por venir", nunca como si ya estuviera.

## 1. Qué es QueueLess y cuál es su rol

QueueLess es una plataforma que conecta a tres partes dentro del campus: vos (cliente),
los comercios que preparan la comida, y los repartidores que la llevan. Nosotros ponemos
el lugar donde se hace el pedido, se paga y se coordina la entrega; **la comida la prepara
el comercio** y, cuando hay delivery, **la lleva el repartidor**.

Por eso nuestro rol es el de **intermediario**: facilitamos el encuentro entre vos y el
comercio. La calidad, la preparación y la inocuidad de lo que comprás son responsabilidad
del comercio que lo hace; nosotros somos responsables de que la plataforma funcione como
acá se describe.

## 2. Tu cuenta y los datos que guardamos

Guardamos solo los datos que necesitamos para que el servicio funcione, y acá te decimos
cuáles y para qué.

### De tu cuenta

- **Correo electrónico.** Es tu identificador para entrar y la vía por la que te mandamos
  confirmaciones y comprobantes (por ejemplo, el correo de bienvenida y el recibo de un
  pedido entregado).
- **Nombre completo.** Para identificarte en la plataforma y en esos correos.
- **Contraseña.** La guardamos **siempre cifrada con un algoritmo de hash (BCrypt)**.
  Nunca la guardamos en texto plano: ni nosotros podemos leerla. Cuando iniciás sesión,
  comparamos el hash, no la contraseña en sí.

### Si sos cliente

En tu perfil de cliente podés guardar, todo opcional:

- Tu **dirección de entrega preferida**, para no tipearla cada vez.
- Tus **alergias** (en texto libre) y los **alérgenos que evitás** (de una lista cerrada),
  tus **restricciones de dieta** (por ejemplo, vegetariano o vegano), tu **tolerancia al
  picante** y un **presupuesto de referencia**. Sirven para que la plataforma pueda
  ayudarte a filtrar el catálogo según lo que comés y para el asistente de recomendación
  (ver más abajo, "El asistente de recomendación"). Sobre los alérgenos, leé el punto 3,
  que es importante.

### Si sos comercio

- Tu **RUC** y tus **datos de contacto** (teléfono y correo), para identificar al negocio
  y poder comunicarnos con vos, por ejemplo cuando un cliente deja un reclamo en tu contra.

### Si sos repartidor

- Tu **calificación promedio**, tu **disponibilidad** (si estás aceptando entregas) y tu
  cantidad de **entregas realizadas**, para coordinar el reparto y darte tus QueuePoints.

Una misma persona puede tener varios de estos roles a la vez (por ejemplo, ser cliente y
repartidor), y en ese caso guardamos los datos de cada rol que tengas activo.

### El asistente de recomendación y el uso de inteligencia artificial

La plataforma incluye un **asistente que te recomienda platos**. Para armar la
recomendación, le enviamos a un **proveedor de inteligencia artificial externo** —elegido
por nosotros; hoy pensamos usar los modelos de Google— tu **mensaje**, los **platos
candidatos** del catálogo (nombre, precio, descripción y local) y un **resumen de tu
conversación reciente** con el asistente. No le mandamos tu correo, tu contraseña ni tus
datos de pago. La decisión de qué platos son seguros para vos según tus alérgenos y
restricciones la toma la plataforma, no el proveedor de IA.

Una aclaración importante sobre el alcance: **lo que decimos acá describe el tratamiento
en producción.** En la demo de evaluación usamos el nivel gratuito del proveedor (Google
AI Studio), donde los datos enviados **pueden usarse para entrenar sus modelos**; por eso
la demo no necesariamente sigue al pie lo que este documento promete para producción. En
producción no usaríamos un nivel que exponga así los datos de los usuarios. Si cambiamos de
proveedor o de tratamiento, actualizamos estos términos y subimos su versión.

## 3. Sobre los alérgenos (leelo)

Este punto es el más delicado, así que lo decimos sin vueltas:

- **Declarar alérgenos es opcional**, tanto para vos (lo que evitás) como para el comercio
  (lo que su producto contiene).
- **Que un producto no liste un alérgeno NO garantiza que no lo tenga.** Puede que el
  comercio simplemente no lo haya cargado. La ausencia de un dato es ausencia de dato, no
  una promesa de que el producto es seguro.

Por eso, si tenés una alergia seria, no te fíes solo de lo que aparezca o no aparezca en
la app: confirmá siempre con el comercio. La plataforma te ayuda a organizar la
información, pero no reemplaza esa confirmación.

## 4. Pagos

**No guardamos los datos de tu tarjeta.** El pago lo procesa una **pasarela externa**
(MercadoPago), que es quien maneja los datos sensibles del medio de pago en su propia
infraestructura. De nuestro lado solo guardamos el **monto**, el **método** de pago, el
**estado** del pago y una **referencia** que nos da la pasarela para identificar la
transacción y, si corresponde, emitir un reembolso.

## 5. Imágenes

Para las imágenes que muestra la plataforma —como las **fotos de los productos del
menú**— usamos un almacenamiento de archivos: en desarrollo, el disco del servidor; en
producción, un almacenamiento en la nube (Amazon S3) de **lectura pública** (cualquiera
con el enlace puede ver la imagen, porque son justamente las fotos que el catálogo quiere
mostrar; subir o borrar, en cambio, solo puede hacerlo la plataforma).

## 6. Las reglas que aceptás al hacer un pedido

### Pedidos programados

Podés pagar ahora para recoger más tarde. Cuando programás un pedido, **te comprometés al
pagarlo**, porque el comercio cuenta con esa orden para organizarse. A partir de ahí:

- Tenés una **ventana de 30 minutos desde el pago** para arrepentirte: dentro de ese
  rato cancelás con **reembolso completo**, incluso si el comercio ya aceptó.
- **Pasada esa ventana, la cancelación se bloquea**, porque el comercio ya se comprometió a
  prepararlo.
- Si el comercio **no cumple** —nunca acepta tu pedido, o lo acepta y lo abandona—, una
  **red de seguridad te devuelve el dinero automáticamente**, sin que tengas que hacer
  nada.

### Entrega validada por código

Cada pedido tiene un **código de entrega** que solo tenés vos. Al recoger en el local o al
recibir el delivery, mostrás ese código (tecleado o por su QR), y la entrega **solo se
cierra si coincide**. Así nadie puede dar por entregado un pedido que no recibiste: el
código es la prueba de que estuviste ahí.

### QueuePoints

Los **QueuePoints** son puntos **sin valor monetario**: no son dinero, no se compran ni se
cambian por dinero. **Solo el repartidor los gana** (50 por cada entrega completada); como
cliente no ganás QueuePoints. Quien tiene QueuePoints puede **canjearlos como descuento**
en sus propios pedidos.

## 7. Reclamos

Si algo sale mal, tenés un **libro de reclamaciones** dentro de la plataforma. Al
registrar un reclamo recibís de inmediato un **acuse con un código de constancia** y un
**plazo de respuesta**. Un reclamo contra un comercio le llega a ese comercio; uno contra
la plataforma, a nuestro equipo. La respuesta te llega por correo.

## 8. Lo que todavía no hacemos (por venir)

Para ser claros sobre lo que **aún no** es parte de la plataforma:

- **Permisos de cámara y ubicación.** Más adelante, la app del teléfono te pedirá permiso
  para usar la cámara (por ejemplo, para escanear el QR de entrega) y tu ubicación (para el
  reparto). Hoy esos permisos no se piden todavía; cuando se sumen, lo vas a ver al usar la
  app y este documento se actualizará.

## 9. Cambios a estos términos

Este es un documento vivo. Cuando agreguemos o cambiemos algo de lo que la plataforma
hace, actualizamos este texto y **subimos su versión** (la fecha del encabezado). El
sistema registra **qué versión aceptaste y cuándo**, justamente porque el documento cambia
con el tiempo y queremos que quede claro a qué versión dijiste que sí.

---

*QueueLess — Tu almuerzo, sin cola, sin estrés.*
