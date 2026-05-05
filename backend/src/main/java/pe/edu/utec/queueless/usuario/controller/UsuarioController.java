package pe.edu.utec.queueless.usuario.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.edu.utec.queueless.usuario.service.UsuarioService;

@RestController
@RequestMapping("/api/usuarios")
@RequiredArgsConstructor
public class UsuarioController {

    private final UsuarioService usuarioService;

    @GetMapping("/me")
    public ResponseEntity<?> me() {
        // TODO Semana 1: extraer Usuario autenticado del SecurityContext y devolver UsuarioResponse
        return ResponseEntity.ok().build();
    }
}
