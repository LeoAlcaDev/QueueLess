-- Aptitud dietética y nivel de picante del producto, para cerrar el cruce con las
-- restricciones y la tolerancia que el cliente ya declara (ADR-0025, actualizado en la
-- Fase E; el cruce determinista que los consume vive en ADR-0031). La aptitud es un
-- conjunto (un producto puede declararse vegetariano y vegano a la vez), así que va en
-- tabla hija, igual que los alérgenos. SIN_GLUTEN no necesita columna: se resuelve
-- excluyendo el alérgeno GLUTEN que el producto ya declara. Todo es opcional y arranca
-- vacío, así que ningún producto existente cambia de comportamiento.

CREATE TABLE producto_aptitud_dietetica (
    producto_id BIGINT NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    aptitud     VARCHAR(20) NOT NULL,
    PRIMARY KEY (producto_id, aptitud),
    CONSTRAINT chk_producto_aptitud CHECK (aptitud IN ('VEGETARIANO', 'VEGANO'))
);

-- Soporta el filtro "productos aptos para esta dieta".
CREATE INDEX idx_producto_aptitud_aptitud ON producto_aptitud_dietetica(aptitud);

-- El nivel de picante usa la misma escala ordinal que la tolerancia del cliente, para
-- que comparar "el plato no supera la tolerancia" sea directo.
ALTER TABLE producto
    ADD COLUMN nivel_picante VARCHAR(20),
    ADD CONSTRAINT chk_producto_nivel_picante CHECK (
        nivel_picante IN ('NINGUNA', 'BAJA', 'MEDIA', 'ALTA')
    );
