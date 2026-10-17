/**
 * Función programada: emite las facturas pendientes.
 *
 * Corre cada 15 minutos (ver netlify.toml). Emite hasta 5 comprobantes
 * por corrida, en orden, y reintenta los que fallaron.
 *
 * Las funciones programadas de Netlify solo corren en el deploy
 * publicado de cada sitio (producción y develop), no en previews. No se
 * pueden llamar por URL en producción.
 */

import { processDueInvoices, getInvoicingConfig } from './_lib/invoicing.js';

export const handler = async () => {
  const config = getInvoicingConfig();
  if (!config.enabled) {
    console.log('[invoices-process] facturación desactivada (falta INVOICING_START_AT o FISCAL_ENCRYPTION_KEY)');
    return { statusCode: 200, body: JSON.stringify({ processed: 0, reason: 'disabled' }) };
  }

  try {
    const result = await processDueInvoices({ limit: 5 });
    if (result.processed > 0) {
      console.log('[invoices-process] corrida terminada', result);
    }
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    console.error('[invoices-process] error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};