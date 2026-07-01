import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import type { Theme } from '@/theme';
import { toneColors, type StatusTone } from '@/lib';
import { Text } from '@/components/ui';

interface ToastInput {
  tone: StatusTone;
  message: string;
  title?: string;
  durationMs?: number;
}

interface ToastEntry extends ToastInput {
  id: number;
}

interface ToastApi {
  show: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  function dismiss(id: number) {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  }

  const api = useMemo<ToastApi>(() => {
    function show(toast: ToastInput) {
      counter.current += 1;
      const id = counter.current;
      setToasts((list) => [...list, { ...toast, id }]);
    }
    return {
      show,
      dismiss,
      success: (message, title) => show({ tone: 'success', message, title }),
      error: (message, title) => show({ tone: 'error', message, title }),
      info: (message, title) => show({ tone: 'info', message, title }),
      warning: (message, title) => show({ tone: 'warning', message, title }),
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <View pointerEvents="box-none" style={[s.host, { top: insets.top + t.spacing[2] }]}>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastEntry; onDismiss: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const palette = toneColors(t.colors, toast.tone);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  // mantenemos la última versión del callback sin re-disparar el efecto de entrada
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: t.easing, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, easing: t.easing, useNativeDriver: true }),
    ]).start();

    const duration = toast.durationMs ?? 3500;
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => dismissRef.current());
    }, duration);
    return () => clearTimeout(timer);
  }, [opacity, translateY, toast.durationMs, t.easing]);

  return (
    <Animated.View style={[s.toast, { opacity, transform: [{ translateY }] }]}>
      <Pressable style={s.toastInner} onPress={() => dismissRef.current()}>
        <View style={[s.dot, { backgroundColor: palette.dot }]} />
        <View style={s.toastTexts}>
          {toast.title ? (
            <Text variant="label" style={s.toastTitle}>
              {toast.title}
            </Text>
          ) : null}
          <Text variant="small" style={s.toastMessage}>
            {toast.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de un ToastProvider');
  }
  return context;
}

function makeStyles(t: Theme) {
  return StyleSheet.create({
    host: {
      position: 'absolute',
      left: 0,
      right: 0,
      paddingHorizontal: t.spacing[4],
      gap: t.spacing[2],
    },
    // superficie oscura (textPrimary) con texto inverso; se invierte solo en modo oscuro
    toast: {
      borderRadius: t.radii.card,
      backgroundColor: t.colors.textPrimary,
      ...t.shadow.lg,
    },
    toastInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: t.spacing[2],
      paddingVertical: t.spacing[3],
      paddingHorizontal: t.spacing[4],
    },
    dot: { width: 8, height: 8, borderRadius: t.radii.pill },
    toastTexts: { flex: 1, gap: 2 },
    toastTitle: { color: t.colors.textInverse },
    toastMessage: { color: t.colors.textInverse },
  });
}
