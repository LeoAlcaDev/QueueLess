package pe.edu.utec.queueless.shared.storage;

import org.springframework.web.multipart.MultipartFile;

/**
 * Abstracción de almacenamiento de archivos (fotos de productos, avatares).
 * Tiene dos implementaciones intercambiables vía {@code queueless.storage.impl}:
 * <ul>
 *   <li>{@code local} — guarda en disco bajo {@code ./uploads/} (dev/test)</li>
 *   <li>{@code s3} — sube a AWS S3 (prod)</li>
 * </ul>
 */
public interface StorageService {

    /**
     * Sube un archivo y devuelve la URL pública.
     *
     * @param folder  carpeta lógica ("productos", "avatares", etc.)
     * @param file    archivo recibido del cliente
     * @return URL pública del archivo subido
     */
    String upload(String folder, MultipartFile file);

    /**
     * Elimina un archivo previamente subido.
     */
    void delete(String url);
}
