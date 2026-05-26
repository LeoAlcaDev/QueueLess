package pe.edu.utec.queueless.shared.storage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import pe.edu.utec.queueless.shared.exception.BusinessRuleException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * La subida a S3 con un cliente simulado: arma la key y el Content-Type correctos y
 * devuelve la URL pública; rechaza extensiones no permitidas y archivos vacíos.
 */
class S3StorageServiceTest {

    private S3Client s3Client;
    private S3StorageService storage;

    @BeforeEach
    void setUp() {
        s3Client = mock(S3Client.class);
        storage = new S3StorageService(s3Client, "mi-bucket", "us-east-1");
    }

    @Test
    @DisplayName("sube el archivo con la key, el tipo y el bucket correctos y devuelve la URL")
    void shouldSubirYDevolverUrlWhenArchivoValido() {
        MockMultipartFile archivo = new MockMultipartFile("file", "foto.jpg", "image/jpeg", new byte[]{1, 2, 3});

        String url = storage.upload("productos", archivo);

        assertThat(url).startsWith("https://mi-bucket.s3.us-east-1.amazonaws.com/productos/");
        assertThat(url).endsWith(".jpg");

        var captor = org.mockito.ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(captor.capture(), any(RequestBody.class));
        PutObjectRequest request = captor.getValue();
        assertThat(request.bucket()).isEqualTo("mi-bucket");
        assertThat(request.key()).startsWith("productos/").endsWith(".jpg");
        assertThat(request.contentType()).isEqualTo("image/jpeg");
    }

    @Test
    @DisplayName("una extension no permitida se rechaza y no sube nada")
    void shouldFallarWhenExtensionInvalida() {
        MockMultipartFile archivo = new MockMultipartFile("file", "foto.gif", "image/gif", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> storage.upload("productos", archivo))
            .isInstanceOf(BusinessRuleException.class);
        verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("un archivo vacio se rechaza y no sube nada")
    void shouldFallarWhenArchivoVacio() {
        MockMultipartFile archivo = new MockMultipartFile("file", "foto.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> storage.upload("productos", archivo))
            .isInstanceOf(BusinessRuleException.class);
        verify(s3Client, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }
}
