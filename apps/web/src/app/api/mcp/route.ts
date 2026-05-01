import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase, { Patient, User, PatientFile } from '@repo/database';
import { OAuthToken } from '@repo/database';
import { google } from 'googleapis';
import { Readable } from 'stream';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const PATHOLOGY_FIELDS = [
  'arrhythmia','ischemicHeartDisease','bacterialEndocarditis','hypertension','hypotension','heartFailure','pacemaker','valvulopathies','heartProblems',
  'asthma','bronchitis','dyspnea',
  'dialysis','renalInsufficiency','renalTransplant','kidneyProblems',
  'cirrhosis','gastritis','hematemesis','hepatitis','jaundice','hepaticInsufficiency','melena','pyrosis','ulcers',
  'arthritis','arthrosis','pain','osteoporosis',
  'anemia','coagulopathies','hemorrhages','bloodTransfusion','bloodDisorders',
  'diabetes','hyperthyroidism','hypothyroidism','thyroid',
  'emotionalDisorders','convulsions','fainting','epilepsy',
  'allergies','analgesicsAllergy','anesthesiaAllergy','antibioticsAllergy','antiInflammatoryAllergy',
  'hiv','hepatitisB','syphilis','tuberculosis','chagas','venerealDiseases',
  'tumors','eatingDisorders','rheumaticFever','chemotherapy','radiotherapy','other',
  'smokes','drinksAlcohol','drugs','tattoos','bruxism',
];

const PATIENT_INPUT_PROPERTIES = {
  name: { type: 'string', description: 'Nombre del paciente' },
  lastName: { type: 'string', description: 'Apellido del paciente' },
  email: { type: 'string', description: 'Email del paciente' },
  phone: { type: 'string', description: 'Teléfono del paciente' },
  personalInfo: {
    type: 'object',
    description: 'Información personal',
    properties: {
      dni: { type: 'string' },
      sex: { type: 'string', description: 'Sexo: M, F u otro' },
      age: { type: 'number' },
      birthDate: { type: 'string', description: 'Fecha de nacimiento ISO (YYYY-MM-DD)' },
      maritalStatus: { type: 'string' },
      nationality: { type: 'string' },
      address: { type: 'string' },
      neighborhood: { type: 'string' },
      profession: { type: 'string' },
    },
  },
  medicalCoverage: {
    type: 'object',
    description: 'Obra social / cobertura médica',
    properties: {
      name: { type: 'string', description: 'Nombre de la obra social' },
      plan: { type: 'string' },
      affiliateNumber: { type: 'string' },
      holderName: { type: 'string' },
      holderWorkplace: { type: 'string' },
    },
  },
  pathologies: {
    type: 'object',
    description: `Antecedentes patológicos. Campos booleanos disponibles: ${PATHOLOGY_FIELDS.join(', ')}. También acepta: observations (string), categoryComments (objeto con claves: cardiovascular, respiratory, urinary, digestive, osteoarticular, hematologic, endocrine, nervous, allergiesComment, infectious, other, lifestyle).`,
    additionalProperties: true,
  },
};

const TOOLS = [
  {
    name: 'create_patient',
    description: 'Crea un nuevo paciente con su ficha médica completa (datos personales, obra social, antecedentes patológicos). Devuelve el patient_id para usar luego con update_patient_odontogram.',
    inputSchema: {
      type: 'object',
      properties: PATIENT_INPUT_PROPERTIES,
      required: ['name'],
    },
  },
  {
    name: 'update_patient',
    description: 'Actualiza los datos de un paciente existente (datos personales, obra social, antecedentes). No actualiza el odontograma — para eso usar update_patient_odontogram.',
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', description: 'ID del paciente a actualizar' },
        ...PATIENT_INPUT_PROPERTIES,
      },
      required: ['patient_id'],
    },
  },
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
  {
    name: 'upload_odontogram_image',
    description: 'Sube la imagen física del odontograma en papel como archivo al historial del paciente en Google Drive, para que quede como constancia del original. Requiere que el usuario tenga Google Drive conectado en miConsu. Llamar este tool DESPUÉS de update_patient_odontogram, pasando la misma imagen que se usó para interpretar el odontograma.',
    inputSchema: {
      type: 'object',
      properties: {
        patient_id: { type: 'string', description: 'ID del paciente' },
        image_base64: { type: 'string', description: 'Imagen del odontograma en papel codificada en base64' },
        mime_type: { type: 'string', description: 'Tipo MIME de la imagen: image/jpeg, image/png, image/heic, etc.', default: 'image/jpeg' },
        filename: { type: 'string', description: 'Nombre del archivo. Si no se indica se genera automáticamente con la fecha.' },
      },
      required: ['patient_id', 'image_base64'],
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

  return User.findById(oauthToken.userId);
}

async function getOrCreateDriveFolder(drive: any, name: string, parentId?: string): Promise<string> {
  const escapedName = name.replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;

  const res = await drive.files.list({ q, fields: 'files(id)', spaces: 'drive' });
  if (res.data.files?.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    },
    fields: 'id',
  });
  return folder.data.id;
}

function buildPatientFields(args: any) {
  const fields: any = {};
  if (args.name !== undefined) fields.name = args.name;
  if (args.lastName !== undefined) fields.lastName = args.lastName;
  if (args.email !== undefined) fields.email = args.email;
  if (args.phone !== undefined) fields.phone = args.phone;
  if (args.personalInfo !== undefined) fields.personalInfo = args.personalInfo;
  if (args.medicalCoverage !== undefined) fields.medicalCoverage = args.medicalCoverage;
  if (args.pathologies !== undefined) {
    const { observations, categoryComments, ...boolFields } = args.pathologies;
    const pathologiesUpdate: any = {};
    for (const key of PATHOLOGY_FIELDS) {
      if (boolFields[key] !== undefined) pathologiesUpdate[key] = Boolean(boolFields[key]);
    }
    if (observations !== undefined) pathologiesUpdate.observations = observations;
    if (categoryComments !== undefined) pathologiesUpdate.categoryComments = categoryComments;
    fields.pathologies = pathologiesUpdate;
  }
  return fields;
}

async function handleToolCall(toolName: string, args: any, user: any) {
  const userId = user._id;

  if (toolName === 'create_patient') {
    const fields = buildPatientFields(args);
    if (!fields.name) return { content: [{ type: 'text', text: 'Error: el campo "name" es obligatorio.' }] };

    try {
      const patient = await Patient.create({ ...fields, userId });
      return {
        content: [{
          type: 'text',
          text: `Paciente creado correctamente.\nID: ${patient._id}\nNombre: ${patient.name}${patient.lastName ? ' ' + patient.lastName : ''}\n\nPodés usar este ID con update_patient_odontogram para cargar el odontograma.`,
        }],
      };
    } catch (err: any) {
      if (err.code === 11000) {
        const field = err.keyPattern?.email ? 'email' : 'teléfono';
        return { content: [{ type: 'text', text: `Error: ya existe un paciente con ese ${field}.` }] };
      }
      throw err;
    }
  }

  if (toolName === 'update_patient') {
    const { patient_id, ...rest } = args;
    const fields = buildPatientFields(rest);

    if (Object.keys(fields).length === 0) {
      return { content: [{ type: 'text', text: 'No se proporcionaron campos para actualizar.' }] };
    }

    try {
      const patient = await Patient.findOneAndUpdate(
        { _id: patient_id, userId },
        { $set: { ...fields, updatedAt: new Date() } },
        { new: true }
      ).select('name lastName').lean() as any;

      if (!patient) return { content: [{ type: 'text', text: 'Paciente no encontrado.' }] };

      return {
        content: [{
          type: 'text',
          text: `Paciente actualizado correctamente: ${patient.name}${patient.lastName ? ' ' + patient.lastName : ''}`,
        }],
      };
    } catch (err: any) {
      if (err.code === 11000) {
        const field = err.keyPattern?.email ? 'email' : 'teléfono';
        return { content: [{ type: 'text', text: `Error: ya existe un paciente con ese ${field}.` }] };
      }
      throw err;
    }
  }

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

  if (toolName === 'upload_odontogram_image') {
    const { patient_id, image_base64, mime_type = 'image/jpeg', filename } = args;

    if (!user.googleCalendarAccessToken) {
      return {
        content: [{
          type: 'text',
          text: 'Error: Google Drive no está conectado en miConsu. El usuario debe conectar su cuenta de Google desde la sección de Calendario en la aplicación.',
        }],
      };
    }

    const patient = await Patient.findOne({ _id: patient_id, userId }).select('name lastName').lean() as any;
    if (!patient) return { content: [{ type: 'text', text: 'Paciente no encontrado.' }] };

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({
      access_token: user.googleCalendarAccessToken,
      refresh_token: user.googleCalendarRefreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const appFolderId = await getOrCreateDriveFolder(drive, 'MiConsu');
    const patientFolderName = `${patient.name}${patient.lastName ? ' ' + patient.lastName : ''}`;
    const patientFolderId = await getOrCreateDriveFolder(drive, patientFolderName, appFolderId);

    const buffer = Buffer.from(image_base64, 'base64');
    const stream = Readable.from(buffer);

    const extension = mime_type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    const date = new Date().toISOString().split('T')[0];
    const finalFilename = filename || `odontograma-${date}.${extension}`;

    const driveResponse = await drive.files.create({
      requestBody: {
        name: finalFilename,
        mimeType: mime_type,
        parents: [patientFolderId],
      },
      media: { mimeType: mime_type, body: stream },
      fields: 'id, name, webViewLink, iconLink, mimeType',
    });

    const uploaded = driveResponse.data;

    await PatientFile.create({
      patientId: patient_id,
      userId,
      fileId: uploaded.id,
      name: uploaded.name,
      mimeType: uploaded.mimeType,
      webViewLink: uploaded.webViewLink,
      iconLink: uploaded.iconLink,
    });

    return {
      content: [{
        type: 'text',
        text: `Imagen del odontograma guardada correctamente en el historial de ${patientFolderName}.\nArchivo: ${uploaded.name}\nVer en Drive: ${uploaded.webViewLink}`,
      }],
    };
  }

  return { content: [{ type: 'text', text: 'Tool desconocida.' }] };
}

function jsonRpc(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

function unauthorizedResponse(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${proto}://${host}`;
  return NextResponse.json({ error: 'unauthorized' }, {
    status: 401,
    headers: {
      ...CORS_HEADERS,
      'WWW-Authenticate': `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req.headers.get('authorization'));
  if (!user) return unauthorizedResponse(req);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonRpc({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null });
  }

  const { jsonrpc, method, params, id } = body;

  if (jsonrpc !== '2.0') {
    return jsonRpc({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: id ?? null });
  }

  if (method === 'initialize') {
    return jsonRpc({
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
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  if (method === 'tools/list') {
    return jsonRpc({ jsonrpc: '2.0', result: { tools: TOOLS }, id });
  }

  if (method === 'tools/call') {
    const { name, arguments: toolArgs } = params || {};
    try {
      const result = await handleToolCall(name, toolArgs || {}, user);
      return jsonRpc({ jsonrpc: '2.0', result, id });
    } catch (error: any) {
      console.error('MCP tool error:', error);
      if (error?.code === 401 || error?.response?.status === 401) {
        return jsonRpc({
          jsonrpc: '2.0',
          result: {
            content: [{ type: 'text', text: 'Error: La sesión de Google expiró. El usuario debe reconectar Google desde miConsu.' }],
          },
          id,
        });
      }
      return jsonRpc({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal error' }, id });
    }
  }

  return jsonRpc({ jsonrpc: '2.0', error: { code: -32601, message: 'Method not found' }, id: id ?? null });
}

export async function GET(req: NextRequest) {
  return unauthorizedResponse(req);
}
