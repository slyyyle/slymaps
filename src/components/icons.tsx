import {
  MapPin,
  Home,
  Briefcase,
  Navigation,
  Search,
  Layers,
  LocateFixed,
  Menu,
  X,
  Footprints,
  BusFront,
  Ship,
  TrainFront,
  Bike,
  Car,
  ChevronRight,
  ChevronLeft,
  Settings2,
  Lightbulb,
  Route,
  Clock,
  CalendarDays,
  Trash2,
  Edit3,
  PlusCircle,
  Save,
  Info,
  UtensilsCrossed,
  Store,
  Building2,
  Film,
  Building,
  GraduationCap,
  Hospital,
  Phone,
  Globe,
  Star,
  ZoomIn,
  Plus,
  Minus,
  Coffee,
  Wine,
  Zap,
  ShoppingCart,
  Pill,
  CreditCard,
  Fuel,
  Wrench,
  Trees,
  Dumbbell,
  MessageSquare,
  Sun,
  Moon,
  Cloud,
  Sunset,
  Sunrise,
  Contrast,
  Eye,
  RotateCcw,
  Circle,
  Heart,
  TrendingUp,
} from 'lucide-react';

export const Icons = {
  MapPin,
  Home,
  Work: Briefcase,
  Directions: Navigation, // or Route
  Search,
  MapStyle: Layers,
  Geolocate: LocateFixed,
  Menu,
  Close: X,
  X,
  Walking: Footprints,
  Bus: BusFront,
  Ferry: Ship,
  Train: TrainFront,
  Cycling: Bike,
  Driving: Car,
  Next: ChevronRight,
  Previous: ChevronLeft,
  ChevronRight,
  ChevronLeft,
  Settings: Settings2,
  Suggestion: Lightbulb,
  Route,
  Time: Clock,
  Day: CalendarDays,
  Delete: Trash2,
  Edit: Edit3,
  Add: PlusCircle,
  Save,
  Info,
  UtensilsCrossed,
  Store,
  Building2,
  Film,
  Building,
  GraduationCap,
  Hospital,
  Phone,
  Globe,
  Star,
  ZoomIn,
  Plus,
  Minus,
  Coffee,
  Wine,
  Zap,
  ShoppingCart,
  Pill,
  CreditCard,
  Fuel,
  Wrench,
  Trees,
  Dumbbell,
  MessageSquare,
  Navigation,
  Sun,
  Moon,
  Cloud,
  Sunset,
  Sunrise,
  Contrast,
  Eye,
  Refresh: RotateCcw,
  Circle,
  Heart,
  TrendingUp,
  Lightbulb: () => (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M9 18h6"/>
      <path d="M10 22h4"/>
      <path d="m15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8.36C18 4.01 14.99 1 12 1S6 4.01 6 8.36c0 1.13.39 2.16 1.5 3.14.76.76 1.23 1.52 1.41 2.5"/>
    </svg>
  ),
  ChevronDown: () => (
    <svg 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6"/>
    </svg>
  ),
};

export type IconName = keyof typeof Icons;
