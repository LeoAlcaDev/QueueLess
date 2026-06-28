package pe.edu.utec.queueless.shared.storage;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.utec.queueless.shared.exception.InvalidFileException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Validacion compartida de imagenes para el guardado local y el de S3. Patron AAA, sin Spring.
 */
class ImagenUploadSupportTest {

    @Test
    @DisplayName("un archivo vacio se rechaza")
    void shouldFallarWhenArchivoVacio() {
        // Arrange
        MultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", new byte[0]);

        // Act + Assert
        assertThatThrownBy(() -> ImagenUploadSupport.validarYExtraerExtension(file))
            .isInstanceOf(InvalidFileException.class);
    }

    @Test
    @DisplayName("una extension no permitida se rechaza")
    void shouldFallarWhenExtensionInvalida() {
        // Arrange
        MultipartFile file = new MockMultipartFile("file", "foto.gif", "image/gif", new byte[]{1});

        // Act + Assert
        assertThatThrownBy(() -> ImagenUploadSupport.validarYExtraerExtension(file))
            .isInstanceOf(InvalidFileException.class);
    }

    @Test
    @DisplayName("una extension valida se devuelve en minuscula")
    void shouldDevolverExtensionEnMinusculaWhenArchivoValido() {
        // Arrange
        MultipartFile file = new MockMultipartFile("file", "foto.PNG", "image/png", new byte[]{1, 2, 3});

        // Act
        String extension = ImagenUploadSupport.validarYExtraerExtension(file);

        // Assert
        assertThat(extension).isEqualTo("png");
    }
}
