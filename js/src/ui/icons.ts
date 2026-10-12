import { svg, type SVGTemplateResult } from 'lit';

/**
 * Small outline icons (24x24, stroke = currentColor). Components pick one by
 * name in their attribute; unknown names fall back to "square".
 */
const PATHS: Record<string, SVGTemplateResult> = {
  square: svg`<rect x="4" y="4" width="16" height="16" rx="3"/>`,
  text: svg`<path d="M4 7h16M4 12h10M4 17h7"/>`,
  paragraph: svg`<path d="M4 6h16M4 10h16M4 14h16M4 18h9"/>`,
  'text-block': svg`<path d="M5 6h14M5 10h14M5 14h10"/><path d="M5 18h6"/>`,
  heading: svg`<path d="M6 5v14M18 5v14M6 12h12"/>`,
  mail: svg`<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>`,
  hash: svg`<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>`,
  calendar: svg`<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>`,
  radio: svg`<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>`,
  checkbox: svg`<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8 12 3 3 5-6"/>`,
  signature: svg`<path d="M3 17c3-1 4-8 6-8s1 7 3 7 2-4 4-4 2 2 5 2"/><path d="M3 21h18"/>`,
  lock: svg`<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>`,
  grip: svg`<circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>`,
  plus: svg`<path d="M12 5v14M5 12h14"/>`,
  trash: svg`<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>`,
  up: svg`<path d="m6 15 6-6 6 6"/>`,
  down: svg`<path d="m6 9 6 6 6-6"/>`,
  settings: svg`<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>`,
  close: svg`<path d="M6 6l12 12M18 6 6 18"/>`,
  alert: svg`<path d="M12 4 2 20h20L12 4z"/><path d="M12 10v4M12 17v.5"/>`,
};

export function icon(name: string, label?: string): SVGTemplateResult {
  return svg`<svg class="formy-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
    stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
    role=${label ? 'img' : 'presentation'} aria-label=${label ?? ''} aria-hidden=${label ? 'false' : 'true'}>${PATHS[name] ?? PATHS.square}</svg>`;
}
