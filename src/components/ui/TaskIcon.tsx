import {
  Cloud,
  Dumbbell,
  MessageCircle,
  Utensils,
  Laptop,
  BookOpen,
  Target,
  Code2,
  Wrench,
  Brain,
  Music,
  TrendingUp,
  HeartPulse,
  Mic,
  PenLine,
  GraduationCap,
  Container,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  cloud: Cloud,
  heart: HeartPulse,
  dumbbell: Dumbbell,
  message: MessageCircle,
  utensils: Utensils,
  laptop: Laptop,
  book: BookOpen,
  target: Target,
  code: Code2,
  wrench: Wrench,
  brain: Brain,
  music: Music,
  trending: TrendingUp,
  mic: Mic,
  pen: PenLine,
  grad: GraduationCap,
  container: Container,
};

export function TaskIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = ICONS[name] ?? Target;
  return <Icon size={size} strokeWidth={1.9} aria-hidden />;
}

export const ICON_OPTIONS = Object.keys(ICONS).map((k) => ({ value: k, label: k }));