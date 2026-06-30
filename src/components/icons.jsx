// Minimal inline SVG icon set — consistent 1.6 stroke, no icon library
const S = ({ children, size = 20, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" {...rest}>{children}</svg>
)

export const IconHome = (p) => <S {...p}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></S>
export const IconBox = (p) => <S {...p}><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5" /><path d="M12 12v9" /></S>
export const IconPlan = (p) => <S {...p}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 9h17M8 3v4M16 3v4" /><path d="m9 14 2 2 4-4" /></S>
export const IconHistory = (p) => <S {...p}><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" /></S>
export const IconSettings = (p) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></S>
export const IconReceipt = (p) => <S {...p}><path d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21z" /><path d="M8 8h8M8 12h8M8 16h5" /></S>
export const IconSpark = (p) => <S {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4" /><path d="M12 8.5 13.2 11 16 12l-2.8 1L12 15.5 10.8 13 8 12l2.8-1z" /></S>
export const IconSearch = (p) => <S {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></S>
export const IconCamera = (p) => <S {...p}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></S>
export const IconUpload = (p) => <S {...p}><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /><path d="M12 3v12M8 7l4-4 4 4" /></S>
export const IconClose = (p) => <S {...p}><path d="m6 6 12 12M18 6 6 18" /></S>
export const IconCheck = (p) => <S {...p}><path d="m4 12 5 5L20 6" /></S>
export const IconPin = (p) => <S {...p}><path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></S>
export const IconClock = (p) => <S {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 1.8" /></S>
export const IconShop = (p) => <S {...p}><path d="M4 7h16l-1 13H5z" /><path d="M9 7V5a3 3 0 0 1 6 0v2" /></S>
export const IconBolt = (p) => <S {...p}><path d="M13 3 4 14h7l-1 7 9-11h-7z" /></S>
export const IconLeaf = (p) => <S {...p}><path d="M5 19c0-7 6-13 14-13 0 8-6 14-14 14" /><path d="M5 19c2-4 5-7 9-9" /></S>
export const IconKey = (p) => <S {...p}><circle cx="8" cy="8" r="4" /><path d="m11 11 8 8M16 16l2-2M14 18l2-2" /></S>
export const IconTrash = (p) => <S {...p}><path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" /></S>
export const IconRefresh = (p) => <S {...p}><path d="M3.5 12a8.5 8.5 0 0 1 14.5-6" /><path d="M20.5 12a8.5 8.5 0 0 1-14.5 6" /><path d="M18 3v3.5h-3.5M6 21v-3.5h3.5" /></S>

// RumaQ brand mark — a home (rumah) with a spark at its core (smart/easy).
// Gradient sky tile ties it to the product accent; white glyph reads at small sizes.
export function BrandMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="url(#rmq-g)" />
      <path d="M16 7 7 14.2V24a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V14.2L16 7z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 15l1.2 2.8 2.8 1.2-2.8 1.2L16 23l-1.2-2.8L12 19l2.8-1.2z" fill="#fff" />
      <defs>
        <linearGradient id="rmq-g" x1="7" y1="4" x2="25" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="oklch(0.62 0.13 230)" />
          <stop offset="1" stopColor="oklch(0.45 0.14 230)" />
        </linearGradient>
      </defs>
    </svg>
  )
}
