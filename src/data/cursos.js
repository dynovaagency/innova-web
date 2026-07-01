/**
 * Catálogo de cápsulas/cursos publicados.
 *
 * Cuando Innova saca una cápsula nueva:
 *   1. Genera el Genially y copia su URL de vista aquí.
 *   2. Suma un objeto a este array con un slug único.
 *   3. Genera un link de cobro nuevo en Mercado Pago y configura la
 *      success_url apuntando a  https://innovatrabajosocial.com.ar/curso/<slug>
 *   4. Actualiza el link de MP en la Cápsula del mes (por ahora en
 *      PaymentModal.jsx → MERCADOPAGO_LINK).
 *
 * La ruta /curso/<slug> no aparece en el menú ni en el sitemap. Solo se
 * llega desde el redirect de Mercado Pago post-pago exitoso.
 */

export const cursos = [
  {
    slug: 'vulnerabilidad-social',
    title: 'Vulnerabilidad Social y Acumulación de Desventajas en las Trayectorias de Vida',
    subtitle: 'Cápsula Formativa',
    geniallyUrl: 'https://view.genially.com/699c5ca27f78794da573df81',
  },
];

export function getCursoBySlug(slug) {
  return cursos.find((c) => c.slug === slug);
}
