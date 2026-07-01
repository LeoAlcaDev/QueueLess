import type { AxiosResponse } from 'axios';
import type { ApiResponse, PageResponse } from './types';

// El backend envuelve toda respuesta exitosa en ApiResponse; estos helpers sacan
// el dato real para que las pantallas no anden tocando res.data.data a mano.
export function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  return res.data.data;
}

export function unwrapList<T>(res: AxiosResponse<ApiResponse<T[]>>): T[] {
  return res.data.data;
}

export function unwrapPage<T>(res: AxiosResponse<ApiResponse<PageResponse<T>>>): PageResponse<T> {
  return res.data.data;
}
