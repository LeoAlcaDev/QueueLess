-- =============================================================================
-- Horarios de servicio y ventanas de pedido/recojo por producto.
-- Dos reglas nuevas, ambas opcionales:
--  - Horario de servicio: el producto se vende solo en una franja del dia
--    (ej. desayuno de 07:00 a 10:30), dentro del horario del local.
--  - Ventanas por lote: productos preparados por tanda en horario fijo, con una
--    ventana para pedir y otra para recoger (ej. el almuerzo del dia).
-- El flag tiene_ventana_de_pedido es la fuente de verdad de "producto por lote".
-- Todos los campos quedan en null / false para los productos existentes, asi que
-- ninguno cambia de comportamiento con esta migracion (compatibilidad hacia atras).
--
-- Limitacion conocida: el modelo soporta una sola ventana por producto. Si mas
-- adelante aparece un caso con varias ventanas, se migra a una tabla aparte.
-- Las combinaciones validas (las 4 ventanas obligatorias cuando el flag esta en
-- true, etc.) se validan en el service, no con un check en la base. Modelado y
-- alternativas descartadas en ADR-0012.
-- =============================================================================

ALTER TABLE producto
    ADD COLUMN horario_servicio_inicio TIME,
    ADD COLUMN horario_servicio_fin    TIME,
    ADD COLUMN tiene_ventana_de_pedido BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN ventana_pedido_inicio   TIME,
    ADD COLUMN ventana_pedido_fin      TIME,
    ADD COLUMN ventana_recojo_inicio   TIME,
    ADD COLUMN ventana_recojo_fin      TIME;
