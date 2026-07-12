import {
  FileText,
  GitBranch,
  Globe,
  Mail,
  MessageSquare,
  Repeat,
  Send,
  ShieldCheck,
  Sparkles,
  Table,
  Upload,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const CONNECTOR_ICONS: Record<string, LucideIcon> = {
  mail: Mail,
  send: Send,
  upload: Upload,
  table: Table,
  "message-square": MessageSquare,
  globe: Globe,
  "file-text": FileText,
  sparkles: Sparkles,
};

export const NODE_TYPE_ICONS = {
  trigger: Zap,
  conditional: GitBranch,
  for_each: Repeat,
  human_approval: ShieldCheck,
} as const;

export function connectorIcon(name: string | undefined): LucideIcon | undefined {
  return name ? CONNECTOR_ICONS[name] : undefined;
}
