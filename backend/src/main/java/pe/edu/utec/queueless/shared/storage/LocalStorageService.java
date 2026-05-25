package pe.edu.utec.queueless.shared.storage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pe.edu.utec.queueless.shared.exception.InvalidFileException;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;

/**
 * Implementacion local (disco) para entornos dev/test. Guarda los archivos bajo
 * {@code queueless.storage.local-base-path} y devuelve URLs {@code /uploads/...}
 * que el WebMvcConfig sirve como recursos estaticos.
 */
@Slf4j
@Service
@ConditionalOnProperty(name = "queueless.storage.impl", havingValue = "local", matchIfMissing = true)
public class LocalStorageService implements StorageService {

    private static final String URL_PREFIX = "/uploads/";
    private static final Set<String> EXTENSIONES_PERMITIDAS = Set.of("jpg", "jpeg", "png", "webp");

    private final String basePath;

    public LocalStorageService(@Value("${queueless.storage.local-base-path:./uploads}") String basePath) {
        this.basePath = basePath;
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

        // Nombre unico para que dos archivos con el mismo nombre no se pisen.
        String nombreUnico = UUID.randomUUID() + "." + extension;
        Path carpeta = Paths.get(basePath, folder).toAbsolutePath().normalize();
        Path destino = carpeta.resolve(nombreUnico);

        try {
            Files.createDirectories(carpeta);
            Files.write(destino, file.getBytes());
        } catch (IOException ex) {
            throw new UncheckedIOException("No se pudo guardar el archivo " + nombreUnico, ex);
        }

        return URL_PREFIX + folder + "/" + nombreUnico;
    }

    @Override
    public void delete(String url) {
        if (url == null || !url.startsWith(URL_PREFIX)) {
            return;
        }
        // La URL publica es /uploads/<folder>/<archivo>; quitamos el prefijo para
        // ubicar el archivo real dentro del directorio base.
        String relativo = url.substring(URL_PREFIX.length());
        Path archivo = Paths.get(basePath, relativo).toAbsolutePath().normalize();
        try {
            Files.deleteIfExists(archivo);
        } catch (IOException ex) {
            log.warn("No se pudo borrar el archivo {}: {}", archivo, ex.getMessage());
        }
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
