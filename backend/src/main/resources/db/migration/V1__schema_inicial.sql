-- =============================================================================
-- QueueLess — Schema inicial (V1)
-- Crea todas las tablas, índices, FKs y catálogos del sistema.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- USUARIO + ROLES (multi-rol)
-- -----------------------------------------------------------------------------
CREATE TABLE usuario (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usuario_email ON usuario(email);

-- Rol es un enum (CLIENTE, COMERCIO, REPARTIDOR) almacenado como string.
-- Se modela con @ElementCollection en JPA -> tabla de unión simple.
CREATE TABLE usuario_roles (
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    rol        VARCHAR(20) NOT NULL,
    PRIMARY KEY (usuario_id, rol),
    CONSTRAINT chk_rol CHECK (rol IN ('CLIENTE', 'COMERCIO', 'REPARTIDOR'))
);

CREATE INDEX idx_usuario_roles_rol ON usuario_roles(rol);

-- -----------------------------------------------------------------------------
-- PERFILES (uno por rol; relación 1:0..1 con Usuario)
-- -----------------------------------------------------------------------------
CREATE TABLE perfil_cliente (
    usuario_id          BIGINT PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
    direccion_preferida VARCHAR(200),
    alergias            TEXT,
    total_pedidos       INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE perfil_comercio (
    usuario_id        BIGINT PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
    ruc               VARCHAR(11),
    contacto_telefono VARCHAR(20),
    contacto_email    VARCHAR(150),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE perfil_repartidor (
    usuario_id           BIGINT PRIMARY KEY REFERENCES usuario(id) ON DELETE CASCADE,
    medio_transporte     VARCHAR(30),
    calificacion_promedio NUMERIC(3,2),
    total_entregas       INTEGER NOT NULL DEFAULT 0,
    disponible           BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- PUNTO DE VENTA + PRODUCTO
-- -----------------------------------------------------------------------------
CREATE TABLE punto_de_venta (
    id                          BIGSERIAL PRIMARY KEY,
    nombre                      VARCHAR(120) NOT NULL,
    ubicacion                   VARCHAR(200) NOT NULL,
    horario_apertura            TIME,
    horario_cierre              TIME,
    tiempo_promedio_declarado   INTEGER NOT NULL DEFAULT 10,
    abierto                     BOOLEAN NOT NULL DEFAULT TRUE,
    gestor_usuario_id           BIGINT NOT NULL REFERENCES usuario(id),
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_punto_de_venta_gestor ON punto_de_venta(gestor_usuario_id);

CREATE TABLE producto (
    id                  BIGSERIAL PRIMARY KEY,
    punto_de_venta_id   BIGINT NOT NULL REFERENCES punto_de_venta(id) ON DELETE CASCADE,
    nombre              VARCHAR(120) NOT NULL,
    descripcion         TEXT,
    precio              NUMERIC(8,2) NOT NULL,
    foto_url            VARCHAR(500),
    categoria           VARCHAR(50),
    tipo_preparacion    VARCHAR(20) NOT NULL,
    disponible          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_preparacion CHECK (tipo_preparacion IN ('PREPARADO', 'INSTANTANEO')),
    CONSTRAINT chk_precio_positivo  CHECK (precio >= 0)
);

CREATE INDEX idx_producto_punto_de_venta ON producto(punto_de_venta_id);
CREATE INDEX idx_producto_disponible ON producto(disponible);

-- -----------------------------------------------------------------------------
-- PEDIDO + ITEM_PEDIDO + máquina de estados
-- -----------------------------------------------------------------------------
CREATE TABLE pedido (
    id                  BIGSERIAL PRIMARY KEY,
    codigo              VARCHAR(20) NOT NULL UNIQUE,           -- ej. "A4F-2390"
    cliente_id          BIGINT NOT NULL REFERENCES usuario(id),
    punto_de_venta_id   BIGINT NOT NULL REFERENCES punto_de_venta(id),
    estado              VARCHAR(40) NOT NULL,
    tipo_entrega        VARCHAR(20) NOT NULL,                  -- PICKUP | DELIVERY
    subtotal            NUMERIC(8,2) NOT NULL,
    descuento_qpts      NUMERIC(8,2) NOT NULL DEFAULT 0,
    total               NUMERIC(8,2) NOT NULL,
    creado_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pagado_at           TIMESTAMP,
    aceptado_at         TIMESTAMP,
    listo_at            TIMESTAMP,
    entregado_at        TIMESTAMP,
    cancelado_at        TIMESTAMP,
    razon_cancelacion   TEXT,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_estado CHECK (estado IN (
        'PENDIENTE_PAGO',
        'PAGADO_BUSCANDO_REPARTIDOR',
        'PAGADO_ESPERANDO_COMERCIO',
        'ACEPTADO',
        'EN_PREPARACION',
        'LISTO_PARA_RECOGER',
        'LISTO_PARA_DELIVERY',
        'ENTREGADO',
        'CANCELADO_POR_CLIENTE',
        'CANCELADO_POR_COMERCIO',
        'EXPIRADO'
    )),
    CONSTRAINT chk_tipo_entrega CHECK (tipo_entrega IN ('PICKUP', 'DELIVERY'))
);

CREATE INDEX idx_pedido_cliente ON pedido(cliente_id);
CREATE INDEX idx_pedido_punto_de_venta ON pedido(punto_de_venta_id);
CREATE INDEX idx_pedido_estado ON pedido(estado);
CREATE INDEX idx_pedido_listo_at ON pedido(listo_at) WHERE estado = 'LISTO_PARA_RECOGER';

CREATE TABLE item_pedido (
    id              BIGSERIAL PRIMARY KEY,
    pedido_id       BIGINT NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    producto_id     BIGINT NOT NULL REFERENCES producto(id),
    cantidad        INTEGER NOT NULL,
    precio_unitario NUMERIC(8,2) NOT NULL,
    subtotal        NUMERIC(8,2) NOT NULL,
    CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0)
);

CREATE INDEX idx_item_pedido_pedido ON item_pedido(pedido_id);

-- -----------------------------------------------------------------------------
-- PAGO
-- -----------------------------------------------------------------------------
CREATE TABLE pago (
    id                BIGSERIAL PRIMARY KEY,
    pedido_id         BIGINT NOT NULL UNIQUE REFERENCES pedido(id),
    monto             NUMERIC(8,2) NOT NULL,
    metodo            VARCHAR(30) NOT NULL,
    estado            VARCHAR(30) NOT NULL,
    referencia_externa VARCHAR(150),
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmado_at     TIMESTAMP,
    reembolsado_at    TIMESTAMP,
    CONSTRAINT chk_estado_pago CHECK (estado IN (
        'PENDIENTE', 'CONFIRMADO', 'FALLIDO', 'REEMBOLSADO'
    ))
);

CREATE INDEX idx_pago_estado ON pago(estado);
CREATE INDEX idx_pago_referencia_externa ON pago(referencia_externa);

-- -----------------------------------------------------------------------------
-- SOLICITUD DELIVERY
-- -----------------------------------------------------------------------------
CREATE TABLE solicitud_delivery (
    id              BIGSERIAL PRIMARY KEY,
    pedido_id       BIGINT NOT NULL UNIQUE REFERENCES pedido(id),
    repartidor_id   BIGINT REFERENCES usuario(id),
    zona_entrega    VARCHAR(100) NOT NULL,
    estado          VARCHAR(30) NOT NULL,
    busqueda_inicio_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    busqueda_fin_at TIMESTAMP NOT NULL,
    asignado_at     TIMESTAMP,
    recogido_at     TIMESTAMP,
    entregado_at    TIMESTAMP,
    CONSTRAINT chk_estado_solicitud CHECK (estado IN (
        'BUSCANDO', 'ASIGNADO', 'RECOGIDO', 'ENTREGADO', 'SIN_REPARTIDOR', 'CANCELADO'
    ))
);

CREATE INDEX idx_solicitud_delivery_estado ON solicitud_delivery(estado);
CREATE INDEX idx_solicitud_delivery_repartidor ON solicitud_delivery(repartidor_id);

-- -----------------------------------------------------------------------------
-- RESEÑA (sobre punto de venta o repartidor, asociada a un pedido entregado)
-- -----------------------------------------------------------------------------
CREATE TABLE resena (
    id            BIGSERIAL PRIMARY KEY,
    pedido_id     BIGINT NOT NULL REFERENCES pedido(id),
    autor_id      BIGINT NOT NULL REFERENCES usuario(id),
    objetivo_tipo VARCHAR(20) NOT NULL,                          -- PUNTO_DE_VENTA | REPARTIDOR
    objetivo_id   BIGINT NOT NULL,
    calificacion  SMALLINT NOT NULL,
    comentario    TEXT,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_calificacion CHECK (calificacion BETWEEN 1 AND 5),
    CONSTRAINT chk_objetivo_tipo CHECK (objetivo_tipo IN ('PUNTO_DE_VENTA', 'REPARTIDOR')),
    CONSTRAINT uq_resena UNIQUE (pedido_id, objetivo_tipo)
);

CREATE INDEX idx_resena_objetivo ON resena(objetivo_tipo, objetivo_id);

-- -----------------------------------------------------------------------------
-- MOVIMIENTO QUEUEPOINTS
-- -----------------------------------------------------------------------------
CREATE TABLE movimiento_queuepoints (
    id              BIGSERIAL PRIMARY KEY,
    usuario_id      BIGINT NOT NULL REFERENCES usuario(id),
    tipo            VARCHAR(20) NOT NULL,                        -- GANADO | CANJEADO
    monto           INTEGER NOT NULL,
    referencia_tipo VARCHAR(30),                                 -- PEDIDO | ENTREGA | BONO
    referencia_id   BIGINT,
    descripcion     VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_movimiento CHECK (tipo IN ('GANADO', 'CANJEADO')),
    CONSTRAINT chk_monto_positivo CHECK (monto > 0)
);

CREATE INDEX idx_mov_qpts_usuario ON movimiento_queuepoints(usuario_id);
CREATE INDEX idx_mov_qpts_referencia ON movimiento_queuepoints(referencia_tipo, referencia_id);

-- -----------------------------------------------------------------------------
-- TRIGGER: updated_at automático en filas modificadas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t RECORD;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at' AND table_schema = current_schema()
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at()',
            t.table_name, t.table_name
        );
    END LOOP;
END $$;
