import { getJson } from './apiClient';

export const obtenerMenu = (options = {}) =>
  getJson('/api/menu', options);
