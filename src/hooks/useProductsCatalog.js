import { useEffect, useState } from 'react';
import { cursos as staticCursos } from '../data/cursos.js';

/**
 * Carga el catálogo completo de productos activos desde el endpoint público.
 *
 * Fallback: si el fetch falla, usa el catálogo estático de src/data/cursos.js
 * para que el sitio no se rompa. Es la misma estrategia que usa useProduct.
 *
 * Retorna:
 *   - products: array de productos (nunca null; usa el fallback si algo falla).
 *   - loading: true mientras carga la primera vez.
 *   - error: mensaje de error si el fetch falló (aunque los products se rellenen
 *     con el fallback). Útil si el consumidor quiere mostrar un aviso.
 *   - refetch: función para volver a intentar.
 */
export function useProductsCatalog() {
  const [products, setProducts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/.netlify/functions/products-list');
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.warn('[useProductsCatalog] fallback a catálogo estático:', err);
      // Usamos el catálogo estático como fallback resiliente
      const fallback = (staticCursos || []).filter((c) => c.active !== false);
      setProducts(fallback);
      setError(err.message || 'Error cargando catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { products: products || [], loading, error, refetch: fetchProducts };
}