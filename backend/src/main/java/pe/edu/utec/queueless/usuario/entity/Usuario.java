package pe.edu.utec.queueless.usuario.entity;

import jakarta.persistence.*;
import lombok.*;
import pe.edu.utec.queueless.shared.domain.BaseEntity;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "usuario")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Usuario extends BaseEntity {

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "nombre_completo", nullable = false, length = 150)
    private String nombreCompleto;

    @Column(nullable = false)
    @Builder.Default
    private Boolean activo = true;

    @ElementCollection(targetClass = Rol.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "usuario_roles",
                     joinColumns = @JoinColumn(name = "usuario_id"))
    @Column(name = "rol", length = 20)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Set<Rol> roles = new HashSet<>();

    // Versión de los Términos y Condiciones que el usuario aceptó, y cuándo (ADR-0030).
    // Nulos hasta que acepta; guardamos solo la última aceptación, no un historial.
    @Column(name = "tyc_version_aceptada", length = 20)
    private String tycVersionAceptada;

    @Column(name = "tyc_aceptado_at")
    private Instant tycAceptadoAt;

    public boolean tieneRol(Rol rol) {
        return roles.contains(rol);
    }
}
