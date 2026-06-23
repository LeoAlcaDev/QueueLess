-- =============================================================================
-- Registro de aceptación de los Términos y Condiciones (ADR-0030)
-- Qué versión de los Términos aceptó cada usuario y cuándo. Nulos hasta que acepta;
-- guardamos solo la última aceptación, no un historial.
-- =============================================================================

ALTER TABLE usuario
    ADD COLUMN tyc_version_aceptada VARCHAR(20),
    ADD COLUMN tyc_aceptado_at      TIMESTAMP;
