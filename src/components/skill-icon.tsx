import {
  Aperture,
  Captions,
  Code2,
  ImageIcon,
  MessagesSquare,
  NotebookTabs,
  Palette,
  Store,
  type LucideProps,
} from "lucide-react";

import type { SkillIconName } from "@/lib/skill-catalog";

const iconMap = {
  reply: MessagesSquare,
  caption: Captions,
  study: NotebookTabs,
  makeup: Palette,
  atmosphere: Aperture,
  retouch: ImageIcon,
  developer: Code2,
  community: Store,
} satisfies Record<SkillIconName, React.ComponentType<LucideProps>>;

export function SkillIcon({ name, ...props }: LucideProps & { name: SkillIconName }) {
  const Icon = iconMap[name];
  return <Icon {...props} />;
}
