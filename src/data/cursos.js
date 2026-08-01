/**
 * Catálogo de productos publicados. Actúa como fallback estático del
 * catálogo real, que a partir de Etapa 2 vive en Netlify Blobs bajo el
 * key `products:v1` (ver netlify/functions/_lib/repositories/products.js).
 *
 * ¿Por qué mantener este archivo si la fuente de verdad pasa al blob?
 *   1. Hydration inicial del frontend sin bloquear el render en un fetch.
 *   2. Fallback defensivo: si el blob falla o el fetch se cae, el sitio
 *      público sigue mostrando productos.
 *   3. Seed inicial del blob (ver scripts/seed-products.js en Entrega 4).
 *
 * Cuando Innova saca una cápsula nueva y aún no existe el panel admin:
 *   1. Genera el Genially y copia su URL de vista aquí.
 *   2. Suma un objeto a este array respetando el schema (ver
 *      netlify/functions/_lib/products/schema.js).
 *   3. Corre el script de seed para sincronizar el blob.
 *
 * Cuando el panel admin esté vivo (Sprint 2), este archivo se actualiza
 * solo como fallback estático; la fuente de verdad pasa a ser el blob.
 *
 * La ruta /curso/<slug> no aparece en el menú ni en el sitemap. Solo se
 * llega desde el redirect de pago exitoso.
 */

export const cursos = [
  {
    slug: 'vulnerabilidad-social',
    type: 'capsula_genially',
    title: 'Vulnerabilidad Social y Acumulación de Desventajas en las Trayectorias de Vida',
    subtitle: 'Cápsula Formativa',
    description: '',
    price: 28000,
    currency: 'ARS',
    active: true,
    geniallyUrl: 'https://view.genially.com/699c5ca27f78794da573df81',
  },
];

export function getCursoBySlug(slug) {
  return cursos.find((c) => c.slug === slug);
}