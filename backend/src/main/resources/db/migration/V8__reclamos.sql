-- Libro de reclamaciones (ADR-0029)
-- Reclamos de consumidor contra un comercio o contra la plataforma, con su acuse,
-- código de constancia, plazo de respuesta y estado.

CREATE TABLE reclamo (
    id                 BIGSERIAL PRIMARY KEY,
    usuario_id         BIGINT NOT NULL REFERENCES usuario(id),
    tipo               VARCHAR(20) NOT NULL,
    contra             VARCHAR(20) NOT NULL,
    punto_de_venta_id  BIGINT REFERENCES punto_de_venta(id),
    pedido_id          BIGINT REFERENCES pedido(id),
    detalle            TEXT NOT NULL,
    codigo_constancia  VARCHAR(20) NOT NULL UNIQUE,
    estado             VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    respuesta          TEXT,
    respondido_at      TIMESTAMP,
    plazo_respuesta_at TIMESTAMP NOT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_reclamo_tipo   CHECK (tipo IN ('RECLAMO', 'QUEJA')),
    CONSTRAINT chk_reclamo_contra CHECK (contra IN ('COMERCIO', 'PLATAFORMA')),
    CONSTRAINT chk_reclamo_estado CHECK (estado IN ('PENDIENTE', 'RESPONDIDO')),
    -- Un reclamo contra un comercio debe apuntar a un local; uno contra la plataforma no.
    CONSTRAINT chk_reclamo_destino CHECK (
        (contra = 'COMERCIO'   AND punto_de_venta_id IS NOT NULL) OR
        (contra = 'PLATAFORMA' AND punto_de_venta_id IS NULL)
    )
);

CREATE INDEX idx_reclamo_usuario ON reclamo(usuario_id);
CREATE INDEX idx_reclamo_punto_de_venta ON reclamo(punto_de_venta_id);

-- updated_at automático en cada modificación, reusando la función del esquema inicial (V1).
CREATE TRIGGER trg_reclamo_updated_at BEFORE UPDATE ON reclamo
    FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
