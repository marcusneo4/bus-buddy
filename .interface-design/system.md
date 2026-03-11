# Design System — Bus Aunty Dashboard

## Direction
- **Personality:** Data & clarity · Real-time transit
- **Foundation:** Cool (slate/zinc), dark-first
- **Depth:** Borders-only, subtle elevation via border opacity

## Tokens

### Spacing
- Base: **8px**
- Scale: 4, 8, 12, 16, 24, 32

### Colors
- **Background:** black (page), zinc-950 (panels), zinc-900 (cards)
- **Border:** zinc-800 default, zinc-700 focus/hover
- **Foreground:** white (primary text), zinc-400 (secondary), zinc-600 (muted)
- **Accent:** amber (leave/urgent), sky (double deck), violet (bendy), emerald (seats)

### Typography
- **Numbers:** tabular-nums everywhere for alignment
- **Service number:** text-2xl font-black
- **Labels:** text-sm font-semibold; muted text-xs

### Components
- **Card:** border 1px, rounded-xl (12px), padding 16px, gap 12px
- **Button (icon):** 36px touch target, rounded-lg, border zinc-700
- **Chip / Badge:** rounded-lg, px-2.5 py-1.5, border zinc-700/60
- **Input:** rounded-lg, border zinc-700, focus border-zinc-500, py-2

### Motion
- **Transitions:** 200ms for borders/opacity
- **Leave state:** subtle pulse on badge
- **List:** optional stagger (50ms) on first paint

## Patterns
- **Next arrival:** First chip in a card = primary (accent border, "Next" label)
- **Leave progress:** Thin bar (4px) when status = leave; depletes as minsUntilLeave decreases
- **Quick stats:** Compact strip under controls — "Next: 97 in 2 min" · "3 buses in 5 min"
- **Empty state:** Centered icon + message + optional hint
