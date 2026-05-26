package pe.edu.utec.queueless.shared.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.utec.queueless.shared.exception.InvalidFileException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Implementación de almacenamiento sobre AWS S3 para producción. Sube las imágenes a
 * un bucket de lectura pública y devuelve su URL pública directa. Se activa solo
 * cuando {@code queueless.storage.impl=s3}; en dev y tests sigue el guardado local.
 *
 * <p>Las credenciales de escritura no se configuran acá: el SDK de AWS las toma de las
 * variables de entorno del servidor.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "queueless.storage.impl", havingValue = "s3")
public class S3StorageService implements StorageService {

    private static final Set<String> EXTENSIONES_PERMITIDAS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Map<String, String> CONTENT_TYPES = Map.of(
        "jpg", "image/jpeg",
        "jpeg", "image/jpeg",
        "png", "image/png",
        "webp", "image/webp");

    private final S3Client s3Client;
    private final String bucket;
    private final String region;

    // Constructor que Spring usa en runtime. La anotacion explicita es necesaria
    // porque hay un segundo constructor (visible en tests) y Spring 6+ no
    // auto-selecciona cuando hay mas de uno.
    @Autowired
    public S3StorageService(
            @Value("${queueless.storage.s3.bucket}") String bucket,
            @Value("${queueless.storage.s3.region}") String region) {
        this(S3Client.builder().region(Region.of(region)).build(), bucket, region);
    }

    // Visible para los tests: permite inyectar un cliente S3 simulado.
    S3StorageService(S3Client s3Client, String bucket, String region) {
        this.s3Client = s3Client;
        this.bucket = bucket;
        this.region = region;
    }

    @Override
    public String upload(String folder, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("El archivo a subir esta vacio");
        }
        String extension = extraerExtension(file.getOriginalFilename());
        if (!EXTENSIONES_PERMITIDAS.contains(extension)) {
            throw new InvalidFileException("Extension de archivo no permitida: " + extension);
        }

        String key = folder + "/" + UUID.randomUUID() + "." + extension;
        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(CONTENT_TYPES.get(extension))
            .build();
        try {
            s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo leer el archivo a subir", ex);
        }
        return urlPublica(key);
    }

    @Override
    public void delete(String url) {
        if (url == null || url.isBlank()) {
            return;
        }
        String key = extraerKey(url);
        if (key.isBlank()) {
            return;
        }
        // Si el objeto ya no existe, S3 responde OK igual; borrar algo ausente no es un error.
        s3Client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    private String urlPublica(String key) {
        return "https://%s.s3.%s.amazonaws.com/%s".formatted(bucket, region, key);
    }

    private String extraerKey(String url) {
        // La URL pública es https://{bucket}.s3.{region}.amazonaws.com/{key};
        // el path empieza con "/", que quitamos para quedarnos con la key.
        String path = URI.create(url).getPath();
        if (path == null || path.isEmpty()) {
            return "";
        }
        return path.startsWith("/") ? path.substring(1) : path;
    }

    private String extraerExtension(String nombreOriginal) {
        if (nombreOriginal == null) {
            return "";
        }
        int punto = nombreOriginal.lastIndexOf('.');
        if (punto < 0 || punto == nombreOriginal.length() - 1) {
            return "";
        }
        return nombreOriginal.substring(punto + 1).toLowerCase();
    }
}
