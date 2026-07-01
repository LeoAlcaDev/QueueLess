import { useCameraPermissions } from 'expo-camera';

// expo-camera ya trae su hook de permisos; lo envolvemos con un nombre claro y una
// forma estable, para que el escáner de QR pida permiso y muestre su fallback.
export function useCameraPermission() {
  const [permission, requestPermission] = useCameraPermissions();
  return {
    status: permission?.status ?? 'undetermined',
    granted: permission?.granted ?? false,
    canAskAgain: permission?.canAskAgain ?? true,
    request: requestPermission,
  };
}
