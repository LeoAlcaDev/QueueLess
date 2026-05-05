# ADR-0001: Estructura de paquetes feature-first

**Estado:** Aceptada
**Fecha:** 2026-05-04

## Contexto

QueueLess tiene 12 entidades JPA y 7 operaciones asíncronas que cruzan múltiples
contextos de negocio. El curso CS2031 (Sem. 1-3) muestra una organización por
capa (`controller/`, `service/`, `repository/`, `entity/`, `dto/`), que funciona
bien con 1-3 entidades pero se vuelve difícil de mantener con más.

## Decisión

Adoptamos una estructura **feature-first** (también llamada *package-by-feature*):
cada módulo de negocio es un paquete top-level (`pedido/`, `pago/`, `delivery/`,
etc.) y dentro de cada uno mantenemos las sub-carpetas que el curso enseña
(`controller/`, `service/`, `repository/`, `entity/`, `dto/`).

```
pe.edu.utec.queueless.pedido/
├── controller/
├── service/
├── repository/
├── entity/
└── dto/
```

## Consecuencias

**Positivas:**

- El profesor sigue reconociendo el patrón del curso al abrir cualquier módulo.
- Dos integrantes pueden trabajar en módulos distintos en paralelo sin merge
  conflicts.
- Cohesión: todo lo relacionado con un concepto vive junto.
- Acoplamiento entre módulos se vuelve visible (los imports cruzados se sienten
  feos cuando los hay).

**Negativas:**

- Más carpetas que en una estructura plana — pero también menos archivos por
  carpeta, por lo que la navegación en el IDE no se complica.
- Algunos módulos quedan más pequeños que otros (ej. `queuepoints/` solo tiene
  una entidad). Lo aceptamos.

## Alternativas consideradas

- **Por capa** (`controller/`, `service/`, etc. al top-level): rechazada por no
  escalar a 12 entidades.
- **Hexagonal / Clean Architecture estricta** (puertos, adaptadores, casos de
  uso): rechazada por sobre-ingeniería para un MVP académico de 3 semanas.

## Referencias

- "Package by feature, not layer" — Robert C. Martin
- Sílabo CS2031 2026-1
