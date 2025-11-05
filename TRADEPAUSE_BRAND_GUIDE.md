# TradePause Brand Implementation Guide

## Overview
This document outlines how the TradePause brand guidelines have been implemented in the EmotionGuard application.

## Brand Identity

### Logo
- **Component**: `client/src/components/ui/logo.tsx`
- **Usage**: 
  ```tsx
  import { Logo } from "@/components/ui/logo";
  
  // Icon only
  <Logo variant="icon" size="md" />
  
  // Full lockup
  <Logo variant="lockup" size="lg" />
  ```
- **Guidelines**:
  - Icon minimum: 24px
  - Lockup minimum: 120px wide
  - Clear space: icon width / 2
  - Never alter gradient or distort

### Color Palette

#### Primary Colors
- **Primary Gradient**: `#8D5EF5 → #00C2FF`
  - CSS Variables: `--primary-from`, `--primary-to`
  - Tailwind: `bg-gradient-primary`
  - Usage: CTAs, highlights, pause icon

#### Neutrals
- **Background**: `#081020` (rgb: 8, 16, 32)
  - CSS Variable: `--background`
  - Tailwind: `bg-background`
- **Foreground**: White (rgb: 255, 255, 255)
  - CSS Variable: `--foreground`
  - Tailwind: `text-foreground`

#### Semantic Colors
- **Info**: `#2209EE` (rgb: 34, 9, 238)
  - CSS Variable: `--info`
  - Tailwind: `bg-info`, `text-info`
  - Button variant: `variant="info"`
  
- **Success**: `#108361` (rgb: 16, 131, 97)
  - CSS Variable: `--success`
  - Tailwind: `bg-success`, `text-success`
  - Button variant: `variant="success"`
  
- **Warning**: `#F5B008` (rgb: 245, 176, 8)
  - CSS Variable: `--warning`
  - Tailwind: `bg-warning`, `text-warning`
  - Button variant: `variant="warning"`
  
- **Critical**: `#FF4444` (rgb: 255, 68, 68)
  - CSS Variable: `--critical`
  - Tailwind: `bg-critical`, `text-critical`
  - Button variant: `variant="destructive"`

### Typography

#### Font Family
- **Primary**: Inter
- **Fallbacks**: system-ui, -apple-system, sans-serif
- **Implementation**: Already configured via `--font-sans`

#### Font Weights
- **Headings**: 600 (semibold)
- **Body**: 400 (normal)
- **Buttons**: 500 (medium)

#### Line Heights
- **Tight Headings**: 1.1 (`leading-tight`)
- **Standard Headings**: 1.2 (`leading-heading`)
- **Body Text**: 1.5 (`leading-body`)

#### Usage Examples
```tsx
// Heading with brand styling
<h1 className="text-4xl font-semibold leading-tight">
  Stop emotional trades
</h1>

// Body text
<p className="text-base leading-body">
  Proactive monitoring for safer trading decisions.
</p>

// Button text (automatically applied via Button component)
<Button>Try demo</Button>
```

### Layout & Spacing

#### Spacing Grid
- **Base Unit**: 8px (`0.5rem`)
- **Implementation**: `--spacing` variable
- **Usage**: Use multiples of 8px for consistent spacing

#### Border Radius
- **Cards**: 16-20px
  - Tailwind: `rounded-card` (16px default)
  - Can use `rounded-xl` (20px)
- **Buttons**: 12px
  - Tailwind: `rounded-lg`

#### Shadows
Soft shadows with y-offset 8-16px, 10-20% opacity:
- **Small**: `shadow-sm` (y=8px, 10% opacity)
- **Medium**: `shadow-md` (y=12px, 15% opacity)
- **Large**: `shadow-lg` (y=16px, 20% opacity)

### Components

#### Buttons
**Location**: `client/src/components/ui/button.tsx`

**Variants**:
- `default` - Primary gradient CTA
- `destructive` - Critical actions (red)
- `outline` - Secondary actions
- `ghost` - Subtle actions
- `info` - Informational actions (blue)
- `success` - Success actions (green)
- `warning` - Warning actions (yellow)

**Sizes**:
- `sm` - 36px height
- `default` - 40px height
- `lg` - 48px height

**Examples**:
```tsx
// Primary CTA with gradient
<Button>Start session</Button>

// Critical action
<Button variant="destructive">Delete account</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Success action
<Button variant="success">Confirm</Button>
```

#### Cards
**Location**: `client/src/components/ui/card.tsx`

**Features**:
- 16px border radius
- Soft shadow (md)
- Proper spacing (8px grid)
- Brand typography

**Example**:
```tsx
<Card>
  <CardHeader>
    <CardTitle>Session Summary</CardTitle>
    <CardDescription>
      Your trading session from today
    </CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

### Accessibility

#### Contrast Ratios
All color combinations meet WCAG standards:
- **Body text**: ≥4.5:1 (white on #081020 = 18:1 ✓)
- **Large text**: ≥3:1 (all headings pass ✓)

#### Focus States
- Visible focus rings on all interactive elements
- 2px ring with primary color
- 2px offset for clarity

#### Hover States
- Opacity change (90%) for buttons
- Background change for ghost/outline variants
- Scale animation (0.98) for primary buttons

## Brand Tone

### Voice & Messaging
- **Tone**: Calm authority
- **Focus**: Safety-first without fear
- **Characteristics**: Proactive, reliable, focused

### Do's
✅ Use gradient for primary CTAs  
✅ Use gradient for pause icon  
✅ Maintain consistent spacing (8px grid)  
✅ Use sentence case for buttons  
✅ Provide visible focus states  
✅ Use semantic colors appropriately  

### Don'ts
❌ Don't distort or recolor the logo  
❌ Don't use red for non-critical actions  
❌ Don't alter the gradient colors  
❌ Don't use tight line-height for body text  
❌ Don't ignore clear space around logo  

## Quick Reference

### Common Patterns

**Primary CTA**:
```tsx
<Button size="lg">Try demo</Button>
```

**Alert Status Indicator**:
```tsx
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-critical animate-pulse" />
  <span className="text-critical font-medium">Alert</span>
</div>
```

**Status Bar (Calm → Alert → Stress)**:
```tsx
<div className="h-2 rounded-full gradient-progress" />
```

**Gradient Text**:
```tsx
<h1 className="text-4xl font-semibold text-gradient-primary">
  TradePause
</h1>
```

## Files Modified

1. **`client/src/index.css`** - CSS variables and utilities
2. **`tailwind.config.ts`** - Tailwind theme configuration
3. **`client/src/components/ui/button.tsx`** - Button variants
4. **`client/src/components/ui/card.tsx`** - Card styling
5. **`client/src/components/ui/logo.tsx`** - Logo component (new)

## Testing Brand Implementation

To verify the brand is implemented correctly:

1. Check logo minimum sizes are respected
2. Verify gradient appears on primary buttons
3. Confirm semantic colors are used appropriately
4. Test focus states with keyboard navigation
5. Verify contrast ratios with browser tools
6. Check spacing consistency (8px grid)
7. Validate typography line-heights

## Support

For questions about brand implementation, refer to:
- This guide
- Component source files
- Tailwind config for color tokens
- CSS custom properties in index.css
