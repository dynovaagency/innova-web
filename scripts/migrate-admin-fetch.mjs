/**
 * Migración única (Fase 4): reemplaza fetch( por adminFetch( en las
 * páginas del panel admin y agrega el import.
 *
 * Uso:   node scripts/migrate-admin-fetch.mjs
 * Revisar después con:   git diff src/pages/admin/
 */

import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'src/pages/admin/CapsulaForm.jsx',
  'src/pages/admin/Capsulas.jsx',
  'src/pages/admin/CertificateSection.jsx',
  'src/pages/admin/CuponDetalle.jsx',
  'src/pages/admin/Cupones.jsx',
  'src/pages/admin/CuponForm.jsx',
  'src/pages/admin/Dashboard.jsx',
  'src/pages/admin/Inscriptos.jsx',
  'src/pages/admin/PagoDetalle.jsx',
  'src/pages/admin/Pagos.jsx',
];

const IMPORT_LINE = "import { adminFetch } from '../../lib/adminFetch.js';\n";

let totalReplacements = 0;

for (const file of FILES) {
  let source = readFileSync(file, 'utf8');

  if (source.includes('adminFetch')) {
    console.log(`⏭  ${file}: ya migrado, lo salteo`);
    continue;
  }

  // \bfetch\( no matchea fetchPayment( ni refetch(
  const matches = source.match(/\bfetch\(/g) || [];
  source = source.replace(/\bfetch\(/g, 'adminFetch(');
  source = IMPORT_LINE + source;

  writeFileSync(file, source, 'utf8');
  totalReplacements += matches.length;
  console.log(`✅ ${file}: ${matches.length} llamada(s) migrada(s)`);
}

console.log(`\nListo: ${totalReplacements} llamadas migradas en total.`);
console.log('Revisá los cambios con: git diff src/pages/admin/');