import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { Db } from './types';
import { buildSeed } from './seed';
import { sweepExpiredNotices } from './ops';

const DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'db.json');

function write(db: Db) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

export function readDb(): Db {
  if (!fs.existsSync(FILE)) write(buildSeed());
  const db = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Db;
  if (sweepExpiredNotices(db)) write(db);
  return db;
}

let chain: Promise<unknown> = Promise.resolve();
/** Serialised read-modify-write so concurrent server actions never clobber each other. */
export function mutate<T>(fn: (db: Db) => T): Promise<T> {
  const run = chain.then(() => {
    const db = readDb();
    const result = fn(db);
    write(db);
    return result;
  });
  chain = run.catch(() => undefined);
  return run;
}

export function resetDemo() {
  return mutate((db) => {
    const fresh = buildSeed();
    Object.assign(db, fresh);
  });
}

export function replaceDb(next: Db) {
  return mutate((db) => {
    Object.assign(db, next);
  });
}
