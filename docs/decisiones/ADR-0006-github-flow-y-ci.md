# ADR-0006 — Git workflow con GitHub Flow y CI con GitHub Actions

## Contexto

Cualquier proyecto en equipo necesita reglas sobre cómo se integra el código nuevo. ¿Todos pushean a `main`? ¿Hay una rama `develop` permanente? ¿Quién revisa el código antes de mergear? ¿Qué se corre automáticamente para asegurar calidad?

Las opciones van desde "ramificación caótica" hasta "GitFlow clásico con cuatro tipos de ramas permanentes". Para un proyecto académico de 3 semanas con un equipo de 2 personas, tomar la decisión correcta importa más de lo que parece: una convención muy pesada nos roba velocidad, y una sin reglas nos lleva a pisar trabajo del otro.

Este ADR fija las reglas de ramificación y la configuración de CI que usamos.

## Decisión

Adoptamos **GitHub Flow**, no GitFlow clásico. Las reglas son simples:

1. `main` es la única rama permanente. Siempre debe estar desplegable.
2. Cualquier cambio se hace en una **rama corta** que parte de `main`.
3. Cuando el cambio está listo, se abre un **Pull Request** contra `main`.
4. La CI corre automáticamente. Si está roja, no se mergea.
5. Una vez verde, se mergea con "Create a merge commit" o "Squash and merge" según el caso.
6. La rama se borra después del merge.

**No hay rama `develop`. No hay rama `release`. No hay rama `hotfix`.** Para el contexto del proyecto, esas ramas son ruido.

## Convención de nombres de ramas

Las ramas tienen un prefijo que indica el tipo de cambio, seguido de una descripción corta en kebab-case:

```
<prefijo>/<descripcion-corta-en-kebab-case>
```

Los prefijos son:

| Prefijo | Para qué |
|---|---|
| `feat/` | Funcionalidad nueva |
| `fix/` | Corrección de bug |
| `chore/` | Cambios no funcionales (configs, deps, infra) |
| `refactor/` | Reorganizar código sin cambiar comportamiento externo |
| `docs/` | Solo documentación (incluyendo ADRs) |
| `test/` | Solo cambios en tests |

Ejemplos reales de nuestro repo:

- `chore/setup-entorno-dev` (rama del primer PR, que incluyó 7 commits de setup).
- `feat/auth-register-perfiles` (cuando implementemos la creación automática de perfiles).
- `docs/adr-modelo-entidades` (cuando se commiteen los ADRs).

## Convención de mensajes de commit (Conventional Commits)

Los commits siguen el formato Conventional Commits:

```
<tipo>(<ámbito opcional>): <descripción corta en imperativo, presente>

<cuerpo opcional con más detalle>

<footer opcional con referencias>
```

Los tipos son los mismos que los prefijos de ramas (`feat`, `fix`, `chore`, `refactor`, `docs`, `test`), más `style` (formato de código) y `perf` (mejora de performance).

Reglas adicionales:

- La línea 1 tiene máximo 72 caracteres.
- Verbo en imperativo presente: "agrega" no "agregado", "corrige" no "corregido".
- El cuerpo se separa del título por una línea en blanco.

Ejemplos de nuestro historial:

```
fix(pedido): corrige la tabla de transiciones de EstadoPedido

EstadoPedido tiene 11 estados, pero el mapa TRANSICIONES se construía con
Map.of(...), cuya sobrecarga máxima admite 10 pares clave-valor. Con 11
entradas no hay método aplicable y el módulo no compilaba.

Se reemplaza por Map.ofEntries(entry(...)), que admite cualquier número
de entradas.
```

## Flujo de trabajo paso a paso

El flujo típico para incorporar un cambio nuevo es:

```bash
# 1. Sincronizar main local con remoto
git checkout main
git pull origin main

# 2. Crear rama feature
git checkout -b feat/auth-register-perfiles

# 3. Trabajar, commiteando frecuentemente con mensajes descriptivos
git add .
git commit -m "feat(auth): crea perfiles automáticamente al registrar usuario"

# 4. Pushear la rama
git push -u origin feat/auth-register-perfiles

# 5. Abrir PR en GitHub vía la UI

# 6. Esperar que la CI pase

# 7. Mergear desde la UI (Create a merge commit o Squash, según el caso)

# 8. Borrar la rama local y remota
git checkout main
git pull origin main
git branch -d feat/auth-register-perfiles
```

## GitHub Actions

La CI vive en `.github/workflows/backend-ci.yml`. Se dispara automáticamente en:

- Cada `push` a `main`.
- Cada `pull_request` apuntando a `main`.
- Solo si los cambios tocan `backend/**` o el archivo del workflow mismo (filtro `paths:`).

Lo que hace el workflow:

1. Checkout del código (`actions/checkout@v4`).
2. Setup de Java 21 Temurin (`actions/setup-java@v3`) con caché de Maven.
3. Levanta un Postgres efímero como service container (innecesario para los tests actuales, pero útil cuando agreguemos integration tests que no usen TestContainers).
4. Corre `./mvnw -B clean verify --file pom.xml` desde `backend/`.

Si `mvn verify` retorna error (compilación, tests fallando, formato malo), el workflow marca el commit con un check rojo. La rama protegida `main` no permite mergear con checks rojos.

## Branch protection en `main`

Configuramos en GitHub Settings → Branches estas reglas para `main`:

- **Require status checks to pass before merging**: el job `build-and-test` debe estar verde.
- **Require branches to be up to date before merging**: hay que pullear antes de mergear.
- **Do not allow bypassing the above settings**: ni los admins pueden saltárselas.

**NO requerimos** approving review por compañero. La razón es pragmática: somos equipo de 2 con plazo corto. Esperar review obligatoria de Enrique para cada PR pequeño nos rompe el ritmo. La CI verde es la garantía de calidad mínima; las reviews entre compañeros las hacemos manualmente cuando el cambio es relevante.

Esta decisión es revisable: si en algún punto detectamos bugs que una review hubiera atrapado, agregamos approving review obligatoria.

## Estrategia de merge

GitHub ofrece tres formas de mergear un PR:

- **Create a merge commit.** Trae todos los commits de la rama a `main`, y agrega un commit extra "Merge pull request #N". Preserva la historia granular.
- **Squash and merge.** Combina todos los commits del PR en uno solo al entrar a `main`. Historia limpia, sin granularidad.
- **Rebase and merge.** Aplica los commits sobre `main` sin merge commit. Historia lineal pero granular.

Nuestra política:

- **Para PRs grandes con commits atómicos bien escritos**: usar "Create a merge commit". Preserva el trabajo y muestra la unidad lógica del PR.
- **Para PRs chicos con muchos commits experimentales (típicamente WIPs)**: usar "Squash and merge". Limpia el ruido.

El primer PR del proyecto (`chore/setup-entorno-dev` con 7 commits) entró con "Create a merge commit" porque cada commit cuenta una parte de la historia del setup.

## Alternativas consideradas

### Alternativa 1 — GitFlow clásico (Vincent Driessen, 2010)

Mantener ramas permanentes `main` y `develop`, y crear feature branches que mergean a `develop`, releases que estabilizan código en una rama `release/`, hotfixes que parchean prod desde una rama `hotfix/`.

Descartado porque:

- Demasiado complejo para 2 personas y 3 semanas.
- Requiere mantener dos ramas sincronizadas (`main` y `develop`), con merges entre ambas en cada release.
- Aporta valor en proyectos con release cycles largos (cada 2-3 meses). El nuestro tiene release continuo (mergeamos a `main` y eso es la última versión).

### Alternativa 2 — Trunk-based development

Todos pushean directo a `main`, sin feature branches. Funciona en empresas como Google y Facebook gracias a infraestructura de CI/CD muy madura, feature flags, y disciplina extrema.

Descartado porque:

- Sin feature flags, código no terminado quedaría visible en `main`.
- Sin review formal, errores grandes llegarían a `main` sin filtro.
- No es lo que enseña el curso CS2031.

### Alternativa 3 — Sin convención (caos)

Cualquiera nombra ramas como quiera, commitea como quiera, mergea cuando quiera.

Descartado obviamente porque a las dos semanas nadie entiende qué está en qué rama.

## Consecuencias

### Positivas

- **Onboarding fácil.** Cualquiera que conozca Git entiende el flujo en 5 minutos.
- **Historia legible.** Los nombres de rama y los commits dan contexto sin abrir el código.
- **CI bloquea regresiones.** Imposible mergear código roto.
- **Iteración rápida.** Sin ramas permanentes extra, el ciclo "rama → PR → merge → borrar" es mecánico.
- **Compatible con expectativas del curso.** El CS2031 enseña este patrón en Semana 4.

### Negativas

- **Sin approving review obligatoria, errores pueden colarse.** Mitigado parcialmente por la CI y por reviews informales entre compañeros.
- **Conflictos de merge cuando varias ramas tocan los mismos archivos.** Mitigado por feature branches cortas (1-3 días de vida).

### Riesgos

- **Riesgo de que la CI se rompa por razones de entorno (no del código).** Por ejemplo, GitHub Actions tiene un día malo, o un mirror de Maven Central se cae. Mitigación: caché de dependencias en el workflow, y reintentos manuales (`Re-run jobs` en la UI).
- **Riesgo de mezclar tipos de cambio en una rama.** Si una rama `feat/X` también incluye un fix no relacionado, el PR se vuelve confuso. Mitigación: convención de "una rama, una intención"; si descubrimos un bug mientras trabajamos en una feature, hacemos un PR separado para el fix.

## Anexo — Glosario de términos técnicos

**GitHub Flow.** Modelo de ramificación donde solo hay una rama permanente (`main`), siempre desplegable, y todo cambio entra vía feature branches cortas que mergean por Pull Request. Lo popularizó GitHub en 2011 como alternativa simple al GitFlow clásico.

**GitFlow.** Modelo de ramificación con dos ramas permanentes (`main` y `develop`) y varios tipos de ramas temporales (`feature/`, `release/`, `hotfix/`). Más complejo, útil para proyectos con releases periódicas y muchas personas trabajando en paralelo. Lo describió Vincent Driessen en 2010.

**Pull Request (PR).** Solicitud para mergear los cambios de una rama hacia otra (típicamente hacia `main`). En GitHub, el PR es una vista web donde ves el diff completo, los comentarios, los checks de CI, y desde donde mergeás. El nombre viene de "por favor, traé estos cambios a tu rama".

**Conventional Commits.** Convención para escribir mensajes de commit con un formato fijo (`tipo(ámbito): descripción`). Sirve para que herramientas automáticas (generadores de changelog, versionado semántico) puedan parsear la historia. También hace los commits más legibles para humanos.

Ejemplo concreto del proyecto: el commit `fix(pedido): corrige la tabla de transiciones de EstadoPedido` se parsea como `tipo=fix`, `ámbito=pedido`, `descripción=corrige la tabla de transiciones de EstadoPedido`. Cualquiera que lo lea entiende inmediatamente qué tipo de cambio es y a qué módulo afecta.

**CI (Continuous Integration).** Práctica de integrar cambios al código base frecuentemente (varias veces al día), corriendo tests automáticamente en cada integración para detectar problemas rápido. Lo opuesto a "subir todo al final y ver si funciona".

**Branch protection rule.** Configuración en GitHub que restringe qué se puede hacer con una rama específica. Por ejemplo, "nadie puede pushear directo a `main`", "los PRs requieren CI verde", "los admins no pueden saltarse las reglas". Es la defensa principal contra accidentes en la rama principal.

**Merge commit.** Commit especial que une dos ramas. Tiene dos padres en lugar de uno (los últimos commits de cada rama). Lo crea Git automáticamente cuando hacemos `git merge` con una rama no fast-forward, o cuando elegimos "Create a merge commit" en GitHub.

**Squash and merge.** Estrategia donde los N commits de la feature branch se combinan en un solo commit al entrar a `main`. Útil cuando los commits intermedios son ruido ("WIP", "fix typo", "más cambios"). Sacrifica granularidad por limpieza.

**Status check.** Verificación automática que GitHub asocia a un commit. La CI publica status checks (verdes si pasa, rojos si falla). Las branch protection rules pueden requerir que ciertos status checks estén verdes antes de permitir mergear.

**Service container (en GitHub Actions).** Contenedor Docker que GitHub levanta junto al runner del workflow, expuesto en `localhost` para que los pasos del workflow puedan usarlo. Lo usamos para tener un Postgres disponible durante la CI (aunque hoy los tests usan TestContainers, no este service).

**Workflow trigger.** Evento que dispara la ejecución de un workflow de GitHub Actions. Los más comunes son `push`, `pull_request`, `schedule` (cron) y `workflow_dispatch` (manual). Cada workflow define en qué eventos quiere correr.

## Referencias

- `.github/workflows/backend-ci.yml` — definición del workflow de CI.
- README raíz — sección de cronograma y flujo de trabajo.
- Curso CS2031 Sem. 4 — JUnit, TestContainers, GitHub Actions.
- Documentación oficial de GitHub Actions: https://docs.github.com/actions
- Especificación Conventional Commits: https://www.conventionalcommits.org/
