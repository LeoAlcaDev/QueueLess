package pe.edu.utec.queueless.recomendador.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pe.edu.utec.queueless.puntoventa.entity.AptitudDietetica;
import pe.edu.utec.queueless.shared.domain.Alergeno;
import pe.edu.utec.queueless.usuario.entity.RestriccionDietetica;
import pe.edu.utec.queueless.usuario.entity.ToleranciaPicante;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * El test del corazón de la seguridad: el filtro determinista que decide qué platos son
 * aptos para un cliente, sin ningún modelo de por medio. Es código puro, así que se prueba
 * en milisegundos y sin red ni base de datos.
 */
class FiltroDeSeguridadTest {

    @Test
    @DisplayName("Un cliente que evita maní nunca recibe un plato que declara maní")
    void excluyeAlergenoDeclarado() {
        // Arrange
        PerfilSeguridad perfil = perfil(Set.of(Alergeno.MANI), Set.of(), null);
        Candidato conMani = candidato(1L, Set.of(Alergeno.MANI), Set.of(), null);
        Candidato sinMani = candidato(2L, Set.of(Alergeno.LACTEOS), Set.of(), null);

        // Act
        List<Candidato> seguros = FiltroDeSeguridad.filtrar(perfil, List.of(conMani, sinMani));

        // Assert
        assertThat(seguros).extracting(Candidato::productoId).containsExactly(2L);
    }

    @Test
    @DisplayName("Sin gluten descarta los platos que declaran el alérgeno gluten")
    void sinGlutenExcluyeElAlergenoGluten() {
        // Arrange: el cliente no listó GLUTEN en alérgenos, solo marcó la dieta sin gluten
        PerfilSeguridad perfil = perfil(Set.of(), Set.of(RestriccionDietetica.SIN_GLUTEN), null);
        Candidato conGluten = candidato(1L, Set.of(Alergeno.GLUTEN), Set.of(), null);
        Candidato sinGluten = candidato(2L, Set.of(), Set.of(), null);

        // Act
        List<Candidato> seguros = FiltroDeSeguridad.filtrar(perfil, List.of(conGluten, sinGluten));

        // Assert
        assertThat(seguros).extracting(Candidato::productoId).containsExactly(2L);
    }

    @Test
    @DisplayName("Un cliente vegano solo recibe platos declarados veganos")
    void veganoSoloRecibeVeganos() {
        // Arrange
        PerfilSeguridad perfil = perfil(Set.of(), Set.of(RestriccionDietetica.VEGANO), null);
        Candidato vegano = candidato(1L, Set.of(), Set.of(AptitudDietetica.VEGANO), null);
        Candidato soloVegetariano = candidato(2L, Set.of(), Set.of(AptitudDietetica.VEGETARIANO), null);
        Candidato sinDeclarar = candidato(3L, Set.of(), Set.of(), null);

        // Act
        List<Candidato> seguros = FiltroDeSeguridad.filtrar(perfil, List.of(vegano, soloVegetariano, sinDeclarar));

        // Assert
        assertThat(seguros).extracting(Candidato::productoId).containsExactly(1L);
    }

    @Test
    @DisplayName("Un cliente vegetariano recibe platos vegetarianos y también veganos")
    void vegetarianoRecibeVegetarianoYVegano() {
        // Arrange
        PerfilSeguridad perfil = perfil(Set.of(), Set.of(RestriccionDietetica.VEGETARIANO), null);
        Candidato vegetariano = candidato(1L, Set.of(), Set.of(AptitudDietetica.VEGETARIANO), null);
        Candidato vegano = candidato(2L, Set.of(), Set.of(AptitudDietetica.VEGANO), null);
        Candidato sinDeclarar = candidato(3L, Set.of(), Set.of(), null);

        // Act
        List<Candidato> seguros = FiltroDeSeguridad.filtrar(perfil, List.of(vegetariano, vegano, sinDeclarar));

        // Assert
        assertThat(seguros).extracting(Candidato::productoId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("La tolerancia al picante descarta solo lo que pica de más")
    void picanteDescartaNivelSuperiorALaTolerancia() {
        // Arrange: tolerancia BAJA
        PerfilSeguridad perfil = perfil(Set.of(), Set.of(), ToleranciaPicante.BAJA);
        Candidato sinPicante = candidato(1L, Set.of(), Set.of(), ToleranciaPicante.NINGUNA);
        Candidato apenasPica = candidato(2L, Set.of(), Set.of(), ToleranciaPicante.BAJA);
        Candidato picaDeMas = candidato(3L, Set.of(), Set.of(), ToleranciaPicante.ALTA);

        // Act
        List<Candidato> seguros = FiltroDeSeguridad.filtrar(perfil, List.of(sinPicante, apenasPica, picaDeMas));

        // Assert
        assertThat(seguros).extracting(Candidato::productoId).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("Un plato sin nivel de picante declarado no se descarta: no es una violación conocida")
    void picanteDesconocidoSeMantiene() {
        // Arrange
        PerfilSeguridad perfil = perfil(Set.of(), Set.of(), ToleranciaPicante.NINGUNA);
        Candidato nivelDesconocido = candidato(1L, Set.of(), Set.of(), null);

        // Act
        List<Candidato> seguros = FiltroDeSeguridad.filtrar(perfil, List.of(nivelDesconocido));

        // Assert
        assertThat(seguros).extracting(Candidato::productoId).containsExactly(1L);
    }

    @Test
    @DisplayName("Un perfil sin restricciones deja pasar todos los platos")
    void perfilSinRestriccionesDejaPasarTodo() {
        // Arrange
        PerfilSeguridad perfil = perfil(Set.of(), Set.of(), null);
        Candidato a = candidato(1L, Set.of(Alergeno.MANI), Set.of(), ToleranciaPicante.ALTA);
        Candidato b = candidato(2L, Set.of(Alergeno.GLUTEN), Set.of(AptitudDietetica.VEGANO), null);

        // Act
        List<Candidato> seguros = FiltroDeSeguridad.filtrar(perfil, List.of(a, b));

        // Assert
        assertThat(seguros).extracting(Candidato::productoId).containsExactly(1L, 2L);
    }

    private static PerfilSeguridad perfil(Set<Alergeno> evita, Set<RestriccionDietetica> restricciones,
                                          ToleranciaPicante tolerancia) {
        return new PerfilSeguridad(evita, restricciones, tolerancia, null);
    }

    private static Candidato candidato(long id, Set<Alergeno> alergenos, Set<AptitudDietetica> aptitudes,
                                       ToleranciaPicante nivelPicante) {
        return new Candidato(id, "Plato " + id, "descripción", new BigDecimal("10.00"), 1L, "Local",
            10, true, alergenos, aptitudes, nivelPicante);
    }
}
