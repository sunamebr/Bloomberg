import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export function logPath(name) {
  return path.join(ROOT, 'logs', name);
}

export function appendJsonl(name, row) {
  const file = logPath(name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify({ timestamp: new Date().toISOString(), ...row }) + '\n');
}

export function readTailJsonl(name, limit = 100) {
  const file = logPath(name);
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean).slice(-limit);
  const out = [];
  for (const line of lines) {
    try { out.push(JSON.parse(line)); } catch {}
  }
  return out;
}
