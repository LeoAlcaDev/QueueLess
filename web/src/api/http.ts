import type { AxiosRequestConfig } from 'axios';
import { apiClient } from './client';
import type { ApiResponse, PageResponse } from './types';

// desempaqueta el campo data de la envoltura estandar del backend
export function unwrap<T>(response: { data: ApiResponse<T> }): T {
  return response.data.data;
}

// Wrapper tipado sobre la instancia de axios: cada metodo ya devuelve el dato
// desempaquetado, asi las pantallas trabajan con el DTO directo y no con la envoltura.
// El AbortController se pasa via config.signal en cualquiera de estos metodos.
export const http = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return unwrap(await apiClient.get<ApiResponse<T>>(url, config));
  },
  async getPage<T>(url: string, config?: AxiosRequestConfig): Promise<PageResponse<T>> {
    return unwrap(await apiClient.get<ApiResponse<PageResponse<T>>>(url, config));
  },
  async post<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap(await apiClient.post<ApiResponse<T>>(url, body, config));
  },
  async put<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap(await apiClient.put<ApiResponse<T>>(url, body, config));
  },
  async patch<T>(url: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return unwrap(await apiClient.patch<ApiResponse<T>>(url, body, config));
  },
  // los DELETE del backend devuelven 204 sin cuerpo, no hay nada que desempaquetar
  async delete(url: string, config?: AxiosRequestConfig): Promise<void> {
    await apiClient.delete(url, config);
  },
  // el QR viene como image/png crudo (no envuelto); lo bajamos como blob, con el Bearer
  // que ya pone el interceptor, y la pantalla lo vuelve un object URL
  async getBlob(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const res = await apiClient.get(url, { ...config, responseType: 'blob' });
    return res.data as Blob;
  },
  // subida multipart (por ejemplo la foto de un producto). Quitamos el Content-Type
  // por defecto para que el navegador ponga el boundary del form-data.
  async postForm<T>(url: string, form: FormData, config?: AxiosRequestConfig): Promise<T> {
    const headers = { ...config?.headers, 'Content-Type': undefined } as AxiosRequestConfig['headers'];
    return unwrap(await apiClient.post<ApiResponse<T>>(url, form, { ...config, headers }));
  },
};
