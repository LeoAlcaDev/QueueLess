package pe.edu.utec.queueless.tyc.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.utec.queueless.shared.dto.ApiResponse;
import pe.edu.utec.queueless.tyc.dto.TycEstadoResponse;
import pe.edu.utec.queueless.tyc.service.TycService;

@Tag(name = "Términos y Condiciones", description = "Ver la versión vigente y registrar la aceptación del usuario autenticado")
@RestController
@RequestMapping("/api/v1/me/tyc")
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class TycController {

    private final TycService tycService;

    @GetMapping
    public ResponseEntity<ApiResponse<TycEstadoResponse>> estado(Authentication authentication) {
        return ResponseEntity.ok(ApiResponse.ok(tycService.verEstado(authentication.getName())));
    }

    @PostMapping("/aceptacion")
    public ResponseEntity<ApiResponse<TycEstadoResponse>> aceptar(Authentication authentication) {
        return ResponseEntity.ok(
            ApiResponse.ok(tycService.aceptar(authentication.getName()), "Aceptación registrada"));
    }
}
