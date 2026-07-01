import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { ORDER_STATE_LABELS } from '@/lib';
import type { EstadoPedido } from '@/api';
import { Icon, Text } from '@/components';

// pasos del camino feliz que ve el cliente; los estados que no son hitos del avance
// se mapean al paso equivalente más abajo
const TIMELINE: EstadoPedido[] = [
  'PENDIENTE_PAGO',
  'PAGADO_ESPERANDO_COMERCIO',
  'ACEPTADO',
  'EN_PREPARACION',
  'LISTO_PARA_RECOGER',
  'ENTREGADO',
];

function currentIndex(estado: EstadoPedido): number {
  if (estado === 'LISTO_PARA_DELIVERY') return TIMELINE.indexOf('LISTO_PARA_RECOGER');
  if (estado === 'PAGADO_BUSCANDO_REPARTIDOR') return TIMELINE.indexOf('PAGADO_ESPERANDO_COMERCIO');
  const idx = TIMELINE.indexOf(estado);
  return idx < 0 ? 0 : idx;
}

export interface OrderTimelineProps {
  estado: EstadoPedido;
}

// Línea de tiempo vertical del progreso del pedido. Los pasos cumplidos llevan
// check; el paso en curso se resalta y dice "En curso". Sin mapa: el avance es por
// estados, no por ubicación.
export function OrderTimeline({ estado }: OrderTimelineProps) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const cur = currentIndex(estado);

  return (
    <View>
      {TIMELINE.map((step, index) => {
        const done = index < cur;
        const active = index === cur;
        const filled = done || active;
        const isLast = index === TIMELINE.length - 1;
        return (
          <View key={step} style={s.row}>
            <View style={s.rail}>
              <View
                style={[
                  s.node,
                  filled ? s.nodeFilled : s.nodeIdle,
                  active && s.nodeActive,
                ]}
              >
                {done ? (
                  <Icon name="check" size={13} color={t.colors.onBrand} strokeWidth={3} />
                ) : (
                  <Text variant="badge" style={{ color: filled ? t.colors.onBrand : t.colors.textMuted }}>
                    {index + 1}
                  </Text>
                )}
              </View>
              {!isLast ? <View style={[s.connector, done && s.connectorDone]} /> : null}
            </View>
            <View style={[s.labelWrap, !isLast && s.labelGap]}>
              <Text
                variant="label"
                color={active ? 'textPrimary' : done ? 'textSecondary' : 'textMuted'}
                style={active ? s.activeLabel : undefined}
              >
                {ORDER_STATE_LABELS[step]}
              </Text>
              {active ? (
                <Text variant="small" color="textBrand">
                  En curso
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: t.spacing[3], alignItems: 'stretch' },
    rail: { alignItems: 'center' },
    node: {
      width: 26,
      height: 26,
      borderRadius: t.radii.pill,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nodeFilled: { backgroundColor: t.colors.brandStrong, borderColor: t.colors.brandStrong },
    nodeIdle: { backgroundColor: t.colors.bgSurface, borderColor: t.colors.borderStrong },
    nodeActive: { borderColor: t.colors.brandStrong },
    connector: { width: 2, flex: 1, minHeight: 22, backgroundColor: t.colors.borderDefault },
    connectorDone: { backgroundColor: t.colors.brandStrong },
    labelWrap: { flex: 1, paddingTop: 3, gap: 1 },
    labelGap: { paddingBottom: t.spacing[4] },
    activeLabel: { fontFamily: t.fontFamily.semibold, color: t.colors.textPrimary },
  });
}
