// Отдача файлов на телефоне: в установленном приложении скачивание через
// <a download> часто молча не срабатывает (iOS standalone), поэтому сначала
// пробуем системное «Поделиться» — оттуда и WhatsApp, и «Сохранить в Файлы».
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as { standalone?: boolean }).standalone === true;
}

function anchorDownload(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function downloadBlob(name: string, blob: Blob): Promise<'shared' | 'downloaded'> {
  const file = new File([blob], name, { type: blob.type });
  if (isStandalone() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return 'shared';
    } catch {
      // отменил шэр или не вышло — падаем на обычное скачивание
    }
  }
  anchorDownload(name, blob);
  return 'downloaded';
}

export async function downloadText(name: string, text: string, mime: string) {
  return downloadBlob(name, new Blob([text], { type: mime }));
}

function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const BOM = '﻿';

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(';'));
  return BOM + lines.join('\r\n');
}

// Несколько таблиц в одном файле: мобильные браузеры режут больше одного
// скачивания на тап, поэтому выгрузка — всегда один CSV с разделами
export function toCsvSections(sections: { title: string; header: string[]; rows: unknown[][] }[]): string {
  const parts = sections.map((s) => {
    const lines = [[s.title], s.header, ...s.rows].map((r) => r.map(csvCell).join(';'));
    return lines.join('\r\n');
  });
  return BOM + parts.join('\r\n\r\n');
}

// Сжатие фото: до 1280 px по длинной стороне, JPEG 0.7.
// Не удалось декодировать — сохраняем исходный файл как есть.
export async function compressImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1280;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return await new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.7);
    });
  } catch {
    return file;
  }
}

// Инициалы для кружка бригадира
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
}
