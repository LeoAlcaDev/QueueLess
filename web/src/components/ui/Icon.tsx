// Wrapper sobre lucide-react. El diseño usa nombres propios (camelCase); este wrapper los
// mapea a los componentes de Lucide, igual que el QLIcon del prototipo. Stroke 2 por
// defecto (1.5 para iconos decorativos grandes >=32). Heredan currentColor, así el color
// lo pone la utilidad de texto del contenedor.
import {
  Home, Receipt, UserRound, User, Users, Store, Bike, Settings,
  ShoppingBag, Zap, Clock, MapPin, MapPinned, HandPlatter, QrCode, ScanLine, Camera, Package, Truck,
  Plus, Minus, PlusCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ArrowRight, ArrowLeft, ArrowUpRight, Check, CheckCheck, X, Search, Filter, SlidersHorizontal,
  RefreshCw, MoreVertical, MoreHorizontal, Pencil, Trash2, Upload, Image, Send, Power, Eye, EyeOff, Lock,
  Info, AlertCircle, AlertTriangle, CheckCircle, XCircle, Bell, Star, WifiOff,
  Flame, Leaf, Wheat, Coffee, Utensils,
  CreditCard, HelpCircle, LogOut, Sun, Moon, LineChart, BarChart3, TrendingUp, Mail, Phone,
  FileText, Clipboard, MessageCircle, Sparkles, Bot, Calendar, Wallet, Gift, Percent, Shield, Building2,
  Tag, List, LayoutGrid, Menu, DollarSign,
  type LucideIcon,
} from 'lucide-react';

// El nombre del diseño -> el componente de Lucide.
const MAP = {
  // Navegación / tab bar
  house: Home, home: Home, receipt: Receipt, userRound: UserRound, user: User, users: Users,
  store: Store, bike: Bike, settings: Settings,
  // Dominio
  shoppingBag: ShoppingBag, bag: ShoppingBag, bolt: Zap, zap: Zap, clock: Clock,
  mapPin: MapPin, mapPinned: MapPinned, handPlatter: HandPlatter,
  qr: QrCode, qrCode: QrCode, scan: ScanLine, camera: Camera, package: Package, truck: Truck,
  // Acciones / UI
  plus: Plus, minus: Minus, plusCircle: PlusCircle,
  chevronLeft: ChevronLeft, chevronRight: ChevronRight, chevronDown: ChevronDown, chevronUp: ChevronUp,
  arrowRight: ArrowRight, arrowLeft: ArrowLeft, arrowUpRight: ArrowUpRight,
  check: Check, checkCheck: CheckCheck, x: X, search: Search, filter: Filter, slidersH: SlidersHorizontal,
  refresh: RefreshCw, moreVertical: MoreVertical, moreHorizontal: MoreHorizontal,
  edit: Pencil, trash: Trash2, upload: Upload, image: Image, send: Send, power: Power,
  eye: Eye, eyeOff: EyeOff, lock: Lock,
  // Feedback / estado
  info: Info, alertCircle: AlertCircle, alertTriangle: AlertTriangle,
  checkCircle: CheckCircle, xCircle: XCircle, bell: Bell, star: Star, wifiOff: WifiOff,
  // Comida / atributos
  flame: Flame, leaf: Leaf, wheat: Wheat, coffee: Coffee, utensils: Utensils,
  // Misc
  creditCard: CreditCard, helpCircle: HelpCircle, logOut: LogOut, sun: Sun, moon: Moon,
  chart: LineChart, barChart: BarChart3, trendUp: TrendingUp, mail: Mail, phone: Phone,
  fileText: FileText, clipboard: Clipboard, messageCircle: MessageCircle, sparkles: Sparkles,
  bot: Bot, calendar: Calendar, wallet: Wallet, gift: Gift, percent: Percent, shield: Shield,
  building: Building2, tag: Tag, list: List, layoutGrid: LayoutGrid, menu: Menu, dollarSign: DollarSign,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof MAP;

interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 20, strokeWidth = 2, className }: IconProps) {
  const Glyph = MAP[name];
  return <Glyph size={size} strokeWidth={strokeWidth} className={className} aria-hidden />;
}
