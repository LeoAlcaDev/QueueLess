-- =============================================================================
-- Seed de datos para PERFIL DEV únicamente.
--
-- Esta migración usa el prefijo V99 para correr al final, después de cualquier
-- migración real del schema. En perfil `test` está excluida vía:
--   spring.flyway.target=2  (en application-test.yml)
-- En perfil `prod` esto carga también, así que NO debe contener datos sensibles
-- de prueba que afecten producción. Para ese caso, mover a otro mecanismo.
-- =============================================================================

-- Solo cargar si la base aún no tiene usuarios (idempotente)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM usuario LIMIT 1) THEN
        RAISE NOTICE 'Seeds de demo ya cargados, saltando.';
        RETURN;
    END IF;

    -- ---------- Usuarios demo ----------
    -- Password de todos los demos: "password123"
    -- Hash BCrypt de "password123": $2a$10$ecAdBXqZr8.SUW3Plm9MleJFDq./jk9xluyZAOpCS8ZQcd.rYFxXi
    INSERT INTO usuario (id, email, password_hash, nombre_completo) VALUES
        (1, 'camila.rojas@utec.edu.pe',  '$2a$10$ecAdBXqZr8.SUW3Plm9MleJFDq./jk9xluyZAOpCS8ZQcd.rYFxXi', 'Camila Rojas'),
        (2, 'comercio.cafe@utec.edu.pe', '$2a$10$ecAdBXqZr8.SUW3Plm9MleJFDq./jk9xluyZAOpCS8ZQcd.rYFxXi', 'Café del Bloque A (gestor)'),
        (3, 'diego.martinez@utec.edu.pe','$2a$10$ecAdBXqZr8.SUW3Plm9MleJFDq./jk9xluyZAOpCS8ZQcd.rYFxXi', 'Diego Martínez'),
        (4, 'lucia.silva@utec.edu.pe',   '$2a$10$ecAdBXqZr8.SUW3Plm9MleJFDq./jk9xluyZAOpCS8ZQcd.rYFxXi', 'Lucía Silva');

    -- Roles activos por usuario
    INSERT INTO usuario_roles (usuario_id, rol) VALUES
        (1, 'CLIENTE'),
        (1, 'REPARTIDOR'),       -- Camila es multi-rol
        (2, 'COMERCIO'),
        (3, 'CLIENTE'),
        (4, 'CLIENTE');

    -- Perfiles
    INSERT INTO perfil_cliente (usuario_id, direccion_preferida, total_pedidos) VALUES
        (1, 'Patios centrales', 12),
        (3, 'Bloque B - 2do piso', 5),
        (4, 'Biblioteca', 3);

    INSERT INTO perfil_comercio (usuario_id, ruc, contacto_telefono) VALUES
        (2, '20512345678', '999111222');

    INSERT INTO perfil_repartidor (usuario_id, calificacion_promedio, total_entregas, disponible) VALUES
        (1, 4.85, 5, FALSE);

    -- Camila tiene 250 QueuePoints porque también es repartidora (5 entregas x 50)
    INSERT INTO movimiento_queuepoints (usuario_id, tipo, monto, referencia_tipo, descripcion) VALUES
        (1, 'GANADO', 50, 'ENTREGA', 'Entrega comunitaria · Patios centrales'),
        (1, 'GANADO', 50, 'ENTREGA', 'Entrega comunitaria · Bloque B'),
        (1, 'GANADO', 50, 'ENTREGA', 'Entrega comunitaria · Biblioteca'),
        (1, 'GANADO', 50, 'ENTREGA', 'Entrega comunitaria · Patios centrales'),
        (1, 'GANADO', 50, 'ENTREGA', 'Entrega comunitaria · Bloque C');

    -- ---------- Punto de venta demo ----------
    INSERT INTO punto_de_venta (id, nombre, ubicacion, horario_apertura, horario_cierre,
                                tiempo_promedio_declarado, abierto, gestor_usuario_id) VALUES
        (1, 'Café del Bloque A',  'Bloque A · 1er piso',         '07:30', '20:00',  3, TRUE, 2),
        (2, 'Verde y Vivo',       'Bloque B · 2do piso',         '08:00', '17:00',  9, TRUE, 2),
        (3, 'Sushi Express UTEC', 'Bloque C · planta baja',      '11:00', '20:00', 22, TRUE, 2);

    -- ---------- Productos demo ----------
    INSERT INTO producto (punto_de_venta_id, nombre, descripcion, precio, categoria, tipo_preparacion, disponible) VALUES
        (1, 'Sandwich de pollo', 'Pollo a la parrilla, palta y tomate fresco en pan ciabatta.', 14.50, 'Almuerzos', 'PREPARADO',   TRUE),
        (1, 'Café americano',    'Doble shot de espresso con agua caliente. 12 oz.',            7.00, 'Café',      'PREPARADO',   TRUE),
        (1, 'Jugo de fresa',     'Pulpa fresca, sin azúcar añadida. 16 oz.',                    9.00, 'Bebidas',   'INSTANTANEO', TRUE),
        (2, 'Bowl quinoa',       'Quinoa, palta, tomate cherry, garbanzo.',                    18.00, 'Almuerzos', 'PREPARADO',   TRUE),
        (2, 'Jugo verde',        'Espinaca, manzana, jengibre.',                                9.00, 'Bebidas',   'INSTANTANEO', TRUE),
        (3, 'Roll California',   '8 piezas. Palta, kanikama, pepino.',                         18.00, 'Almuerzos', 'PREPARADO',   TRUE),
        (3, 'Edamame',           'Vainas hervidas con sal de mar.',                             6.00, 'Snacks',    'PREPARADO',   TRUE);

    -- ---------- Productos demo con reglas de horario ----------
    -- Uno con horario de servicio (solo en la mañana) y uno por lote (almuerzo del
    -- día), para probar la disponibilidad por franja y la validación al pedir.
    INSERT INTO producto (punto_de_venta_id, nombre, descripcion, precio, categoria,
                          tipo_preparacion, disponible,
                          horario_servicio_inicio, horario_servicio_fin,
                          tiene_ventana_de_pedido,
                          ventana_pedido_inicio, ventana_pedido_fin,
                          ventana_recojo_inicio, ventana_recojo_fin) VALUES
        (1, 'Desayuno completo', 'Huevos, pan, jugo y fruta. Solo por la mañana.',                 16.00, 'Desayunos', 'PREPARADO', TRUE,
            '07:00', '10:30', FALSE, NULL, NULL, NULL, NULL),
        (1, 'Almuerzo del día',  'Menú del día preparado por lote. Se pide temprano y se recoge al mediodía.', 15.00, 'Almuerzos', 'PREPARADO', TRUE,
            NULL, NULL, TRUE, '11:00', '13:00', '12:30', '14:00');

    -- Sincronizar las secuencias después del INSERT con IDs explícitos
    PERFORM setval('usuario_id_seq', (SELECT MAX(id) FROM usuario));
    PERFORM setval('punto_de_venta_id_seq', (SELECT MAX(id) FROM punto_de_venta));

    RAISE NOTICE 'Seeds de demo cargados correctamente.';
END $$;
