import { useCallback, useEffect, useState } from "react";

/** Persiste estado en localStorage (clave: "sp:" + key). */
export function useLocalStorage(key, initial) {
  const storageKey = `sp:${key}`;
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  });

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === "function" ? next(prev) : next;
        try {
          localStorage.setItem(storageKey, JSON.stringify(resolved));
        } catch {
          /* almacenamiento lleno o bloqueado: se ignora */
        }
        return resolved;
      });
    },
    [storageKey]
  );

  useEffect(() => {
    if (initial === undefined) return;
    if (localStorage.getItem(storageKey) === null) {
      localStorage.setItem(storageKey, JSON.stringify(value));
    }
    // solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [value, set];
}
