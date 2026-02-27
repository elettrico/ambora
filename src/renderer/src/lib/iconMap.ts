import type { LucideIcon } from 'lucide-react'
import {
  Swords,
  Shield,
  Skull,
  TreePine,
  Mountain,
  Castle,
  Flame,
  Waves,
  Moon,
  Sun,
  Beer,
  BookOpen,
  Eye,
  Ghost,
  Crown,
  CloudLightning,
  Heart,
  Tent,
  DoorOpen,
  Sparkles,
} from 'lucide-react'
import type { CLIMATE_ICONS } from '@/lib/constants'

export type ClimateIconName = (typeof CLIMATE_ICONS)[number]

export const ICON_MAP: Record<ClimateIconName, LucideIcon> = {
  Swords,
  Shield,
  Skull,
  TreePine,
  Mountain,
  Castle,
  Flame,
  Waves,
  Moon,
  Sun,
  Beer,
  BookOpen,
  Eye,
  Ghost,
  Crown,
  CloudLightning,
  Heart,
  Tent,
  DoorOpen,
  Sparkles,
}
