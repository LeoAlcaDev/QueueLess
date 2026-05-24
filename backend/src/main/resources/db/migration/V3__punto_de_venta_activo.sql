-- =============================================================================
-- Soft delete de puntos de venta.
-- "activo" marca si el local existe en el sistema. Cuando un comercio elimina un
-- local, esto pasa a FALSE y el local desaparece de todos los listados, pero la
-- fila se conserva para no romper los pedidos historicos que la referencian.
-- Es distinto de "abierto", que es el toggle diario de atencion.
-- =============================================================================

ALTER TABLE punto_de_venta
    ADD COLUMN activo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_punto_de_venta_activo ON punto_de_venta(activo);
