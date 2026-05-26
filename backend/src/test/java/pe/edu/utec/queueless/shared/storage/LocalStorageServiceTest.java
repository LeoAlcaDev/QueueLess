package pe.edu.utec.queueless.shared.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Guardado y borrado de archivos en disco. Usa @TempDir para no ensuciar el repo.
 * Patron AAA.
 */
class LocalStorageServiceTest {

    @TempDir
    Path baseDir;

    private LocalStorageService storage;

    @BeforeEach
    void setUp() {
        storage = new LocalStorageService(baseDir.toString());
    }

    @Test
    @DisplayName("upload guarda el archivo en disco y devuelve una URL bajo /uploads")
    void shouldGuardarArchivoWhenArchivoValido() {
        // Arrange
        MockMultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", new byte[]{1, 2, 3});

        // Act
        String url = storage.upload("productos", file);

        // Assert
        assertThat(url).startsWith("/uploads/productos/").endsWith(".png");
        assertThat(Files.exists(rutaDesdeUrl(url))).isTrue();
    }

    @Test
    @DisplayName("delete borra el archivo y volver a borrarlo no falla")
    void shouldBorrarYTolerarReborradoWhenDelete() {
        // Arrange
        MockMultipartFile file = new MockMultipartFile("file", "foto.png", "image/png", new byte[]{1, 2, 3});
        String url = storage.upload("productos", file);
        Path guardado = rutaDesdeUrl(url);

        // Act
        storage.delete(url);

        // Assert
        assertThat(Files.exists(guardado)).isFalse();
        assertThatCode(() -> storage.delete(url)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("upload rechaza una extension no permitida")
    void shouldFallarWhenExtensionInvalida() {
        MockMultipartFile file = new MockMultipartFile("file", "doc.txt", "text/plain", new byte[]{1});

        assertThatThrownBy(() -> storage.upload("productos", file))
            .isInstanceOf(BusinessRuleException.class);
    }

    // La URL es /uploads/<folder>/<archivo>; el archivo real esta en <baseDir>/<folder>/<archivo>.
    private Path rutaDesdeUrl(String url) {
        String relativo = url.substring("/uploads/".length());
        return baseDir.resolve(relativo);
    }
}
