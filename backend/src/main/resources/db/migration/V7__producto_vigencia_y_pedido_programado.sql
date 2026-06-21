-- Pedidos programados (pagar ahora para recoger después) y disponibilidad por
-- vigencia de fecha. Al producto se le suma el rango de fechas en que se vende y el
-- flag de si acepta programados; al pedido, la hora futura de recojo. Y se amplía el
-- CHECK de motivos de cancelación con los dos que pone la red de seguridad cuando el
-- comercio deja vencer un programado. Todo arranca compatible hacia atrás: vigencia y
-- recojo en null, acepta_programado en true. Modelado en ADR-0026.

ALTER TABLE producto
    ADD COLUMN vigencia_inicio   DATE,
    ADD COLUMN vigencia_fin      DATE,
    ADD COLUMN acepta_programado BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE pedido
    ADD COLUMN recojo_programado_at TIMESTAMP;

-- El motivo lo pone ahora también la red de seguridad, no solo el comercio, así que
-- el CHECK que fijó V4 se reemplaza por uno que admite los dos motivos nuevos.
ALTER TABLE pedido DROP CONSTRAINT chk_motivo_cancelacion;

ALTER TABLE pedido ADD CONSTRAINT chk_motivo_cancelacion CHECK (
    motivo_cancelacion IS NULL OR motivo_cancelacion IN (
        'PRODUCTO_AGOTADO',
        'FALTA_INGREDIENTE',
        'FUERA_DE_HORARIO_PRODUCTO',
        'LOCAL_SATURADO',
        'LOCAL_POR_CERRAR',
        'PROBLEMA_OPERATIVO',
        'OTRO',
        'COMERCIO_NO_ATENDIO',
        'COMERCIO_NO_PREPARO'
    )
);
