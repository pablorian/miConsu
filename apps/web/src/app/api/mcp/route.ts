import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Patient, User } from '@repo/database';
import { OAuthToken } from '@repo/database';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const TOOLS = [
  {
    name: 'search_patients',
    description: 'Busca pacientes por nombre o apellido. Devuelve una lista con id, nombre y apellido.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Nombre o apellido del paciente a buscar' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_patient_odontogram',
    description: 'Obtiene el odontograma actual de un paciente.',
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', description: 'ID del paciente (obtenido con search_patients)' },
      },
      required: ['patient_id'],
    },
  },
  {
    name: 'update_patient_odontogram',
    description: `Actualiza el odontograma de un paciente.
Numeración FDI: superiores 11-18 (derecha) y 21-28 (izquierda), inferiores 41-48 (derecha) y 31-38 (izquierda).
Cada diente tiene: toothNumber, status ("present"|"missing"), y surfaces con claves top/bottom/left/right/center.
Valor de superficie: "<condición>:<estado>" donde condición es caries|filling|crown|endodontics|implant|unerupted|fixedProsthesis|removableProsthesis y estado es done (rojo, realizado) o todo (azul, a realizar).
Ejemplo: { "toothNumber": 16, "status": "present", "surfaces": { "center": "caries:done", "top": "filling:todo" } }`,
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', description: 'ID del paciente' },
        odontogram: {
          type: 'array',
          description: 'Array con los datos de cada diente afectado',
          items: {
            type: 'object',
            properties: {
              toothNumber: { type: 'number' },
              status: { type: 'string', enum: ['present', 'missing'] },
              surfaces: {
                type: 'object',
                properties: {
                  top: { type: 'string' },
                  bottom: { type: 'string' },
                  left: { type: 'string' },
                  right: { type: 'string' },
                  center: { type: 'string' },
                },
              },
              notes: { type: 'string' },
            },
            required: ['toothNumber'],
          },
        },
      },
      required: ['patient_id', 'odontogram'],
    },
  },
];

async function getUserFromToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  await connectToDatabase();
  const oauthToken = await OAuthToken.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!oauthToken) return null;

  const user = await User.findById(oauthToken.userId);
  return user;
}

async function handleToolCall(toolName: string, args: any, userId: any) {
  if (toolName === 'search_patients') {
    const { query } = args;
    const patients = await Patient.find({
      userId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
      ],
    }).select('_id name lastName email').limit(10).lean();

    const text = patients.length === 0
      ? 'No se encontraron pacientes con ese nombre.'
      : patients.map((p: any) => `ID: ${p._id} | ${p.name}${p.lastName ? ' ' + p.lastName : ''}${p.email ? ' (' + p.email + ')' : ''}`).join('\n');

    return { content: [{ type: 'text', text }] };
  }

  if (toolName === 'get_patient_odontogram') {
    const { patient_id } = args;
    const patient = await Patient.findOne({ _id: patient_id, userId }).select('name lastName odontogram').lean() as any;

    if (!patient) return { content: [{ type: 'text', text: 'Paciente no encontrado.' }] };

    const text = `Paciente: ${patient.name}${patient.lastName ? ' ' + patient.lastName : ''}\n\n` +
      `Odontograma actual:\n${JSON.stringify(patient.odontogram || [], null, 2)}`;

    return { content: [{ type: 'text', text }] };
  }

  if (toolName === 'update_patient_odontogram') {
    const { patient_id, odontogram } = args;
    const patient = await Patient.findOneAndUpdate(
      { _id: patient_id, userId },
      { odontogram, updatedAt: new Date() },
      { new: true }
    ).select('name lastName').lean() as any;

    if (!patient) return { content: [{ type: 'text', text: 'Paciente no encontrado.' }] };

    return {
      content: [{
        type: 'text',
        text: `Odontograma actualizado correctamente para ${patient.name}${patient.lastName ? ' ' + patient.lastName : ''}. Se cargaron ${odontogram.length} diente(s).`,
      }],
    };
  }

  return { content: [{ type: 'text', text: 'Tool desconocida.' }] };
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get('authorization'));
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null });
  }

  const { jsonrpc, method, params, id } = body;

  if (jsonrpc !== '2.0') {
    return NextResponse.json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: id ?? null });
  }

  if (method === 'initialize') {
    return NextResponse.json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'miConsu MCP', version: '1.0.0' },
      },
      id,
    });
  }

  if (method === 'notifications/initialized') {
    return new NextResponse(null, { status: 204 });
  }

  if (method === 'tools/list') {
    return NextResponse.json({
      jsonrpc: '2.0',
      result: { tools: TOOLS },
      id,
    });
  }

  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = params || {};
    try {
      const result = await handleToolCall(name, toolArgs || {}, user._id);
      return NextResponse.json({ jsonrpc: '2.0', result, id });
    } catch (error) {
      console.error('MCP tool error:', error);
      return NextResponse.json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal error' },
        id,
      });
    }
  }

  return NextResponse.json({
    jsonrpc: '2.0',
    error: { code: -32601, message: 'Method not found' },
    id: id ?? null,
  });
}

export async function GET() {
  return NextResponse.json({ error: 'Use POST for MCP protocol' }, { status: 405 });
}
