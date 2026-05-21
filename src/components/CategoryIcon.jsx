import {
  Utensils, Car, Bus, ShoppingCart, ShoppingBag, Shirt, Scissors,
  Pill, Heart, Stethoscope,
  Home, Building2, Zap, Wifi, Smartphone,
  Film, Music, Gamepad2,
  BookOpen, GraduationCap,
  Coffee, Gift, Plane, Dumbbell,
  PawPrint, Wrench, Briefcase, FileText, CreditCard,
  Leaf, Sprout, Package,
  Wallet, DollarSign, Banknote, TrendingUp, Laptop, Star, Users, Globe,
  Bike, Train, Fuel, Tv, Camera, Watch, Sofa, Lamp, Apple,
  Tag,
} from 'lucide-react'

export const CATEGORY_ICON_MAP = {
  // Makanan & Minuman
  Utensils,
  Coffee,
  Apple,
  // Transportasi
  Car,
  Bus,
  Bike,
  Train,
  Fuel,
  Plane,
  // Belanja
  ShoppingCart,
  ShoppingBag,
  Shirt,
  Scissors,
  Watch,
  // Kesehatan
  Pill,
  Heart,
  Stethoscope,
  Dumbbell,
  // Tempat Tinggal
  Home,
  Building2,
  Sofa,
  Lamp,
  Zap,
  Wifi,
  // Teknologi
  Smartphone,
  Laptop,
  Tv,
  Camera,
  // Hiburan
  Film,
  Music,
  Gamepad2,
  // Pendidikan
  BookOpen,
  GraduationCap,
  // Alam & Hewan
  Leaf,
  Sprout,
  PawPrint,
  // Keuangan
  Wallet,
  DollarSign,
  Banknote,
  CreditCard,
  TrendingUp,
  Star,
  // Sosial & Lainnya
  Users,
  Globe,
  Gift,
  Briefcase,
  FileText,
  Wrench,
  Package,
}

export const CATEGORY_ICON_LIST = Object.keys(CATEGORY_ICON_MAP)

// Mapping emoji lama → nama Lucide baru (untuk auto-migrasi data DB)
export const EMOJI_TO_LUCIDE = {
  '🍽️': 'Utensils', '🍴': 'Utensils', '🥘': 'Utensils', '🍱': 'Utensils',
  '🚗': 'Car', '🚙': 'Car', '🚘': 'Car',
  '🚌': 'Bus', '🚎': 'Bus',
  '🚲': 'Bike', '🛵': 'Bike',
  '🚆': 'Train', '🚇': 'Train',
  '⛽': 'Fuel', '🛢️': 'Fuel',
  '✈️': 'Plane', '🛫': 'Plane',
  '🛒': 'ShoppingCart', '🛍️': 'ShoppingBag',
  '👗': 'Shirt', '👔': 'Shirt', '👕': 'Shirt',
  '💈': 'Scissors', '✂️': 'Scissors',
  '⌚': 'Watch',
  '💊': 'Pill', '💉': 'Pill',
  '❤️': 'Heart', '🫀': 'Heart',
  '🏥': 'Stethoscope', '🩺': 'Stethoscope',
  '🏋️': 'Dumbbell', '🏋️‍♂️': 'Dumbbell', '💪': 'Dumbbell',
  '🏠': 'Home', '🏡': 'Home', '🏘️': 'Home',
  '🏢': 'Building2', '🏬': 'Building2',
  '🛋️': 'Sofa',
  '💡': 'Lamp',
  '⚡': 'Zap', '🔌': 'Zap',
  '📶': 'Wifi', '🛜': 'Wifi',
  '📱': 'Smartphone', '☎️': 'Smartphone',
  '💻': 'Laptop', '🖥️': 'Laptop',
  '📺': 'Tv', '🖥': 'Tv',
  '📷': 'Camera', '📸': 'Camera',
  '🎬': 'Film', '🎥': 'Film', '🎭': 'Film',
  '🎵': 'Music', '🎶': 'Music', '🎤': 'Music',
  '🎮': 'Gamepad2', '🕹️': 'Gamepad2',
  '📚': 'BookOpen', '📖': 'BookOpen',
  '🎓': 'GraduationCap', '🏫': 'GraduationCap',
  '🌿': 'Leaf', '🍃': 'Leaf',
  '🌱': 'Sprout', '🪴': 'Sprout',
  '🐾': 'PawPrint', '🐱': 'PawPrint', '🐶': 'PawPrint',
  '📦': 'Package', '📫': 'Package',
  '💰': 'Wallet', '👛': 'Wallet',
  '💵': 'DollarSign', '💲': 'DollarSign',
  '💴': 'Banknote', '💶': 'Banknote', '💷': 'Banknote',
  '📈': 'TrendingUp', '📊': 'TrendingUp',
  '💼': 'Briefcase', '🗂️': 'Briefcase',
  '📄': 'FileText', '📃': 'FileText', '🧾': 'FileText',
  '💳': 'CreditCard', '🪙': 'CreditCard',
  '⭐': 'Star', '🌟': 'Star', '✨': 'Star',
  '👨‍👩‍👧': 'Users', '👨‍👩‍👦': 'Users', '👪': 'Users', '🫂': 'Users',
  '🌍': 'Globe', '🌐': 'Globe',
  '🎁': 'Gift', '🎀': 'Gift',
  '🔧': 'Wrench', '🪛': 'Wrench', '⚙️': 'Wrench',
  '☕': 'Coffee', '🍵': 'Coffee',
  '🍎': 'Apple', '🍏': 'Apple',
}

export function migrateIconName(icon) {
  if (!icon) return 'Package'
  // Sudah nama Lucide
  if (CATEGORY_ICON_MAP[icon]) return icon
  // Coba mapping emoji
  return EMOJI_TO_LUCIDE[icon] || null
}

export function CategoryIcon({ icon, size = 18, color, style = {} }) {
  const LucideIcon = CATEGORY_ICON_MAP[icon]
  if (LucideIcon) {
    return <LucideIcon size={size} style={{ color: color || 'currentColor', ...style }} />
  }
  // Fallback: emoji string (data lama di DB)
  return <span style={{ fontSize: size * 0.9, lineHeight: 1, ...style }}>{icon || '📦'}</span>
}
