-- Alérgenos estructurados en producto y perfil de cliente, más hábitos del
-- cliente (restricciones de dieta, tolerancia al picante, presupuesto de
-- referencia). Los alérgenos y las restricciones son conjuntos, así que van en
-- tablas hijas (una fila por valor), igual que usuario_roles. Son dos tablas
-- independientes: una para lo que el producto contiene y otra para lo que el
-- cliente evita; el cruce entre ambas se resuelve en consulta, no se guarda.
-- Todo es opcional y arranca vacío, así que ningún producto ni perfil existente
-- cambia de comportamiento. Modelado y alternativas descartadas en ADR-0025.

CREATE TABLE producto_alergeno (
    producto_id BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    alergeno    VARCHAR(20) NOT NULL,
    PRIMARY KEY (producto_id, alergeno),
    CONSTRAINT chk_producto_alergeno CHECK (alergeno IN (
        'MANI', 'FRUTOS_SECOS', 'MARISCOS', 'PESCADO', 'LACTEOS',
        'HUEVO', 'GLUTEN', 'SOYA', 'AJONJOLI'
    ))
);

-- Soporta el filtro "productos que contienen / no contienen este alérgeno".
CREATE INDEX idx_producto_alergeno_alergeno ON producto_alergeno(alergeno);

ALTER TABLE perfil_cliente
    ADD COLUMN tolerancia_picante     VARCHAR(20),
    ADD COLUMN presupuesto_referencia NUMERIC(8,2),
    ADD CONSTRAINT chk_tolerancia_picante CHECK (
        tolerancia_picante IN ('NINGUNA', 'BAJA', 'MEDIA', 'ALTA')
    );

CREATE TABLE perfil_cliente_alergeno (
    perfil_cliente_id BIGINT NOT NULL REFERENCES perfil_cliente(usuario_id) ON DELETE CASCADE,
    alergeno          VARCHAR(20) NOT NULL,
    PRIMARY KEY (perfil_cliente_id, alergeno),
    CONSTRAINT chk_perfil_cliente_alergeno CHECK (alergeno IN (
        'MANI', 'FRUTOS_SECOS', 'MARISCOS', 'PESCADO', 'LACTEOS',
        'HUEVO', 'GLUTEN', 'SOYA', 'AJONJOLI'
    ))
);

CREATE TABLE perfil_cliente_restriccion (
    perfil_cliente_id BIGINT NOT NULL REFERENCES perfil_cliente(usuario_id) ON DELETE CASCADE,
    restriccion       VARCHAR(20) NOT NULL,
    PRIMARY KEY (perfil_cliente_id, restriccion),
    CONSTRAINT chk_perfil_cliente_restriccion CHECK (
        restriccion IN ('VEGETARIANO', 'VEGANO', 'SIN_GLUTEN')
    )
);
