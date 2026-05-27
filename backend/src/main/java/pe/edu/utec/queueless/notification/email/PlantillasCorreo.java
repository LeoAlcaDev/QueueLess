package pe.edu.utec.queueless.notification.email;

/**
 * Plantillas HTML de los correos transaccionales. Se rellenan con
 * {@link String#format(String, Object...)} usando placeholders {@code %s}; los
 * valores que vienen del usuario se escapan con {@code HtmlUtils.htmlEscape}
 * antes de pasarlos para evitar inyección de HTML/JS en el cliente de correo.
 * Ver ADR-0021.
 */
final class PlantillasCorreo {

    static final String BIENVENIDA_HTML = """
        <!DOCTYPE html>
        <html lang="es">
          <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
            <h1 style="color: #4f46e5;">¡Bienvenido a QueueLess, %s!</h1>
            <p>Tu cuenta ya está creada. Desde acá vas a poder pedir tu almuerzo sin colas en los locales del campus.</p>
            <p>Si no fuiste vos quien creó esta cuenta, escribinos a soporte respondiendo este correo.</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
              QueueLess — Tu almuerzo, sin cola, sin estrés.
            </p>
          </body>
        </html>
        """;

    static final String RECIBO_HTML = """
        <!DOCTYPE html>
        <html lang="es">
          <body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
            <h1 style="color: #4f46e5;">¡Gracias por tu pedido, %s!</h1>
            <p>Confirmamos la entrega de tu pedido <strong>%s</strong> el %s.</p>
            <table style="border-collapse: collapse; width: 100%%; margin-top: 16px;">
              <thead>
                <tr style="background: #f3f4f6;">
                  <th style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb;">Producto</th>
                  <th style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb;">Cantidad</th>
                  <th style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                %s
              </tbody>
            </table>
            <p style="text-align: right; font-size: 18px; margin-top: 16px;">
              <strong>Total: S/ %s</strong>
            </p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 32px;">
              QueueLess — Tu almuerzo, sin cola, sin estrés. Guardá este correo como comprobante.
            </p>
          </body>
        </html>
        """;

    static final String FILA_ITEM_HTML = """
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #f3f4f6;">%s</td>
          <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f3f4f6;">%d</td>
          <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f3f4f6;">S/ %s</td>
        </tr>
        """;

    private PlantillasCorreo() {
    }
}
