-- =============================================================================
-- Motivo de cancelacion estructurado del pedido.
-- Antes habia una sola columna de texto libre (razon_cancelacion). Ahora el
-- comercio elige un motivo de una lista corta (motivo_cancelacion) y, si quiere,
-- agrega un detalle. Se renombra la columna vieja a detalle_cancelacion para que
-- quede claro que es el texto libre, y se agrega el motivo estructurado.
-- =============================================================================

ALTER TABLE pedido RENAME COLUMN razon_cancelacion TO detalle_cancelacion;

ALTER TABLE pedido ADD COLUMN motivo_cancelacion VARCHAR(40);

ALTER TABLE pedido ADD CONSTRAINT chk_motivo_cancelacion CHECK (
    motivo_cancelacion IS NULL OR motivo_cancelacion IN (
        'PRODUCTO_AGOTADO',
        'FALTA_INGREDIENTE',
        'FUERA_DE_HORARIO_PRODUCTO',
        'LOCAL_SATURADO',
        'LOCAL_POR_CERRAR',
        'PROBLEMA_OPERATIVO',
        'OTRO'
    )
);

-- Para futuras metricas de cancelacion por motivo.
CREATE INDEX idx_pedido_motivo_cancelacion ON pedido(motivo_cancelacion);
