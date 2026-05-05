package pe.edu.utec.queueless.shared.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Implementación AWS S3 para producción.
 *
 * <p>TODO Semana 3: implementar usando {@code S3Client} del SDK v2 ya incluido.
 * Bucket y región vienen de {@code queueless.storage.s3.*}.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "queueless.storage.impl", havingValue = "s3")
public class S3StorageService implements StorageService {

    @Override
    public String upload(String folder, MultipartFile file) {
        // TODO: usar S3Client.putObject(...) y devolver la URL pública del objeto
        throw new UnsupportedOperationException("S3StorageService aún no implementado");
    }

    @Override
    public void delete(String url) {
        // TODO
        throw new UnsupportedOperationException("S3StorageService aún no implementado");
    }
}
