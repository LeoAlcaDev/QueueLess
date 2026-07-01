-- Datos de demo: dos locales con horario y tiempo declarado, más un historial de pedidos
-- sintético para que su curva de ocupación (ADR-0028) muestre un patrón real.
--
-- Corre después del seed base (V99). Es idempotente: si el local demo ya existe, no hace nada.
-- En el perfil `test` queda fuera (flyway.target=10). El historial va en un cliente dedicado
-- para no inflar el "mis pedidos" de los clientes demo reales.
--
-- Nota de zona horaria: la app guarda los instantes en hora de Lima (hibernate.jdbc.time_zone
-- = America/Lima) y la ocupación agrupa por hora de Lima, así que insertamos creado_at
-- directamente en esa hora, sin conversión.

DO $$
DECLARE
    v_gestor_id   BIGINT;
    v_hist_cli_id BIGINT;
    v_piatto_id   BIGINT;
    v_piso11_id   BIGINT;
BEGIN
    IF EXISTS (SELECT 1 FROM punto_de_venta WHERE nombre = 'piatto_ejemplo') THEN
        RAISE NOTICE 'Data demo de locales ya cargada, saltando.';
        RETURN;
    END IF;

    -- Gestor: el comercio demo si existe; si no, el primer usuario con rol COMERCIO.
    SELECT id INTO v_gestor_id FROM usuario WHERE email = 'comercio.cafe@utec.edu.pe';
    IF v_gestor_id IS NULL THEN
        SELECT u.id INTO v_gestor_id
        FROM usuario u JOIN usuario_roles r ON r.usuario_id = u.id
        WHERE r.rol = 'COMERCIO' LIMIT 1;
    END IF;
    IF v_gestor_id IS NULL THEN
        RAISE NOTICE 'No hay comercio al cual asignar los locales demo, saltando.';
        RETURN;
    END IF;

    -- Cliente dedicado para el historial sintético (contraseña password123 por si hace falta).
    INSERT INTO usuario (email, password_hash, nombre_completo)
    VALUES ('historico.demo@utec.edu.pe',
            '$2a$10$ecAdBXqZr8.SUW3Plm9MleJFDq./jk9xluyZAOpCS8ZQcd.rYFxXi',
            'Historial demo')
    RETURNING id INTO v_hist_cli_id;
    INSERT INTO usuario_roles (usuario_id, rol) VALUES (v_hist_cli_id, 'CLIENTE');

    -- Locales demo.
    INSERT INTO punto_de_venta (nombre, ubicacion, horario_apertura, horario_cierre,
                                tiempo_promedio_declarado, abierto, gestor_usuario_id)
    VALUES ('piatto_ejemplo', 'Comedor central · piso 1', '11:00', '18:00', 15, TRUE, v_gestor_id)
    RETURNING id INTO v_piatto_id;

    INSERT INTO punto_de_venta (nombre, ubicacion, horario_apertura, horario_cierre,
                                tiempo_promedio_declarado, abierto, gestor_usuario_id)
    VALUES ('Piso11_ejemplo', 'Torre · piso 11', '09:00', '18:00', 10, TRUE, v_gestor_id)
    RETURNING id INTO v_piso11_id;

    -- Productos (uno preparado y uno instantáneo por local, sin ventanas de horario).
    INSERT INTO producto (punto_de_venta_id, nombre, descripcion, precio, categoria, tipo_preparacion, disponible) VALUES
        (v_piatto_id, 'Pasta del día',   'Pasta fresca con salsa de la casa.',            16.00, 'Almuerzos', 'PREPARADO',   TRUE),
        (v_piatto_id, 'Limonada',        'Limonada fresca, sin azúcar añadida. 16 oz.',    8.00, 'Bebidas',   'INSTANTANEO', TRUE),
        (v_piso11_id, 'Menú ejecutivo',  'Entrada, plato de fondo y refresco.',           18.00, 'Almuerzos', 'PREPARADO',   TRUE),
        (v_piso11_id, 'Café',            'Café de filtro. 12 oz.',                          6.00, 'Café',      'INSTANTANEO', TRUE);

    -- Historial de piatto_ejemplo: se llena al mediodía, con pico entre 13 y 14 (más pedidos
    -- por día en esas horas). Cada franja acumula pedidos a lo largo de los últimos 84 días.
    INSERT INTO pedido (codigo, cliente_id, punto_de_venta_id, estado, tipo_entrega,
                        subtotal, descuento_qpts, total, creado_at, pagado_at,
                        aceptado_at, listo_at, entregado_at, updated_at)
    SELECT
        'QLDA' || lpad((row_number() OVER ())::text, 6, '0'),
        v_hist_cli_id, v_piatto_id, 'ENTREGADO', 'PICKUP',
        16.00, 0, 16.00,
        creado, creado + INTERVAL '2 minutes',
        creado + INTERVAL '4 minutes', creado + INTERVAL '14 minutes', creado + INTERVAL '18 minutes',
        creado + INTERVAL '18 minutes'
    FROM (
        SELECT ((current_date - dia) + make_time(hc.hora, (n * 12) % 60, 0))::timestamp AS creado
        FROM generate_series(0, 83) AS dia,
             (VALUES (12, 2), (13, 3), (14, 3), (15, 2)) AS hc(hora, cnt),
             generate_series(1, 3) AS n
        WHERE n <= hc.cnt
    ) src;

    -- Historial de Piso11_ejemplo: activo desde la mañana, con el pico de afluencia también
    -- entre 13 y 14 (donde la demora sube a unos 20 minutos); el resto del día ronda los 10.
    INSERT INTO pedido (codigo, cliente_id, punto_de_venta_id, estado, tipo_entrega,
                        subtotal, descuento_qpts, total, creado_at, pagado_at,
                        aceptado_at, listo_at, entregado_at, updated_at)
    SELECT
        'QLDB' || lpad((row_number() OVER ())::text, 6, '0'),
        v_hist_cli_id, v_piso11_id, 'ENTREGADO', 'PICKUP',
        18.00, 0, 18.00,
        creado, creado + INTERVAL '2 minutes',
        creado + INTERVAL '4 minutes', creado + INTERVAL '12 minutes', creado + INTERVAL '16 minutes',
        creado + INTERVAL '16 minutes'
    FROM (
        SELECT ((current_date - dia) + make_time(hc.hora, (n * 12) % 60, 0))::timestamp AS creado
        FROM generate_series(0, 83) AS dia,
             (VALUES (9, 1), (10, 2), (11, 2), (12, 2), (13, 3), (14, 3), (15, 1)) AS hc(hora, cnt),
             generate_series(1, 3) AS n
        WHERE n <= hc.cnt
    ) src;

    RAISE NOTICE 'Data demo de locales y ocupación cargada.';
END $$;
