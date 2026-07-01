// Unico lugar que toca las claves del par de tokens en localStorage. El resto del
// front pide y guarda tokens por aca, sin conocer los nombres de las claves.
const ACCESS_KEY = 'queueless.accessToken';
const REFRESH_KEY = 'queueless.refreshToken';

export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};
