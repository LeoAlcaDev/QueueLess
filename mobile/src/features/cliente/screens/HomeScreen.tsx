import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { api, endpoints, unwrap, unwrapList } from '@/api';
import type { ApiResponse, PuntoDeVentaResponse, SaldoResponse } from '@/api';
import { useApi, useDebouncedValue } from '@/hooks';
import { useAuth } from '@/auth';
import {
  Chip,
  EmptyState,
  QueuePointsBadge,
  Screen,
  SearchBar,
  Segmented,
  StateBanner,
  Text,
  Icon,
} from '@/components';
import { VendorCard, VendorCardSkeleton } from '../components';

const CATEGORIAS = ['Todos', 'Almuerzos', 'Café', 'Ensaladas', 'Snacks', 'Bebidas'];

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { user } = useAuth();
  const primerNombre = (user?.nombreCompleto ?? '').trim().split(/\s+/)[0] || 'Camila';

  const [query, setQuery] = useState('');
  const [categoria, setCategoria] = useState('Todos');
  const [orden, setOrden] = useState('tiempo');
  const debouncedQuery = useDebouncedValue(query, 300);

  const loadSaldo = useCallback(async (signal: AbortSignal) => {
    const res = await api.get<ApiResponse<SaldoResponse>>(endpoints.queuepoints.saldo(), { signal });
    return unwrap(res);
  }, []);
  const saldo = useApi(loadSaldo);
  useEffect(() => {
    saldo.run().catch(() => {});
  }, [saldo.run]);

  // el catálogo de locales abiertos no viene paginado: el backend ya devuelve la
  // lista completa de los que están abiertos, así que la traemos de una y dejamos
  // el filtrado por búsqueda y el orden para hacerlos acá en el cliente
  const cargarPuntos = useCallback(async (signal: AbortSignal) => {
    const res = await api.get<ApiResponse<PuntoDeVentaResponse[]>>(endpoints.catalogo.puntos(), { signal });
    return unwrapList(res);
  }, []);
  const puntos = useApi(cargarPuntos);
  useEffect(() => {
    puntos.run().catch(() => {});
  }, [puntos.run]);

  const cargandoInicial = puntos.loading && !puntos.data;
  const refrescando = puntos.loading && puntos.data != null;
  const recargar = useCallback(() => {
    puntos.run().catch(() => {});
  }, [puntos.run]);

  // filtramos y ordenamos sobre lo ya cargado, como hace el prototipo
  const visibles = useMemo(() => {
    let items = (puntos.data ?? []).slice();
    const q = debouncedQuery.trim().toLowerCase();
    if (q) items = items.filter((v) => v.nombre.toLowerCase().includes(q));
    if (orden === 'tiempo') {
      items.sort((a, b) => (a.tiempoEsperaEstimado ?? 999) - (b.tiempoEsperaEstimado ?? 999));
    } else {
      items.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    return items;
  }, [puntos.data, debouncedQuery, orden]);

  const refresh = (
    <RefreshControl refreshing={refrescando} onRefresh={recargar} tintColor={t.colors.brand} />
  );

  return (
    <Screen scroll padded={false} refreshControl={refresh}>
      <View style={s.content}>
        <View style={s.greetRow}>
          <View style={s.greet}>
            <Text variant="small" color="textMuted">
              UTEC · Campus Barranco
            </Text>
            <Text variant="h2">{`Hola, ${primerNombre}`}</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('Points')} hitSlop={6}>
            <QueuePointsBadge amount={saldo.data?.saldo ?? 0} />
          </Pressable>
        </View>

        <Text variant="display" style={s.lead}>
          ¿Qué vas a pedir hoy?
        </Text>

        <SearchBar value={query} onChangeText={setQuery} placeholder="Busca un local o platillo" />

        <Pressable onPress={() => navigation.navigate('Asistente')} style={s.assistant}>
          <View style={s.assistantIcon}>
            <Icon name="sparkles" size={22} color={t.colors.onBrand} />
          </View>
          <View style={s.assistantBody}>
            <Text variant="label" color="pointsStrong">
              Pregúntale al asistente
            </Text>
            <Text variant="small" color="textSecondary" numberOfLines={1}>
              "Algo sin gluten y barato" · te recomienda platos seguros
            </Text>
          </View>
          <Icon name="chevronRight" size={18} color={t.colors.pointsStrong} />
        </Pressable>

        <View style={s.chipsRow}>
          {CATEGORIAS.map((c) => (
            <Chip
              key={c}
              label={c}
              tone={categoria === c ? 'brand' : 'neutral'}
              selected={categoria === c}
              onPress={() => setCategoria(c)}
            />
          ))}
        </View>

        <View style={s.filters}>
          <Text variant="sectionLabel">
            {cargandoInicial ? 'Locales' : `${visibles.length} locales abiertos`}
          </Text>
          <Segmented
            value={orden}
            onChange={setOrden}
            options={[
              { label: 'Por tiempo', value: 'tiempo' },
              { label: 'Por nombre', value: 'nombre' },
            ]}
          />
        </View>

        {cargandoInicial ? (
          <View style={s.grid}>
            {[0, 1, 2, 3].map((i) => (
              <VendorCardSkeleton key={i} />
            ))}
          </View>
        ) : puntos.error ? (
          <StateBanner
            tone="error"
            title="No pudimos cargar los locales"
            message={puntos.error.message}
            action={{ label: 'Reintentar', onPress: recargar }}
          />
        ) : visibles.length === 0 ? (
          <EmptyState
            icon="store"
            title="No hay locales abiertos ahora"
            message="Los puntos de venta del campus abren entre las 07:30 y las 20:00. Vuelve más tarde."
            action={{ label: 'Actualizar', onPress: recargar }}
          />
        ) : (
          <View style={s.grid}>
            {visibles.map((vendor) => (
              <VendorCard
                key={vendor.id}
                vendor={vendor}
                onPress={() =>
                  navigation.navigate('PuntoDetalle', { puntoId: vendor.id, nombre: vendor.nombre })
                }
              />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    content: { paddingHorizontal: t.spacing[4], paddingTop: t.spacing[2], paddingBottom: t.spacing[6], gap: t.spacing[4] },
    greetRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: t.spacing[2] },
    greet: { gap: 1 },
    lead: { lineHeight: 40 },
    assistant: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[3],
      padding: t.spacing[4],
      borderRadius: t.radii.card,
      backgroundColor: t.colors.pointsSoft,
    },
    assistantIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: t.colors.points,
      alignItems: 'center',
      justifyContent: 'center',
    },
    assistantBody: { flex: 1, minWidth: 0, gap: 1 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing[2] },
    filters: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing[2] },
    grid: { gap: t.spacing[3] },
  });
}
