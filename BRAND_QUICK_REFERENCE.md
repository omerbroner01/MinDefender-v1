# TradePause Brand Quick Reference

## 🎨 Colors

### Primary
```css
Gradient: #8D5EF5 → #00C2FF
Class: bg-gradient-primary
```

### Semantic
```css
Info:     #2209EE  (bg-info, text-info)
Success:  #108361  (bg-success, text-success)
Warning:  #F5B008  (bg-warning, text-warning)
Critical: #FF4444  (bg-critical, text-critical)
```

### Neutrals
```css
Background: #081020  (bg-background)
Foreground: #FFFFFF  (text-foreground)
```

## 📝 Typography

```tsx
// Headings (600 weight)
<h1 className="font-semibold leading-tight">...</h1>      // 1.1
<h2 className="font-semibold leading-heading">...</h2>    // 1.2

// Body (400 weight)
<p className="leading-body">...</p>                       // 1.5

// Buttons (500 weight - automatic)
<Button>Text</Button>
```

## 🔘 Buttons

```tsx
<Button>Primary gradient</Button>
<Button variant="info">Info</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
<Button variant="destructive">Critical</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Subtle</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

## 🏷️ Logo

```tsx
import { Logo } from "@/components/ui/logo";

<Logo variant="icon" size="md" />      // Icon only
<Logo variant="lockup" size="lg" />    // Full lockup

// Sizes: sm (24px), md (32px), lg (48px), xl (64px)
```

## 📦 Cards

```tsx
<Card>                                 // 16px radius, shadow-md
  <CardHeader>
    <CardTitle>...</CardTitle>         // Semibold, leading-heading
    <CardDescription>...</CardDescription>  // Muted, leading-body
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

## 📐 Layout

```css
Spacing:      8px grid (use p-2, p-4, p-6, p-8...)
Card Radius:  16-20px (rounded-card, rounded-xl)
Shadows:      shadow-sm (y=8px), shadow-md (y=12px), shadow-lg (y=16px)
```

## 🎯 Status Indicators

```tsx
// Calm
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-success" />
  <span className="text-success">Calm</span>
</div>

// Alert
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
  <span className="text-warning">Alert</span>
</div>

// Stress
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-critical animate-pulse" />
  <span className="text-critical">Stress</span>
</div>
```

## ✅ Do's

- ✅ Use gradient for primary CTAs
- ✅ Use gradient for pause icon
- ✅ Maintain 8px spacing
- ✅ Use sentence case on buttons
- ✅ Semantic colors for status

## ❌ Don'ts

- ❌ Don't alter logo gradient
- ❌ Don't use red for non-critical
- ❌ Don't distort logo
- ❌ Don't skip focus states
- ❌ Don't ignore clear space

## 🔍 Accessibility

- Body text contrast: ≥4.5:1 ✓
- Large text contrast: ≥3:1 ✓
- Focus rings: 2px visible ✓
- Touch targets: ≥44px ✓

## 📂 Files

- CSS: `client/src/index.css`
- Tailwind: `tailwind.config.ts`
- Button: `client/src/components/ui/button.tsx`
- Card: `client/src/components/ui/card.tsx`
- Logo: `client/src/components/ui/logo.tsx`

## 🎨 Gradient Text

```tsx
<h1 className="text-gradient-primary">TradePause</h1>
```

## 📱 Responsive

All components are mobile-optimized with proper touch targets and spacing.

---

**Need more info?** See `TRADEPAUSE_BRAND_GUIDE.md`
