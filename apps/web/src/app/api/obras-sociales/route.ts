import { NextResponse } from 'next/server';
import connectToDatabase, { ObraSocial } from '@repo/database';

// Seed data — mirrors the seed script so the collection self-populates on first request
const SEED_DATA = [
  { name: 'Particular',          code: 'PART',    order: 0 },
  { name: 'OSDE',                code: 'OSDE',    order: 10 },
  { name: 'Swiss Medical',       code: 'SWISS',   order: 11 },
  { name: 'Galeno',              code: 'GAL',     order: 12 },
  { name: 'Medifé',              code: 'MED',     order: 13 },
  { name: 'OMINT',               code: 'OMINT',   order: 14 },
  { name: 'Medicus',             code: 'MEDIC',   order: 15 },
  { name: 'Avalian',             code: 'AVA',     order: 16 },
  { name: 'Sancor Salud',        code: 'SAN',     order: 17 },
  { name: 'Accord Salud',        code: 'ACC',     order: 18 },
  { name: 'Federada Salud',      code: 'FED',     order: 19 },
  { name: 'Jerárquicos Salud',   code: 'JER',     order: 20 },
  { name: 'Prevención',          code: 'PREV',    order: 21 },
  { name: 'Círculo de Punilla',  code: 'CPC',     order: 22 },
  { name: 'PAMI',                code: 'PAMI',    order: 30 },
  { name: 'IOMA',                code: 'IOMA',    order: 31 },
  { name: 'APROSS',              code: 'APROS',   order: 32 },
  { name: 'OSECAC',              code: 'OSECAC',  order: 33 },
  { name: 'OSEP',                code: 'OSEP',    order: 34 },
  { name: 'OSPACP',              code: 'OSPAC',   order: 35 },
  { name: 'OSPEDYC',             code: 'OSPEDY',  order: 36 },
  { name: 'OSMATA (SMATA)',      code: 'SMATA',   order: 37 },
  { name: 'OSBA',                code: 'OSBA',    order: 38 },
  { name: 'OSAM',                code: 'OSAM',    order: 39 },
  { name: 'OSTEL',               code: 'OSTEL',   order: 40 },
  { name: 'OSPIM',               code: 'OSPIM',   order: 41 },
  { name: 'DASPU',               code: 'DASPU',   order: 42 },
  { name: 'DOSUBA',              code: 'DOSUBA',  order: 43 },
  { name: 'IOSFA',               code: 'IOSFA',   order: 44 },
  { name: 'PROFE',               code: 'PROFE',   order: 45 },
  { name: 'OSFATUN',             code: 'OSFATUN', order: 68 },
  { name: 'Unión Personal',      code: 'UNPERS',  order: 63 },
  { name: 'Luz y Fuerza',        code: 'LUZFZA',  order: 64 },
  { name: 'FOPC',                code: 'FOPC',    order: 62 },
  { name: 'ASPURC',              code: 'ASPURC',  order: 61 },
  { name: 'Bancarios (OSBA)',    code: 'BANCOS',  order: 69 },
  { name: 'COMEI',               code: 'COMEI',   order: 70 },
];

export async function GET() {
  try {
    await connectToDatabase();

    // Auto-seed if collection is empty
    const count = await ObraSocial.countDocuments();
    if (count === 0) {
      await ObraSocial.insertMany(
        SEED_DATA.map(d => ({ ...d, active: true })),
        { ordered: false }
      );
    }

    const items = await ObraSocial.find({ active: true })
      .sort({ order: 1, name: 1 })
      .select('name code')
      .lean();

    return NextResponse.json({ items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
