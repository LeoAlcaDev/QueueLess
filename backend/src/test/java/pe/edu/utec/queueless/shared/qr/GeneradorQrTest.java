package pe.edu.utec.queueless.shared.qr;

import com.google.zxing.BinaryBitmap;
import com.google.zxing.RGBLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.qrcode.QRCodeReader;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El QR es solo el código del pedido en otra representación. Este test cierra el
 * círculo: genera el PNG y lo vuelve a leer para confirmar que decodifica exactamente
 * al mismo código (ADR-0027). Usa solo ZXing core, sin Spring ni base.
 */
class GeneradorQrTest {

    private final GeneradorQr generadorQr = new GeneradorQr();

    @Test
    @DisplayName("el QR generado decodifica exactamente al código del pedido")
    void elQrDecodificaAlCodigo() throws Exception {
        // Arrange
        String codigo = "QL-260621-AB7K9";

        // Act
        byte[] png = generadorQr.generarPng(codigo);
        String leido = decodificar(png);

        // Assert
        assertThat(leido).isEqualTo(codigo);
    }

    @Test
    @DisplayName("el QR sale como un PNG con contenido")
    void generaPngNoVacio() {
        byte[] png = generadorQr.generarPng("QL-260621-AB7K9");
        assertThat(png).isNotEmpty();
    }

    /** Lee el PNG y decodifica su QR usando solo ZXing core (RGBLuminanceSource). */
    private String decodificar(byte[] png) throws Exception {
        BufferedImage imagen = ImageIO.read(new ByteArrayInputStream(png));
        int ancho = imagen.getWidth();
        int alto = imagen.getHeight();
        int[] pixeles = imagen.getRGB(0, 0, ancho, alto, null, 0, ancho);
        RGBLuminanceSource fuente = new RGBLuminanceSource(ancho, alto, pixeles);
        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(fuente));
        return new QRCodeReader().decode(bitmap).getText();
    }
}
