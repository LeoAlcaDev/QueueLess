package pe.edu.utec.queueless.shared.qr;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Genera el QR de un pedido a partir de su código. El QR no codifica nada nuevo:
 * solo el mismo código, para que la contraparte lo capture con la cámara en vez de
 * teclearlo (ADR-0027). No se guarda; se arma al vuelo cada vez que el cliente lo pide.
 */
@Component
public class GeneradorQr {

    private static final int LADO_PX = 300;

    public byte[] generarPng(String contenido) {
        try {
            QRCodeWriter escritor = new QRCodeWriter();
            BitMatrix matriz = escritor.encode(contenido, BarcodeFormat.QR_CODE, LADO_PX, LADO_PX);

            // La matriz dice, celda por celda, si ese módulo del QR va pintado o no.
            // Recorremos la cuadrícula y armamos la imagen pintando cada celda de negro
            // cuando el módulo está activo y de blanco cuando está vacío; eso es lo que
            // después lee una cámara.
            BufferedImage imagen = new BufferedImage(LADO_PX, LADO_PX, BufferedImage.TYPE_INT_RGB);
            for (int x = 0; x < LADO_PX; x++) {
                for (int y = 0; y < LADO_PX; y++) {
                    int color = matriz.get(x, y) ? 0x000000 : 0xFFFFFF;
                    imagen.setRGB(x, y, color);
                }
            }

            ByteArrayOutputStream salida = new ByteArrayOutputStream();
            ImageIO.write(imagen, "PNG", salida);
            return salida.toByteArray();
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("No se pudo generar el QR del pedido", e);
        }
    }
}
