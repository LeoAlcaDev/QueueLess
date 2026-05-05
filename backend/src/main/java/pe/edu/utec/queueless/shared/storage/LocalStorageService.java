package pe.edu.utec.queueless.shared.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Implementación local (disco) para entornos dev/test.
 *
 * <p>TODO Semana 1: implementar guardado real en {@code queueless.storage.local-base-path}
 * y servir los archivos vía un endpoint estático ({@code /uploads/**}).
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "queueless.storage.impl", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    @Value("${queueless.storage.local-base-path:./uploads}")
    private String basePath;

    @Override
    public String upload(String folder, MultipartFile file) {
        // TODO: persistir en disco bajo ${basePath}/${folder}/${UUID}-${originalFilename}
        log.warn("LocalStorageService.upload() aún no implementado — devolviendo URL stub");
        return "/uploads/" + folder + "/stub-" + file.getOriginalFilename();
    }

    @Override
    public void delete(String url) {
        // TODO
        log.warn("LocalStorageService.delete() aún no implementado");
    }
}
