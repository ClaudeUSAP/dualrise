// Copie les fichiers Storage d'un projet Supabase vers un autre.
// Usage :
//   export SRC_URL="https://qusqisznwpdrvpwlnnpq.supabase.co"
//   export SRC_KEY="<service_role key US>"
//   export DST_URL="https://jwyyldkgvpylseqnctnm.supabase.co"
//   export DST_KEY="<service_role key EU>"
//   node ~/Downloads/copy-storage.mjs
//
// À lancer DEPUIS le dossier du projet (~/Projects/usap-scout) pour trouver @supabase/supabase-js.

import { createClient } from '@supabase/supabase-js';

const SRC_URL = process.env.SRC_URL;
const SRC_KEY = process.env.SRC_KEY;
const DST_URL = process.env.DST_URL;
const DST_KEY = process.env.DST_KEY;

if (!SRC_URL || !SRC_KEY || !DST_URL || !DST_KEY) {
  console.error('❌ Variables manquantes. Définis SRC_URL, SRC_KEY, DST_URL, DST_KEY.');
  process.exit(1);
}

const BUCKETS = ['athlete-images', 'coach-brochures'];

const src = createClient(SRC_URL, SRC_KEY, { auth: { persistSession: false } });
const dst = createClient(DST_URL, DST_KEY, { auth: { persistSession: false } });

// Liste récursive de tous les fichiers d'un bucket (gère dossiers + pagination)
async function listAll(client, bucket, prefix = '') {
  const out = [];
  let offset = 0;
  const limit = 100;
  for (;;) {
    const { data, error } = await client.storage.from(bucket).list(prefix, {
      limit, offset, sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // c'est un "dossier" -> on descend dedans
        out.push(...(await listAll(client, bucket, path)));
      } else {
        out.push(path);
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return out;
}

let totalOk = 0, totalFail = 0;

for (const bucket of BUCKETS) {
  console.log(`\n=== Bucket: ${bucket} ===`);
  let files;
  try {
    files = await listAll(src, bucket);
  } catch (e) {
    console.error(`  Impossible de lister ${bucket}:`, e.message);
    continue;
  }
  console.log(`  ${files.length} fichier(s) à copier`);

  for (const path of files) {
    try {
      const { data: blob, error: dErr } = await src.storage.from(bucket).download(path);
      if (dErr) throw dErr;
      const buffer = Buffer.from(await blob.arrayBuffer());
      const { error: uErr } = await dst.storage.from(bucket).upload(path, buffer, {
        contentType: blob.type || undefined,
        upsert: true,
      });
      if (uErr) throw uErr;
      totalOk++;
      if (totalOk % 20 === 0) console.log(`  ... ${totalOk} copiés`);
    } catch (e) {
      totalFail++;
      console.error(`  ⚠️  Échec ${bucket}/${path}: ${e.message}`);
    }
  }
}

console.log(`\n✅ Terminé. ${totalOk} fichier(s) copié(s), ${totalFail} échec(s).`);
