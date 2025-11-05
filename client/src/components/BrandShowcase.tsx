import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

/**
 * Mindefender Brand Showcase
 * Demonstrates all brand elements and styling guidelines
 */
export default function BrandShowcase() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 space-y-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto space-y-4">
        <Logo variant="lockup" size="lg" />
        <h1 className="text-4xl font-semibold leading-tight">
          Mindefender Brand Guidelines
        </h1>
        <p className="text-lg leading-body text-muted-foreground max-w-2xl">
          A comprehensive showcase of the Mindefender brand identity implementation
          in the Mindefender application.
        </p>
      </div>

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Logo Variants */}
        <Card>
          <CardHeader>
            <CardTitle>Logo Variants</CardTitle>
            <CardDescription>
              Logo must maintain clear space (width/2) and minimum sizes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Icon Only
              </h3>
              <div className="flex items-end gap-8 flex-wrap">
                <div className="text-center">
                  <Logo variant="icon" size="sm" />
                  <p className="text-xs text-muted-foreground mt-2">Small (24px min)</p>
                </div>
                <div className="text-center">
                  <Logo variant="icon" size="md" />
                  <p className="text-xs text-muted-foreground mt-2">Medium (32px)</p>
                </div>
                <div className="text-center">
                  <Logo variant="icon" size="lg" />
                  <p className="text-xs text-muted-foreground mt-2">Large (48px)</p>
                </div>
                <div className="text-center">
                  <Logo variant="icon" size="xl" />
                  <p className="text-xs text-muted-foreground mt-2">Extra Large (64px)</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-4">
                Full Lockup
              </h3>
              <div className="space-y-4">
                <div>
                  <Logo variant="lockup" size="sm" />
                  <p className="text-xs text-muted-foreground mt-2">Small (120px min)</p>
                </div>
                <div>
                  <Logo variant="lockup" size="md" />
                  <p className="text-xs text-muted-foreground mt-2">Medium (160px)</p>
                </div>
                <div>
                  <Logo variant="lockup" size="lg" />
                  <p className="text-xs text-muted-foreground mt-2">Large (240px)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Palette */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>
              Mindefender brand colors with semantic meanings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary Gradient */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Primary Gradient
              </h3>
              <div className="flex items-center gap-4">
                <div className="h-16 w-full rounded-lg bg-gradient-primary shadow-lg" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                #00F0FF → #0066FF • Cyan-to-blue signature gradient for CTAs, highlights, shield logo
              </p>
            </div>

            {/* Neutrals */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Neutrals
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="h-16 rounded-lg bg-background border-2 border-border" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Background • #081020
                  </p>
                </div>
                <div>
                  <div className="h-16 rounded-lg bg-foreground" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Foreground • White
                  </p>
                </div>
              </div>
            </div>

            {/* Semantic Colors */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Semantic Colors
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="h-16 rounded-lg bg-info" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Info • #2209EE
                  </p>
                </div>
                <div>
                  <div className="h-16 rounded-lg bg-success" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Success • #108361
                  </p>
                </div>
                <div>
                  <div className="h-16 rounded-lg bg-warning" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Warning • #F5B008
                  </p>
                </div>
                <div>
                  <div className="h-16 rounded-lg bg-critical" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Critical • #FF4444
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
            <CardDescription>
              Inter font family with specified weights and line heights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h1 className="text-4xl font-semibold leading-tight mb-2">
                Heading 1 - Tight (600, 1.1)
              </h1>
              <p className="text-xs text-muted-foreground">
                48px • font-semibold • leading-tight
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-semibold leading-heading mb-2">
                Heading 2 - Standard (600, 1.2)
              </h2>
              <p className="text-xs text-muted-foreground">
                32px • font-semibold • leading-heading
              </p>
            </div>

            <div>
              <p className="text-base leading-body mb-2">
                Body text with comfortable reading line-height. This is how most
                content will appear throughout the application. Weight 400,
                line-height 1.5.
              </p>
              <p className="text-xs text-muted-foreground">
                16px • font-normal • leading-body (1.5)
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground leading-body mb-2">
                Muted text for secondary information and descriptions. Still
                maintains readable contrast at 4.5:1 minimum.
              </p>
              <p className="text-xs text-muted-foreground">
                14px • text-muted-foreground • leading-body
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>
              All button styles with proper focus and hover states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Primary */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Primary (Gradient CTA)
              </h3>
              <div className="flex gap-3 flex-wrap">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large button</Button>
              </div>
            </div>

            {/* Semantic Variants */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Semantic Variants
              </h3>
              <div className="flex gap-3 flex-wrap">
                <Button variant="info">Info action</Button>
                <Button variant="success">Success action</Button>
                <Button variant="warning">Warning action</Button>
                <Button variant="destructive">Critical action</Button>
              </div>
            </div>

            {/* Other Variants */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Other Variants
              </h3>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline">Outline</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link button</Button>
              </div>
            </div>

            {/* States */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                States
              </h3>
              <div className="flex gap-3 flex-wrap">
                <Button disabled>Disabled</Button>
                <Button variant="outline" disabled>Disabled outline</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Layout & Spacing</CardTitle>
            <CardDescription>
              8px spacing grid, 16-20px card radius, soft shadows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Spacing Grid */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                8px Spacing Grid
              </h3>
              <div className="flex gap-2 items-end">
                <div className="h-8 w-8 bg-primary rounded" />
                <div className="h-12 w-8 bg-primary rounded" />
                <div className="h-16 w-8 bg-primary rounded" />
                <div className="h-20 w-8 bg-primary rounded" />
                <div className="h-24 w-8 bg-primary rounded" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                8px, 16px, 24px, 32px, 40px, 48px
              </p>
            </div>

            {/* Shadows */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Soft Shadows (y-offset 8-16px, 10-20% opacity)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-card bg-card shadow-sm border border-border/50">
                  <p className="text-sm font-medium">Small Shadow</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    y=8px, 10% opacity
                  </p>
                </div>
                <div className="p-6 rounded-card bg-card shadow-md border border-border/50">
                  <p className="text-sm font-medium">Medium Shadow</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    y=12px, 15% opacity
                  </p>
                </div>
                <div className="p-6 rounded-card bg-card shadow-lg border border-border/50">
                  <p className="text-sm font-medium">Large Shadow</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    y=16px, 20% opacity
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Indicators */}
        <Card>
          <CardHeader>
            <CardTitle>Status Indicators</CardTitle>
            <CardDescription>
              Visual feedback using semantic colors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-success font-medium">Calm - Normal trading state</span>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
              <span className="text-warning font-medium">Alert - Elevated stress detected</span>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-critical/10 border border-critical/20">
              <div className="h-2 w-2 rounded-full bg-critical animate-pulse" />
              <span className="text-critical font-medium">Stress - Trading paused</span>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg bg-info/10 border border-info/20">
              <div className="h-2 w-2 rounded-full bg-info" />
              <span className="text-info font-medium">Info - System notification</span>
            </div>
          </CardContent>
        </Card>

        {/* Accessibility */}
        <Card>
          <CardHeader>
            <CardTitle>Accessibility</CardTitle>
            <CardDescription>
              WCAG compliant contrast ratios and focus states
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Contrast Ratios
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-foreground">Body text on background</span>
                  <span className="text-success font-medium">18:1 ✓</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                  <span className="text-muted-foreground">Muted text on background</span>
                  <span className="text-success font-medium">7:1 ✓</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Focus States (Try tabbing through)
              </h3>
              <div className="flex gap-3 flex-wrap">
                <Button>Focusable button</Button>
                <Button variant="outline">Outline button</Button>
                <a href="#" className="inline-flex items-center justify-center rounded-lg px-4 py-2 border-2 border-border hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  Focusable link
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Guidelines Quick Reference</CardTitle>
            <CardDescription>
              Do's and don'ts for maintaining brand consistency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-success font-medium mb-3">✓ Do</h3>
                <ul className="space-y-2 text-sm leading-body">
                  <li>• Use gradient for primary CTAs</li>
                  <li>• Use gradient for pause icon</li>
                  <li>• Maintain 8px spacing grid</li>
                  <li>• Use sentence case for buttons</li>
                  <li>• Provide visible focus states</li>
                  <li>• Use semantic colors appropriately</li>
                </ul>
              </div>
              <div>
                <h3 className="text-critical font-medium mb-3">✗ Don't</h3>
                <ul className="space-y-2 text-sm leading-body">
                  <li>• Don't distort or recolor logo</li>
                  <li>• Don't use red for non-critical actions</li>
                  <li>• Don't alter gradient colors</li>
                  <li>• Don't use tight line-height for body text</li>
                  <li>• Don't ignore clear space around logo</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
