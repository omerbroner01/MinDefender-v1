import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle2, Timer, Brain } from 'lucide-react';
import type { AssessmentResult } from '@/types/tradePause';

interface RiskDisplayProps {
  assessment: AssessmentResult & {
    shouldAllowTrade?: boolean;
    cooldownMs?: number;
    emotionalRiskScore?: number;
    confidence?: number;
    reason?: string;
    cognitiveAnalytics?: {
      overallScore: number;
      reactionTimeMs: number;
      accuracy: number;
      consistency: number;
      attentionMetrics: {
        focusLapses: number;
        vigilanceDecline: number;
      };
      stressIndicators: {
        performanceDecline: number;
        errorRate: number;
        responseVariability: number;
      };
    };
  };
  onProceed: () => void;
  onCooldown: () => void;
  onBlock: () => void;
  onOverride: () => void;
}

/**
 * COMPLETELY REDESIGNED RISK DISPLAY
 * - NO WHITE BLOCKS
 * - Clean gradient background
 * - Modern card-based design
 * - Clear visual hierarchy
 */
export function RiskDisplay({ assessment, onProceed, onCooldown, onBlock, onOverride }: RiskDisplayProps) {
  const shouldAllowTrade = assessment.shouldAllowTrade ?? (assessment.verdict === 'go');
  const cooldownMs = assessment.cooldownMs ?? 0;
  const riskScore = assessment.emotionalRiskScore ?? assessment.riskScore ?? 0;
  const confidence = assessment.confidence ?? 50;
  const reason = assessment.reason ?? assessment.recommendedAction ?? 'Assessment complete';

  // Determine risk level
  const getRiskLevel = (): 'low' | 'medium' | 'high' => {
    if (riskScore >= 80) return 'high';
    if (riskScore >= 65) return 'medium';
    return 'low';
  };

  const riskLevel = getRiskLevel();
  const cooldownRequired = !shouldAllowTrade && cooldownMs > 0;
  const isBlocked = !shouldAllowTrade && cooldownMs >= 5 * 60 * 1000;

  // Visual styling based on risk level
  const getStatusConfig = () => {
    if (isBlocked) {
      return {
        icon: Shield,
        bgGradient: 'from-red-500/10 to-red-600/5',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-500',
        title: 'Trading Blocked',
        description: `System lock for ${Math.ceil(cooldownMs / 60000)} minutes - high emotional risk detected`
      };
    }

    if (cooldownRequired) {
      return {
        icon: Timer,
        bgGradient: 'from-amber-500/10 to-amber-600/5',
        borderColor: 'border-amber-500/30',
        iconColor: 'text-amber-500',
        title: 'Cooldown Required',
        description: `${Math.ceil(cooldownMs / 60000)} minute break recommended before trading`
      };
    }

    switch (riskLevel) {
      case 'high':
        return {
          icon: AlertTriangle,
          bgGradient: 'from-orange-500/10 to-orange-600/5',
          borderColor: 'border-orange-500/30',
          iconColor: 'text-orange-500',
          title: 'Elevated Emotional Risk',
          description: 'Consider taking a moment before trading'
        };
      case 'medium':
        return {
          icon: AlertTriangle,
          bgGradient: 'from-yellow-500/10 to-yellow-600/5',
          borderColor: 'border-yellow-500/30',
          iconColor: 'text-yellow-600',
          title: 'Moderate Risk Detected',
          description: 'You may proceed with caution'
        };
      default:
        return {
          icon: CheckCircle2,
          bgGradient: 'from-green-500/10 to-green-600/5',
          borderColor: 'border-green-500/30',
          iconColor: 'text-green-500',
          title: 'Ready to Trade',
          description: 'Emotional state within safe parameters'
        };
    }
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      {/* STATUS CARD - Clean gradient design */}
      <div className={`relative bg-gradient-to-br ${status.bgGradient} border ${status.borderColor} rounded-xl p-6`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg bg-card/50 backdrop-blur-sm ${status.iconColor}`}>
            <StatusIcon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-1">{status.title}</h3>
            <p className="text-sm text-muted-foreground">{status.description}</p>
          </div>
        </div>
      </div>

      {/* RISK SCORE CARD - Clean design without white blocks */}
      <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Emotional Risk Score</span>
          <span className="text-3xl font-bold tabular-nums">
            {riskScore}
            <span className="text-lg text-muted-foreground">/100</span>
          </span>
        </div>
        
        <div className="space-y-2">
          <Progress value={riskScore} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Low Risk</span>
            <span>High Risk</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground">AI Confidence</span>
          <span className="text-sm font-semibold">{confidence}%</span>
        </div>

        {reason && (
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground italic">{reason}</p>
          </div>
        )}
      </div>

      {/* COGNITIVE ANALYTICS CARD (if available) */}
      {assessment.cognitiveAnalytics && (
        <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold">Cognitive Performance</h4>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Accuracy</div>
              <div className="font-semibold">{(assessment.cognitiveAnalytics.accuracy * 100).toFixed(0)}%</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Reaction Time</div>
              <div className="font-semibold">{assessment.cognitiveAnalytics.reactionTimeMs}ms</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Focus Lapses</div>
              <div className="font-semibold">{assessment.cognitiveAnalytics.attentionMetrics.focusLapses}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Error Rate</div>
              <div className="font-semibold">{(assessment.cognitiveAnalytics.stressIndicators.errorRate * 100).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="space-y-2">
        {shouldAllowTrade && (
          <Button 
            onClick={onProceed}
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
          >
            ✓ Proceed with Trade
          </Button>
        )}

        {isBlocked && (
          <>
            <Button 
              onClick={onCooldown}
              className="w-full h-12 bg-destructive hover:bg-destructive/90 text-white font-semibold"
            >
              🔒 Complete {Math.ceil(cooldownMs / 60000)}min Cooldown (Mandatory)
            </Button>
            <p className="text-xs text-center text-muted-foreground px-4">
              Trading is locked for your safety. Cooldown cannot be bypassed.
            </p>
          </>
        )}

        {cooldownRequired && !isBlocked && (
          <>
            <Button 
              onClick={onCooldown}
              className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              ⏸ Take {Math.ceil(cooldownMs / 60000)}min Break (Recommended)
            </Button>
            <Button 
              onClick={onOverride}
              variant="outline"
              className="w-full h-10"
            >
              Override with Justification
            </Button>
          </>
        )}

        {!shouldAllowTrade && !cooldownRequired && (
          <Button 
            onClick={onOverride}
            variant="outline"
            className="w-full h-10"
          >
            Request Supervisor Override
          </Button>
        )}
      </div>
    </div>
  );
}
