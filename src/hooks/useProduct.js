/**
 * Hook para consumir un producto por slug desde el endpoint products-list.
 *
 * Estados:
 *   - loading: mientras se hace el fetch inicial.
 *   - product: objeto con los datos del producto (fetched o fallback).
 *   - error: solo si tanto el fetch como el fallback fallan.
 *
 * Fallback:
 *   Si el fetch falla (red caída, blob no disponible, 5xx), se cae al
 *   catálogo estático src/data/cursos.js. Esto asegura que el sitio
 *   público NUNCA se rompa por un problema del backend.
 *
 * Uso:
 *   const { product, loading, error } = useProduct('vulnerabilidad-social');
 */

import { useState, useEffect } from 'react';
import { getCursoBySlug } from '../data/cursos.js';

export function useProduct(slug) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('slug requerido');
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/.netlify/functions/products-list?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) {
          throw new Error(`products-list responded with ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled) {
          setProduct(data);
          setLoading(false);
        }
      } catch (err) {
        console.warn('[useProduct] fetch failed, falling back to static catalog:', err.message);
        const fallback = getCursoBySlug(slug);
        if (!cancelled) {
          if (fallback) {
            setProduct(fallback);
            setLoading(false);
          } else {
            setError('Producto no encontrado');
            setLoading(false);
          }
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, loading, error };
}