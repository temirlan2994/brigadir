import { useEffect, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { db } from '../db/db';
import { addPhoto } from '../db/repo';
import { compressImage } from '../lib/files';
import { useT } from '../i18n';

// Фото: камера или галерея, до 5, сжатие на устройстве
export function PhotoPicker({ photoIds, onChange, label }: {
  photoIds: string[];
  onChange: (ids: string[]) => void;
  label: string;
}) {
  const t = useT();
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const map: Record<string, string> = {};
      for (const id of photoIds) {
        const photo = await db.photos.get(id);
        if (photo) map[id] = URL.createObjectURL(photo.blob);
      }
      if (!cancelled) setUrls(map);
    })();
    return () => { cancelled = true; };
  }, [photoIds]);

  async function pick(files: FileList | null) {
    if (!files) return;
    const next = [...photoIds];
    for (const file of Array.from(files)) {
      if (next.length >= 5) break;
      const blob = await compressImage(file);
      next.push(await addPhoto(blob));
    }
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {photoIds.map((id) => (
          <span key={id} className="relative">
            {urls[id] && <img src={urls[id]} alt={label} className="h-16 w-16 rounded-xl object-cover" />}
            <button
              aria-label={t('common.delete')}
              className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-white"
              onClick={() => onChange(photoIds.filter((p) => p !== id))}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </span>
        ))}
        {photoIds.length < 5 && (
          <label className="flex h-16 min-w-[96px] cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3 text-slate-500">
            <Camera size={22} aria-hidden="true" />
            <span className="text-[14px]">{label}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { void pick(e.target.files); e.target.value = ''; }}
            />
          </label>
        )}
      </div>
    </div>
  );
}
