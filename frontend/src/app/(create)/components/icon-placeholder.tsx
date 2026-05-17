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

export function IconPlaceholder({
  lucide,
  tabler: _tabler,
  hugeicons: _hugeicons,
  phosphor: _phosphor,
  remixicon: _remixicon,
  ...props
}: IconPlaceholderProps) {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<React.SVGProps<SVGSVGElement>>
  >
  const Icon = icons[lucide] ?? icons.CircleIcon
  return <Icon aria-hidden {...props} />
}
