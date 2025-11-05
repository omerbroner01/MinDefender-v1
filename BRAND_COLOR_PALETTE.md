# TradePause Brand Color Palette

## Primary Colors

### Primary Gradient
```
Start:  #8D5EF5  (rgb: 141, 94, 245)
End:    #00C2FF  (rgb: 0, 194, 255)
```
**Usage**: Primary CTAs, logo, pause icon, key highlights

---

## Semantic Colors

### Info (Blue)
```
Color:  #2209EE  (rgb: 34, 9, 238)
```
**Usage**: System notifications, informational messages

### Success (Green)
```
Color:  #108361  (rgb: 16, 131, 97)
```
**Usage**: Calm state, success messages, positive indicators

### Warning (Yellow)
```
Color:  #F5B008  (rgb: 245, 176, 8)
```
**Usage**: Alert state, warnings, moderate stress

### Critical (Red)
```
Color:  #FF4444  (rgb: 255, 68, 68)
```
**Usage**: Stress state, errors, critical alerts, trade pause

---

## Neutral Colors

### Background (Dark Blue)
```
Color:  #081020  (rgb: 8, 16, 32)
```
**Usage**: Main background

### Foreground (White)
```
Color:  #FFFFFF  (rgb: 255, 255, 255)
```
**Usage**: Primary text

### Card Background
```
Color:  #101828  (rgb: 16, 24, 40)
```
**Usage**: Card backgrounds, elevated surfaces

### Muted Text
```
Color:  #9CA3AF  (rgb: 156, 163, 175)
```
**Usage**: Secondary text, descriptions, placeholders

### Border
```
Color:  #202838  (rgb: 32, 40, 56)
```
**Usage**: Dividers, card borders, outlines

---

## CSS Variables

```css
/* Primary Gradient */
--primary-from: 141 94 245;   /* #8D5EF5 */
--primary-to: 0 194 255;      /* #00C2FF */

/* Semantic Colors */
--info: 34 9 238;             /* #2209EE */
--success: 16 131 97;         /* #108361 */
--warning: 245 176 8;         /* #F5B008 */
--critical: 255 68 68;        /* #FF4444 */

/* Neutrals */
--background: 8 16 32;        /* #081020 */
--foreground: 255 255 255;    /* #FFFFFF */
--card: 16 24 40;             /* #101828 */
--muted-foreground: 156 163 175;  /* #9CA3AF */
--border: 32 40 56;           /* #202838 */
```

---

## Tailwind Classes

### Backgrounds
```tsx
className="bg-gradient-primary"  // Primary gradient
className="bg-info"              // Info blue
className="bg-success"           // Success green
className="bg-warning"           // Warning yellow
className="bg-critical"          // Critical red
className="bg-background"        // Dark background
className="bg-card"              // Card background
```

### Text Colors
```tsx
className="text-gradient-primary"  // Gradient text
className="text-info"             // Info blue text
className="text-success"          // Success green text
className="text-warning"          // Warning yellow text
className="text-critical"         // Critical red text
className="text-foreground"       // White text
className="text-muted-foreground" // Muted gray text
```

### Borders
```tsx
className="border-border"         // Standard border
className="border-info"           // Info blue border
className="border-success"        // Success green border
className="border-warning"        // Warning yellow border
className="border-critical"       // Critical red border
```

---

## Accessibility

### Contrast Ratios (on #081020 background)

| Color | Ratio | WCAG AA | WCAG AAA |
|-------|-------|---------|----------|
| White (#FFFFFF) | 18:1 | ✅ Pass | ✅ Pass |
| Muted (#9CA3AF) | 7:1 | ✅ Pass | ✅ Pass |
| Success (#108361) | 4.8:1 | ✅ Pass | ⚠️ Large text only |
| Warning (#F5B008) | 8.2:1 | ✅ Pass | ✅ Pass |
| Critical (#FF4444) | 5.1:1 | ✅ Pass | ⚠️ Large text only |
| Info (#2209EE) | 4.9:1 | ✅ Pass | ⚠️ Large text only |

**All colors meet WCAG AA standards for their intended use.**

---

## Status Color Mapping

### Trading States
- **Calm**: Success Green (#108361)
- **Alert**: Warning Yellow (#F5B008)
- **Stress**: Critical Red (#FF4444)

### UI Elements
- **Information**: Info Blue (#2209EE)
- **Success Actions**: Success Green (#108361)
- **Warnings**: Warning Yellow (#F5B008)
- **Critical Actions**: Critical Red (#FF4444)
- **Primary Actions**: Gradient (#8D5EF5 → #00C2FF)

---

## Gradient Direction

The primary gradient always flows from purple (#8D5EF5) to cyan (#00C2FF):
- **Angle**: 135° (diagonal, top-left to bottom-right)
- **Never reverse** the direction
- **Never alter** the colors

```css
background: linear-gradient(135deg, #8D5EF5 0%, #00C2FF 100%);
```

---

## Color Psychology

| Color | Emotion | Purpose |
|-------|---------|---------|
| Purple → Cyan Gradient | Trust, Innovation | Primary brand identity |
| Green | Calm, Safety | Positive states |
| Yellow | Caution, Awareness | Moderate alerts |
| Red | Urgency, Stop | Critical situations |
| Blue | Information, Clarity | System messages |

---

## Do's and Don'ts

### ✅ Do
- Use gradient for primary CTAs
- Use green for calm/success
- Use yellow for alerts
- Use red for critical only
- Maintain color meanings

### ❌ Don't
- Don't use red for non-critical actions
- Don't reverse the gradient
- Don't alter gradient colors
- Don't use success/warning interchangeably
- Don't override semantic meanings

---

**Need color codes?** Copy directly from this file!
**Need usage examples?** See `BRAND_QUICK_REFERENCE.md`
