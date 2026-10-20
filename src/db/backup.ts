// Резервная копия: экспорт и импорт одного JSON-файла.
// Фото — отдельным флажком (base64), по умолчанию выключены из-за размера.
import { db } from './db';
import { wipeAll } from './repo';
import type { Photo } from './types';

export interface BackupFile {
  app: 'brigadir';
  schema: 1;
  exportedAt: string;
  data: Record<string, unknown[]>;
  photos?: { id: string; createdAt: string; type: string; base64: string }[];
}

const DATA_TABLES = [
  'settings', 'objects', 'workTypes', 'rates', 'workers', 'workEntries',
  'payouts', 'expenses', 'receipts', 'adjustments', 'changeLog',
] as const;

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, type: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export async function exportBackup(includePhotos: boolean): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {};
  for (const name of DATA_TABLES) data[name] = await db.table(name).toArray();
  const file: BackupFile = { app: 'brigadir', schema: 1, exportedAt: new Date().toISOString(), data };
  if (includePhotos) {
    const photos = await db.photos.toArray();
    file.photos = await Promise.all(photos.map(async (p) => ({
      id: p.id, createdAt: p.createdAt, type: p.blob.type, base64: await blobToBase64(p.blob),
    })));
  }
  return file;
}

export function isBackupFile(value: unknown): value is BackupFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v.app === 'brigadir' && v.schema === 1 && typeof v.data === 'object' && v.data !== null;
}

// Импорт заменяет все данные
export async function importBackup(file: BackupFile): Promise<void> {
  await wipeAll();
  await db.transaction('rw', db.tables, async () => {
    for (const name of DATA_TABLES) {
      const rows = file.data[name];
      if (Array.isArray(rows) && rows.length > 0) {
        await db.table(name).bulkAdd(rows);
      }
    }
    if (file.photos) {
      const photos: Photo[] = file.photos.map((p) => ({
        id: p.id, createdAt: p.createdAt, blob: base64ToBlob(p.base64, p.type),
      }));
      await db.photos.bulkAdd(photos);
    }
  });
}
