// Выбор человека из контактов телефона (Contact Picker API: Android Chrome и приложение).
// На iPhone браузер этого не умеет — кнопку там не показываем.

interface ContactInfo {
  name?: string[];
  tel?: string[];
}

interface ContactsManager {
  select: (props: string[], options?: { multiple?: boolean }) => Promise<ContactInfo[]>;
}

function manager(): ContactsManager | undefined {
  const nav = navigator as Navigator & { contacts?: ContactsManager };
  return 'ContactsManager' in window && nav.contacts && typeof nav.contacts.select === 'function'
    ? nav.contacts
    : undefined;
}

export function contactsSupported(): boolean {
  return manager() !== undefined;
}

export interface PickedContact {
  name: string;
  tels: string[];
}

// null — человек передумал или доступа нет
export async function pickContact(): Promise<PickedContact | null> {
  const m = manager();
  if (!m) return null;
  try {
    const [c] = await m.select(['name', 'tel'], { multiple: false });
    if (!c) return null;
    const tels = [...new Set((c.tel ?? []).map((x) => x.trim()).filter(Boolean))];
    return { name: (c.name ?? []).find((x) => x.trim())?.trim() ?? '', tels };
  } catch {
    return null;
  }
}
