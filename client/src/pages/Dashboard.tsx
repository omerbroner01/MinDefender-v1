import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Link } from 'wouter';
import { Shield, PlayCircle, Settings } from 'lucide-react';
import AIAssessmentGate from '@/components/AIAssessmentGate';
import { useTradePause } from '@/hooks/useTradePause';
import type { OrderContext } from '@/types/tradePause';

export default function Dashboard() {
  const [showPreTradeGate, setShowPreTradeGate] = useState(false);
  const [orderAction, setOrderAction] = useState<'buy' | 'sell'>('buy');
  const [orderSize, setOrderSize] = useState('100000');
  const [selectedInstrument, setSelectedInstrument] = useState('EUR/USD');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');

  const handleTradeClick = async (action: 'buy' | 'sell') => {
    setOrderAction(action);
    setShowPreTradeGate(true);
  };

  const handleAllowTrade = () => {
    console.log('✅ Trade ALLOWED by AI');
    setShowPreTradeGate(false);
    // TODO: Execute the actual trade
  };

  const handleDenyTrade = () => {
    console.log('🚫 Trade DENIED by AI');
    setShowPreTradeGate(false);
  };

  const handleCloseGate = () => {
    setShowPreTradeGate(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Mobile Optimized */}
      <header className="bg-card border-b border-border px-3 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="text-lg sm:text-xl font-semibold text-primary" data-testid="logo">Mindefender</div>
            <div className="text-xs sm:text-sm text-muted-foreground hidden sm:block">AI Safety Layer</div>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-chart-1 rounded-full pulse-dot"></div>
              <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">System Online</span>
              <span className="text-xs text-muted-foreground sm:hidden">Online</span>
            </div>
            <Link href="/admin">
              <Button variant="secondary" size="sm" data-testid="button-settings" className="min-h-[40px]">
                Settings
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row">
        {/* Sidebar Navigation - Responsive */}
        <aside className="w-full sm:w-64 bg-card border-b sm:border-b-0 sm:border-r border-border p-2 sm:p-4">
          <nav className="flex sm:flex-col overflow-x-auto sm:overflow-x-visible gap-1 sm:gap-2">
            <Link href="/">
              <span className="flex items-center space-x-2 sm:space-x-3 bg-primary text-primary-foreground px-3 py-2 rounded-md cursor-pointer whitespace-nowrap min-h-[44px]" data-testid="nav-demo">
                <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                <span className="text-sm">Live Demo</span>
              </span>
            </Link>
            <Link href="/admin">
              <div className="flex items-center space-x-2 sm:space-x-3 text-muted-foreground hover:text-foreground px-3 py-2 rounded-md hover:bg-muted smooth-transition cursor-pointer whitespace-nowrap min-h-[44px]" data-testid="nav-admin">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden />
                <span className="text-sm hidden sm:inline">Admin Console</span>
                <span className="text-sm sm:hidden">Admin</span>
              </div>
            </Link>
          </nav>        </aside>

        {/* Main Content - Mobile Optimized */}
        <main className="flex-1 p-3 sm:p-6">
          {/* Hero Demo Explainer */}
          <div className="mb-4 sm:mb-6 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-2 border-primary/20 rounded-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold mb-2">AI Safety Layer for Traders</h1>
                <p className="text-sm sm:text-base text-muted-foreground mb-3">
                  Mindefender uses your camera to detect stress in real time. When stress is high, it pauses trades and shows a rapid risk checklist.
                  <span className="font-semibold text-foreground"> Try clicking BUY or SELL below</span> to see it in action.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Camera detects stress
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Pauses high-risk trades
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Local-only processing
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          
          {/* Trading Interface Demo */}
          <Card className="mb-4 sm:mb-6">
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="text-base sm:text-lg">Simulated Trading Platform</CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
                {/* Market Data */}
                <div className="bg-muted rounded-lg p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3">Market Data</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">EUR/USD</span>
                      <Badge variant="secondary" className="text-chart-1" data-testid="price-eurusd">1.0842 ↑</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">GBP/USD</span>
                      <Badge variant="secondary" className="text-chart-3" data-testid="price-gbpusd">1.2651 ↓</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">USD/JPY</span>
                      <Badge variant="secondary" className="text-chart-1" data-testid="price-usdjpy">149.32 ↑</Badge>
                    </div>
                  </div>
                </div>

                {/* Order Ticket - Mobile Optimized */}
                <div className="bg-muted rounded-lg p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3">Order Ticket</h3>
                  <div className="space-y-3">
                    <Select value={selectedInstrument} onValueChange={setSelectedInstrument}>
                      <SelectTrigger data-testid="select-instrument" className="min-h-[44px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUR/USD">EUR/USD</SelectItem>
                        <SelectItem value="GBP/USD">GBP/USD</SelectItem>
                        <SelectItem value="USD/JPY">USD/JPY</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <Input 
                        type="text" 
                        placeholder="Size" 
                        value={orderSize}
                        onChange={(e) => setOrderSize(e.target.value)}
                        data-testid="input-size"
                        className="min-h-[44px]"
                      />
                      <Select value={orderType} onValueChange={(value: 'market' | 'limit') => setOrderType(value)}>
                        <SelectTrigger data-testid="select-ordertype" className="min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="market">Market</SelectItem>
                          <SelectItem value="limit">Limit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        className="bg-chart-1 text-background hover:bg-chart-1/90 min-h-[48px] text-base font-semibold"
                        onClick={() => handleTradeClick('buy')}
                        data-testid="button-buy"
                      >
                        BUY
                      </Button>
                      <Button 
                        className="bg-chart-3 text-background hover:bg-chart-3/90 min-h-[48px] text-base font-semibold"
                        onClick={() => handleTradeClick('sell')}
                        data-testid="button-sell"
                      >
                        SELL
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Account Info */}
                <div className="bg-muted rounded-lg p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-medium text-muted-foreground mb-3">Account</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Balance</span>
                      <span className="text-sm font-semibold" data-testid="text-balance">$50,284.32</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">P&L Today</span>
                      <span className="text-sm font-semibold text-chart-3" data-testid="text-pnl">-$1,247.15</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Open Positions</span>
                      <span className="text-sm font-semibold" data-testid="text-positions">3</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status - Mobile Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">System Status</p>
                    <p className="text-sm sm:text-lg font-semibold text-chart-1" data-testid="status-system">Online</p>
                  </div>
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-chart-1 rounded-full pulse-dot"></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Response Time</p>
                  <p className="text-sm sm:text-lg font-semibold" data-testid="status-response">1.2s</p>
                  <p className="text-xs text-chart-1">Within target</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Today's Assessments</p>
                  <p className="text-sm sm:text-lg font-semibold" data-testid="status-assessments">247</p>
                  <p className="text-xs text-muted-foreground">4.2% trigger rate</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-3 sm:p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Block Rate</p>
                  <p className="text-sm sm:text-lg font-semibold" data-testid="status-blocks">1.1%</p>
                  <p className="text-xs text-chart-3">↓ 0.2% vs yesterday</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* AI Assessment Gate Modal */}
      {showPreTradeGate && (
        <AIAssessmentGate
          orderContext={{
            instrument: selectedInstrument,
            size: parseInt(orderSize),
            orderType,
            side: orderAction,
            timeOfDay: new Date().toISOString(),
            marketVolatility: 0.6,
          }}
          onAllow={handleAllowTrade}
          onDeny={handleDenyTrade}
          onCancel={handleCloseGate}
        />
      )}
    </div>
  );
}
