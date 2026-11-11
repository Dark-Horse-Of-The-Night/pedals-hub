import 'server-only';
import { cookies } from 'next/headers';
import type { Actor, Role } from './types';
import { STUDENTS } from './labels';

// PROTOTYPE DEMO ROLES — no real authentication or IITG SSO.
const STAFF: Record<Exclude<Role, 'student'>, string> = {
  admin: 'Hostel office',
  auditor: 'Volunteer V-02',
  mechanic: 'Mechanic M-01',
};

export async function staffActor(): Promise<Actor> {
  const jar = await cookies();
  const r = jar.get('pp_role')?.value as Role | undefined;
  const role = r && r in STAFF ? (r as Exclude<Role, 'student'>) : 'admin';
  return { role, name: STAFF[role], studentId: null };
}

export async function studentActor(): Promise<Actor> {
  const jar = await cookies();
  const s = jar.get('pp_student')?.value;
  const id = STUDENTS.some((x) => x.id === s) ? s! : 'S-21';
  return { role: 'student', name: 'Student ' + id, studentId: id };
}
