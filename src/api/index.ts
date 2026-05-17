import { httpApi } from './client';
import { api as mockApi } from './mock';

// Use real backend when VITE_API_URL is configured, otherwise fall back to mock stubs
const useReal = !!import.meta.env.VITE_API_URL;

export const api = useReal ? httpApi : mockApi;
export type Api = typeof api;
export * from './types';
