/**
 * Lectura y escritura defensiva de `localStorage`.
 *
 * `JSON.parse` sobre un valor corrupto lanza durante el render si se usa en un
 * inicializador de `useState`, y eso rompe la app entera al montar. Toda lectura
 * de JSON debe pasar por aquí.
 */

export function readJsonArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    console.error(
      `[localStorage] Contenido ilegible en "${key}", se ignora:`,
      error
    );
    return [];
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(
      `[localStorage] No se pudo guardar "${key}" (¿cuota llena?):`,
      error
    );
  }
}

/**
 * `crypto.randomUUID` es una función: comprobar su veracidad siempre da `true`,
 * y si `crypto` no existe la expresión lanza antes de poder elegir alternativa.
 */
export function randomId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
