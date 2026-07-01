-- Desactiva los locales "Cafeteria Smoke" que dejó la colección Postman de smoke al correr
-- contra producción: cada corrida registra un comercio descartable (smoke.comercio.<timestamp>)
-- y crea uno de estos locales, varios sin horario. Es un soft-delete (activo = false): salen del
-- catálogo y del detalle público sin borrar la fila ni ningún historial asociado. Es idempotente
-- (reejecutarlo no cambia nada) y si no hay ninguno, por ejemplo en dev, no afecta filas.

UPDATE punto_de_venta SET activo = false WHERE nombre = 'Cafeteria Smoke';
