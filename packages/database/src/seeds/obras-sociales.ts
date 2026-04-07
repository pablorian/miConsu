/**
 * Seed script for ObraSocial collection.
 * Run once to populate the shared obras sociales catalog.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/seeds/obras-sociales.ts
 */

import mongoose from 'mongoose';
import { ObraSocial } from '../models/ObraSocial';

const OBRAS_SOCIALES: { name: string; code?: string; order?: number }[] = [
  // ── Special entry ──────────────────────────────────────────────────────
  { name: 'Particular',                         code: 'PART',   order: 0 },

  // ── Prepagas líderes ───────────────────────────────────────────────────
  { name: 'OSDE',                               code: 'OSDE',   order: 10 },
  { name: 'Swiss Medical',                      code: 'SWISS',  order: 11 },
  { name: 'Galeno',                             code: 'GAL',    order: 12 },
  { name: 'Medifé',                             code: 'MED',    order: 13 },
  { name: 'OMINT',                              code: 'OMINT',  order: 14 },
  { name: 'Medicus',                            code: 'MEDIC',  order: 15 },
  { name: 'Avalian',                            code: 'AVA',    order: 16 },
  { name: 'Sancor Salud',                       code: 'SAN',    order: 17 },
  { name: 'Accord Salud',                       code: 'ACC',    order: 18 },
  { name: 'Federada Salud',                     code: 'FED',    order: 19 },
  { name: 'Jerárquicos Salud',                  code: 'JER',    order: 20 },
  { name: 'Prevención',                         code: 'PREV',   order: 21 },
  { name: 'Círculo de Punilla',                 code: 'CPC',    order: 22 },

  // ── Obras sociales nacionales ──────────────────────────────────────────
  { name: 'PAMI',                               code: 'PAMI',   order: 30 },
  { name: 'IOMA',                               code: 'IOMA',   order: 31 },
  { name: 'APROSS',                             code: 'APROS',  order: 32 },
  { name: 'OSECAC',                             code: 'OSECAC', order: 33 },
  { name: 'OSEP',                               code: 'OSEP',   order: 34 },
  { name: 'OSPACP',                             code: 'OSPAC',  order: 35 },
  { name: 'OSPEDYC',                            code: 'OSPEDY', order: 36 },
  { name: 'OSMATA (SMATA)',                     code: 'SMATA',  order: 37 },
  { name: 'OSBA',                               code: 'OSBA',   order: 38 },
  { name: 'OSAM',                               code: 'OSAM',   order: 39 },
  { name: 'OSTEL',                              code: 'OSTEL',  order: 40 },
  { name: 'OSPIM',                              code: 'OSPIM',  order: 41 },
  { name: 'DASPU',                              code: 'DASPU',  order: 42 },
  { name: 'DOSUBA',                             code: 'DOSUBA', order: 43 },
  { name: 'IOSFA',                              code: 'IOSFA',  order: 44 },
  { name: 'PROFE',                              code: 'PROFE',  order: 45 },
  { name: 'OSPTV',                              code: 'OSPTV',  order: 46 },
  { name: 'OSDEPYM',                            code: 'OSDEP',  order: 47 },
  { name: 'OSPACA',                             code: 'OSPACA', order: 48 },
  { name: 'OSPAC',                              code: 'OSPAC2', order: 49 },
  { name: 'OSPECOM',                            code: 'OSPECOM', order: 50 },
  { name: 'OSCHOCA',                            code: 'OSCHOCA', order: 51 },
  { name: 'OSDOP',                              code: 'OSDOP',  order: 52 },
  { name: 'OSPFAM',                             code: 'OSPFAM', order: 53 },
  { name: 'OSGAM',                              code: 'OSGAM',  order: 54 },
  { name: 'OSSPRA',                             code: 'OSSPRA', order: 55 },
  { name: 'OSPPRA',                             code: 'OSPPRA', order: 56 },
  { name: 'OSPIA',                              code: 'OSPIA',  order: 57 },
  { name: 'OSPEDYF',                            code: 'OSPEDYF', order: 58 },
  { name: 'OSPAGA',                             code: 'OSPAGA', order: 59 },
  { name: 'OSPAT',                              code: 'OSPAT',  order: 60 },
  { name: 'ASPURC',                             code: 'ASPURC', order: 61 },
  { name: 'FOPC',                               code: 'FOPC',   order: 62 },
  { name: 'Unión Personal',                     code: 'UNPERS', order: 63 },
  { name: 'Luz y Fuerza',                       code: 'LUZFZA', order: 64 },
  { name: 'OSDE Binario',                       code: 'OSDEB',  order: 65 },
  { name: 'OSECAC',                             code: 'OSECAC2', order: 66 },
  { name: 'CCOO',                               code: 'CCOO',   order: 67 },
  { name: 'OSFATUN',                            code: 'OSFATUN', order: 68 },
  { name: 'Bancarios (OSBA)',                   code: 'BANCOS', order: 69 },
  { name: 'COMEI',                              code: 'COMEI',  order: 70 },
];

async function seed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/miconsu';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  let inserted = 0;
  let skipped = 0;

  for (const os of OBRAS_SOCIALES) {
    try {
      await ObraSocial.findOneAndUpdate(
        { name: os.name },
        { $setOnInsert: { ...os, active: true } },
        { upsert: true, new: false },
      );
      inserted++;
    } catch {
      skipped++;
    }
  }

  console.log(`Done: ${inserted} upserted, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
