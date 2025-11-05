import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, AlertTriangle, Pause } from "lucide-react";

/**
 * Mindefender Brand Demo Page
 * A practical example showing the brand in a trading context
 */
export default function MindefenderBrandDemo() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header with Logo */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="lockup" size="md" />
            <nav className="flex items-center gap-3">
              <Button variant="ghost">How it works</Button>
              <Button variant="outline">Sign in</Button>
              <Button>Try demo</Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl md:text-6xl font-semibold leading-tight text-gradient-primary">
            AI Safety Layer for Traders
          </h1>
          <p className="text-xl leading-body text-muted-foreground">
            On-device AI that detects trader stress and pauses risky trades. 
            Mindefender analyzes micro-signals, pace, and focus—then shows a rapid risk checklist before high-stakes decisions.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg">Start free trial</Button>
            <Button size="lg" variant="outline">
              Watch demo
            </Button>
          </div>
        </div>
      </section>

      {/* Status Demo */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold leading-heading mb-4">
            Real-time stress monitoring
          </h2>
          <p className="text-lg leading-body text-muted-foreground">
            Visual feedback keeps you informed without overwhelming you
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Calm State */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <CardTitle className="text-lg">Calm</CardTitle>
              </div>
              <CardDescription>
                Normal trading state. All systems operational.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Heart rate</span>
                  <span className="text-success font-medium">Normal</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Facial stress</span>
                  <span className="text-success font-medium">Low</span>
                </div>
                <Button variant="success" className="w-full mt-4">
                  Continue trading
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alert State */}
          <Card className="border-warning/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-3 w-3 rounded-full bg-warning animate-pulse" />
                <CardTitle className="text-lg">Alert</CardTitle>
              </div>
              <CardDescription>
                Elevated stress detected. Consider taking a break.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Heart rate</span>
                  <span className="text-warning font-medium">Elevated</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Facial stress</span>
                  <span className="text-warning font-medium">Moderate</span>
                </div>
                <Button variant="warning" className="w-full mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  Take assessment
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stress State */}
          <Card className="border-critical/50">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-3 w-3 rounded-full bg-critical animate-pulse" />
                <CardTitle className="text-lg">Stress</CardTitle>
              </div>
              <CardDescription>
                High stress detected. Trading paused for safety.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Heart rate</span>
                  <span className="text-critical font-medium">High</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Facial stress</span>
                  <span className="text-critical font-medium">High</span>
                </div>
                <Button variant="destructive" className="w-full mt-4" disabled>
                  <Pause className="h-4 w-4" />
                  Trading paused
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-b from-transparent to-card/30">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold leading-heading mb-4">
            Built for traders who care about longevity
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Activity className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Real-time monitoring</CardTitle>
              <CardDescription>
                Continuous tracking of biometric signals and facial stress indicators
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <TrendingUp className="h-8 w-8 text-success mb-2" />
              <CardTitle>Pattern learning</CardTitle>
              <CardDescription>
                AI adapts to your personal stress patterns for accurate detection
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Pause className="h-8 w-8 text-gradient-primary mb-2" />
              <CardTitle>Automatic protection</CardTitle>
              <CardDescription>
                Trading pauses automatically when stress exceeds safe thresholds
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Card className="bg-gradient-primary">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl font-semibold leading-heading text-white mb-4">
              Ready to trade with confidence?
            </h2>
            <p className="text-lg leading-body text-white/90 mb-8 max-w-2xl mx-auto">
              Join thousands of traders who have improved their discipline and protected their capital with Mindefender.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                Start free trial
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Learn more
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo variant="lockup" size="sm" />
            <p className="text-sm text-muted-foreground">
              © 2025 Mindefender. AI safety layer for smarter trading decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
