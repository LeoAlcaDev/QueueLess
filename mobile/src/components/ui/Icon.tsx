// ============================================================================
// QueueLess — Icon wrapper (React Native)  ·  src/components/ui/Icon.tsx
// ----------------------------------------------------------------------------
// Mapea los nombres de icono del diseño (camelCase, los mismos del prototipo)
// a los componentes de lucide-react-native. OJO: lucide 1.x RENOMBRÓ varios
// "*Circle"/"*Triangle" → "Circle*"/"Triangle*" y Home → House (marcados ↓).
// Peer obligatorio: react-native-svg. Heredan color (prop `color`).
// ============================================================================
import {
  // navegación / tab bar
  House, Receipt, UserRound, User, Users, Store, Bike, Settings, // House ← era Home
  // dominio
  ShoppingBag, Zap, Clock, MapPin, MapPinned, HandPlatter, QrCode, ScanLine, Camera, Package, Truck,
  // acciones / UI
  Plus, Minus, CirclePlus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, // CirclePlus ← era PlusCircle
  ArrowRight, ArrowLeft, ArrowUpRight, Check, CheckCheck, X, Search, Filter, SlidersHorizontal,
  RefreshCw, EllipsisVertical, Ellipsis, Pencil, Trash2, Upload, Image as ImageIcon, Send, Power, Eye, EyeOff, Lock,
  // feedback / estado  (renombres 1.x)
  Info, CircleAlert, TriangleAlert, CircleCheck, CircleX, CircleHelp, Bell, Star, WifiOff,
  // comida / atributos
  Flame, Leaf, Wheat, Coffee, Utensils,
  // misc
  CreditCard, LogOut, Sun, Moon, ChartLine, ChartColumn, TrendingUp, Mail, Phone,
  FileText, Clipboard, MessageCircle, Sparkles, Bot, Calendar, Wallet, Gift, Percent, Shield, Building2,
  Tag, List, LayoutGrid, Menu, DollarSign,
  type LucideIcon,
} from 'lucide-react-native';

// nombre del diseño  ->  componente de lucide-react-native
const MAP = {
  // navegación / tab bar
  house: House, home: House, receipt: Receipt, userRound: UserRound, user: User, users: Users,
  store: Store, bike: Bike, settings: Settings,
  // dominio
  shoppingBag: ShoppingBag, bag: ShoppingBag, bolt: Zap, zap: Zap, clock: Clock,
  mapPin: MapPin, mapPinned: MapPinned, handPlatter: HandPlatter,
  qr: QrCode, qrCode: QrCode, scan: ScanLine, camera: Camera, package: Package, truck: Truck,
  // acciones / UI
  plus: Plus, minus: Minus, plusCircle: CirclePlus,
  chevronLeft: ChevronLeft, chevronRight: ChevronRight, chevronDown: ChevronDown, chevronUp: ChevronUp,
  arrowRight: ArrowRight, arrowLeft: ArrowLeft, arrowUpRight: ArrowUpRight,
  check: Check, checkCheck: CheckCheck, x: X, search: Search, filter: Filter, slidersH: SlidersHorizontal,
  refresh: RefreshCw, moreVertical: EllipsisVertical, moreHorizontal: Ellipsis,
  edit: Pencil, trash: Trash2, upload: Upload, image: ImageIcon, send: Send, power: Power,
  eye: Eye, eyeOff: EyeOff, lock: Lock,
  // feedback / estado
  info: Info, alertCircle: CircleAlert, alertTriangle: TriangleAlert,
  checkCircle: CircleCheck, xCircle: CircleX, helpCircle: CircleHelp, bell: Bell, star: Star, wifiOff: WifiOff,
  // comida / atributos
  flame: Flame, leaf: Leaf, wheat: Wheat, coffee: Coffee, utensils: Utensils,
  // misc
  creditCard: CreditCard, logOut: LogOut, sun: Sun, moon: Moon,
  chart: ChartLine, barChart: ChartColumn, trendUp: TrendingUp, mail: Mail, phone: Phone,
  fileText: FileText, clipboard: Clipboard, messageCircle: MessageCircle, sparkles: Sparkles,
  bot: Bot, calendar: Calendar, wallet: Wallet, gift: Gift, percent: Percent, shield: Shield,
  building: Building2, tag: Tag, list: List, layoutGrid: LayoutGrid, menu: Menu, dollarSign: DollarSign,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP;

// Stroke 2 por defecto (1.5 para decorativos grandes >=32). `color` hereda del
// contenedor o pásalo desde el tema: <Icon name="bolt" color={t.colors.points} />.
export function Icon({
  name, size = 20, color, strokeWidth = 2,
}: { name: IconName; size?: number; color?: string; strokeWidth?: number }) {
  const Cmp = MAP[name];
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} />;
}
