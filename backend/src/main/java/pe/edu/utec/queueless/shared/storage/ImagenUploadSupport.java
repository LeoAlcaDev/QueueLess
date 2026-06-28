package pe.edu.utec.queueless.shared.storage;

import org.springframework.web.multipart.MultipartFile;
import pe.edu.utec.queueless.shared.exception.InvalidFileException;

import java.util.Set;

/**
 * Validacion de imagenes compartida entre las implementaciones de StorageService.
 * Centraliza las extensiones permitidas y la extraccion de la extension para que
 * el guardado local y el de S3 apliquen exactamente la misma regla.
 */
final class ImagenUploadSupport {

    static final Set<String> EXTENSIONES_PERMITIDAS = Set.of("jpg", "jpeg", "png", "webp");

    private ImagenUploadSupport() {
    }

    static String validarYExtraerExtension(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new InvalidFileException("El archivo a subir esta vacio");
        }
        String extension = extraerExtension(file.getOriginalFilename());
        if (!EXTENSIONES_PERMITIDAS.contains(extension)) {
            throw new InvalidFileException("Extension de archivo no permitida: " + extension);
        }
        return extension;
    }

    static String extraerExtension(String nombreOriginal) {
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
