/**
 * Patient matching utility.
 * Tries to find an existing patient for a given userId using email, phone, or name.
 * Priority: email (most reliable) → phone → full name split.
 */

import { Patient } from '@repo/database';

interface MatchInput {
  email?: string | null;
  phone?: string | null;
  name?: string | null; // Could be "Apellido Nombre" or just "Nombre"
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, ''); // strip non-digits
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export async function matchPatient(
  userId: any,
  { email, phone, name }: MatchInput
): Promise<any | null> {
  // 1. Match by email (most reliable)
  if (email && email.trim()) {
    const byEmail = await (Patient as any).findOne({
      userId,
      email: { $regex: `^${email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
    if (byEmail) return byEmail;
  }

  // 2. Match by phone (normalize to digits only)
  if (phone && phone.trim()) {
    const normalizedInput = normalizePhone(phone);
    if (normalizedInput.length >= 7) {
      const patients = await (Patient as any).find({ userId });
      const byPhone = patients.find((p: any) => {
        if (!p.phone) return false;
        const norm = normalizePhone(p.phone);
        // Match if either ends with the other (handles country prefix variations)
        return norm.endsWith(normalizedInput) || normalizedInput.endsWith(norm);
      });
      if (byPhone) return byPhone;
    }
  }

  // 3. Match by full name (split and try to match name + lastName)
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      const patients = await (Patient as any).find({ userId });
      const match = patients.find((p: any) => {
        const patientName = normalizeName(`${p.name || ''} ${p.lastName || ''}`);
        const inputName = normalizeName(name);
        // Try both orderings: "Nombre Apellido" and "Apellido Nombre"
        const reversed = normalizeName(parts.slice().reverse().join(' '));
        return patientName.includes(normalizeName(parts[0])) &&
               (patientName === inputName || patientName === reversed ||
                inputName.includes(normalizeName(p.name || '')) ||
                inputName.includes(normalizeName(p.lastName || '')));
      });
      if (match) return match;
    }
  }

  return null;
}
