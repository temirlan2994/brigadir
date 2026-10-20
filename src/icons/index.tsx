// Пиктограммы работ: обводка 2 px, один цвет, без заливок, currentColor.
// Где подходит готовая из lucide-react — используем её, остальные нарисованы сами.
import type { ReactNode, SVGProps } from 'react';
import {
  Zap, Shovel, HardHat, PaintRoller, Truck, Fuel, Wrench, UtensilsCrossed,
  Bed, Package, MoreHorizontal, Box, Ruler, Hammer, Paintbrush, Settings,
  LayoutGrid,
} from 'lucide-react';

export interface IconProps {
  size?: number;
  className?: string;
}

function svg(children: ReactNode) {
  return function CustomIcon({ size = 24, className }: IconProps) {
    const props: SVGProps<SVGSVGElement> = {
      viewBox: '0 0 24 24', width: size, height: size, className,
      fill: 'none', stroke: 'currentColor', strokeWidth: 2,
      strokeLinecap: 'round', strokeLinejoin: 'round',
    };
    return <svg {...props} aria-hidden="true">{children}</svg>;
  };
}

// Кирпичная стена
const BrickWall = svg(<>
  <rect x="3" y="5" width="18" height="14" rx="1" />
  <path d="M3 10h18M3 14.5h18M9 5v5M15 5v5M12 10v4.5M6 10v4.5M18 10v4.5M9 14.5V19M15 14.5V19" />
</>);

// Маска сварщика с искрой
const WeldingMask = svg(<>
  <path d="M8 3h8a2 2 0 0 1 2 2v10a6 6 0 0 1-6 6 6 6 0 0 1-6-6V5a2 2 0 0 1 2-2Z" />
  <path d="M9 12h6" />
  <path d="M19.5 7.5l2-1M19.8 10h2.2M19.5 4.5l1.5 1.5" />
</>);

// Бетономешалка
const Mixer = svg(<>
  <ellipse cx="11" cy="9" rx="5.5" ry="6" transform="rotate(-25 11 9)" />
  <path d="M7.5 14.5 5 20M14 14l3 6M4 20h15" />
  <circle cx="12" cy="20" r="1.6" />
</>);

// Связка арматурных прутов
const Rebar = svg(<>
  <path d="M4 20 18 6M7 21 21 7M3 17 17 3" />
  <ellipse cx="11.5" cy="12.5" rx="2.2" ry="4.6" transform="rotate(45 11.5 12.5)" />
</>);

// Мастерок
const Trowel = svg(<>
  <path d="M3 10 13 4l4 7-9 4-5-5Z" />
  <path d="M13.5 13.5 19 19" />
  <path d="M18 18l2.5 2.5" />
</>);

// Лист гипсокартона с профилем
const Drywall = svg(<>
  <rect x="4" y="3" width="13" height="18" rx="1" />
  <path d="M10.5 3v18" />
  <path d="M20 4v16" />
</>);

// Труба с краном
const PipeTap = svg(<>
  <path d="M2 14h20M2 18h20" />
  <path d="M9 14v-3h6v3" />
  <path d="M12 11V8" />
  <path d="M9 8h6" />
</>);

// Правило на полу (стяжка)
const Screed = svg(<>
  <path d="M3 20h18" />
  <path d="M4 16.5 20 9l1 2.2L5 18.7 4 16.5Z" />
  <path d="M12 12.8 10 8" />
</>);

// Стена с утеплителем (фасад)
const Facade = svg(<>
  <rect x="4" y="4" width="9" height="16" />
  <path d="M13 4h5v16h-5" />
  <path d="M15.5 4v16" />
  <path d="M4 9h9M4 14h9" />
</>);

// Скат крыши
const Roof = svg(<>
  <path d="M3 13 12 5l9 8" />
  <path d="M5.5 11v8M18.5 11v8" />
  <path d="M5.5 19h13" />
</>);

// Кувалда
const Sledgehammer = svg(<>
  <rect x="12" y="2.5" width="8" height="6" rx="1" transform="rotate(45 16 5.5)" />
  <path d="M12.5 9 4 17.5 6.5 20 15 11.5" />
</>);

// Окно
const WindowIcon = svg(<>
  <rect x="4" y="4" width="16" height="16" rx="1" />
  <path d="M12 4v16M4 12h16" />
</>);

// Канистра
const Canister = svg(<>
  <path d="M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7Z" />
  <path d="M6 7l2-3h8l2 3" />
  <path d="M9 4v3" />
  <path d="M9.5 11h5v5h-5z" />
</>);

// Мешок (материалы)
const Sack = svg(<>
  <path d="M9 7h6l3 5v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-7l3-5Z" />
  <path d="M9 7 8 4h8l-1 3" />
  <path d="M10 14h4" />
</>);

// Кран (аренда техники)
const Crane = svg(<>
  <path d="M5 21V8M8 21V8" />
  <path d="M4 8h17" />
  <path d="M5 8 12 3l9 5" />
  <path d="M17 8v4" />
  <path d="M15.5 14.5a1.5 1.5 0 1 0 3 0" />
  <path d="M3 21h7" />
</>);

// Ведро
const Bucket = svg(<>
  <path d="M5 8h14l-1.5 12a1.8 1.8 0 0 1-1.8 1.5H8.3A1.8 1.8 0 0 1 6.5 20L5 8Z" />
  <path d="M6 8a6 6 0 0 1 12 0" />
</>);

// Тарелка (питание)
const Plate = svg(<>
  <circle cx="12" cy="12" r="9" />
  <circle cx="12" cy="12" r="4.5" />
</>);

const custom: Record<string, (p: IconProps) => ReactNode> = {
  'brick-wall': BrickWall,
  'welding-mask': WeldingMask,
  mixer: Mixer,
  rebar: Rebar,
  trowel: Trowel,
  drywall: Drywall,
  'pipe-tap': PipeTap,
  screed: Screed,
  facade: Facade,
  roof: Roof,
  sledgehammer: Sledgehammer,
  window: WindowIcon,
  canister: Canister,
  sack: Sack,
  crane: Crane,
  bucket: Bucket,
  plate: Plate,
};

const lucide: Record<string, (p: { size?: number; className?: string }) => ReactNode> = {
  bolt: (p) => <Zap {...p} aria-hidden="true" />,
  shovel: (p) => <Shovel {...p} aria-hidden="true" />,
  hardhat: (p) => <HardHat {...p} aria-hidden="true" />,
  roller: (p) => <PaintRoller {...p} aria-hidden="true" />,
  tiles: (p) => <LayoutGrid {...p} aria-hidden="true" />,
  truck: (p) => <Truck {...p} aria-hidden="true" />,
  fuel: (p) => <Fuel {...p} aria-hidden="true" />,
  wrench: (p) => <Wrench {...p} aria-hidden="true" />,
  utensils: (p) => <UtensilsCrossed {...p} aria-hidden="true" />,
  bed: (p) => <Bed {...p} aria-hidden="true" />,
  package: (p) => <Package {...p} aria-hidden="true" />,
  dots: (p) => <MoreHorizontal {...p} aria-hidden="true" />,
  box: (p) => <Box {...p} aria-hidden="true" />,
  'tape-measure': (p) => <Ruler {...p} aria-hidden="true" />,
  hammer: (p) => <Hammer {...p} aria-hidden="true" />,
  brush: (p) => <Paintbrush {...p} aria-hidden="true" />,
  gear: (p) => <Settings {...p} aria-hidden="true" />,
};

// Пиктограммы категорий расходов
export const EXPENSE_ICONS: Record<string, string> = {
  transport: 'truck',
  fuel: 'canister',
  tools: 'wrench',
  food: 'plate',
  housing: 'bed',
  materials: 'sack',
  rent: 'crane',
  other: 'dots',
};

export function Icon({ name, size = 24, className }: { name: string } & IconProps) {
  const Custom = custom[name];
  if (Custom) return <Custom size={size} className={className} />;
  const Luc = lucide[name];
  if (Luc) return <Luc size={size} className={className} />;
  return <Box size={size} className={className} aria-hidden="true" />;
}
