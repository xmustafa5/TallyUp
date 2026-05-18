"use client"

import * as React from "react"
import * as LucideIcons from "lucide-react"

/**
 * Resolves the `lucide` icon name (as emitted by the shadcn base-nova
 * registry) to the corresponding lucide-react component. The other
 * icon-library props are accepted but ignored -- this project uses
 * lucide (see components.json `iconLibrary`).
 */
interface IconPlaceholderProps extends React.SVGProps<SVGSVGElement> {
  lucide: string
  tabler?: string
  hugeicons?: string
  phosphor?: string
  remixicon?: string
}

export function IconPlaceholder(allProps: IconPlaceholderProps) {
  // Strip the icon-library name props; forward only real SVG props.
  const { lucide, tabler, hugeicons, phosphor, remixicon, ...props } =
    allProps;
  void tabler;
  void hugeicons;
  void phosphor;
  void remixicon;
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<React.SVGProps<SVGSVGElement>>
  >
  const Icon = icons[lucide] ?? icons.CircleIcon
  return <Icon aria-hidden {...props} />
}
