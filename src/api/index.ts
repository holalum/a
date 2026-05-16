// Единая точка доступа к API. Сейчас отдаёт mock-реализацию.
// Для подключения Remnawave: создать api/remnawave.ts с тем же интерфейсом Api
// и переключить экспорт здесь (или по флагу окружения).

export { api } from './mock';
export type { Api } from './mock';
export * from './types';
