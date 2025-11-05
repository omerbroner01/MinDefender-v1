import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Shield, Camera, Brain, Zap, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ImpulseControlTest } from './tests/ImpulseControlTest';
import { StroopColorTest } from './tests/StroopColorTest';
import { ReactionConsistencyTest } from './tests/ReactionConsistencyTest';
import { useEmotionSense } from '@/hooks/useEmotionSense';
import { useTradePause } from '@/hooks/useTradePause';
import type { OrderContext, ImpulseControlMetrics, FocusStabilityMetrics, ReactionConsistencyMetrics, CameraSignals } from '@/types/tradePause';

interface AIAssessmentGateProps {
  orderContext: OrderContext;
  onAllow: () => void;
  onDeny: (reason: string) => void;
  onCancel: () => void;
}

type AssessmentPhase = 
  | 'camera-scan'
  | 'impulse-test'
  | 'focus-test'
  | 'reaction-test'
  | 'ai-evaluation'
  | 'decision';

export default function AIAssessmentGate({ orderContext, onAllow, onDeny, onCancel }: AIAssessmentGateProps) {
  const [phase, setPhase] = useState<AssessmentPhase>('camera-scan');
  const [impulseMetrics, setImpulseMetrics] = useState<ImpulseControlMetrics | null>(null);
  const [focusMetrics, setFocusMetrics] = useState<FocusStabilityMetrics | null>(null);
  const [reactionMetrics, setReactionConsistencyMetrics] = useState<ReactionConsistencyMetrics | null>(null);
  
  const emotionSense = useEmotionSense();
  const { runAssessment, latestDecision, isRunning, error: assessmentError } = useTradePause();
  
  const [cameraScanDuration, setCameraScanDuration] = useState(0);
  const CAMERA_SCAN_SECONDS = 8;
  
  // NEW: Cooldown enforcement state
  const [cooldownActive, setCooldownActive] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Exit confirmation state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Camera scan phase
  useEffect(() => {
    if (phase === 'camera-scan') {
      // Start camera; if autoplay/permission constraints require a gesture, errors will be surfaced below
      emotionSense.start().catch((err) => {
        console.error('Camera start failed:', err);
      });
      
      const interval = setInterval(() => {
        setCameraScanDuration((prev) => {
          if (prev >= CAMERA_SCAN_SECONDS) {
            clearInterval(interval);
            emotionSense.stop();
            setPhase('impulse-test');
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [phase]);

  // Run AI assessment when all metrics are collected
  useEffect(() => {
    if (phase === 'ai-evaluation' && impulseMetrics && focusMetrics && reactionMetrics) {
      // Use camera summary if available, otherwise use empty fallback
      const cameraData: CameraSignals = emotionSense.summary || {
        stressLevel: 0,
        agitation: 0,
        focus: 0,
        fatigue: 0,
        confidence: 0,
        signalQuality: 0,
        durationMs: 0,
        samples: 0,
        stressScore: 0,
        isHighStress: false,
        raw: {
          blinkRate: 0,
          browTension: 0,
          gazeStability: 0,
          headMovement: 0,
          microExpressionTension: 0,
        },
        notes: ['Camera analysis unavailable'],
      };

      console.log('🤖 Starting AI evaluation with metrics:', {
        orderContext,
        camera: cameraData,
        impulse: impulseMetrics,
        focus: focusMetrics,
        reaction: reactionMetrics,
      });

      // Set a fallback timeout in case the API hangs
      const fallbackTimeout = setTimeout(() => {
        console.error('⚠️ AI evaluation timeout (10s) - forcing decision phase with fallback');
        // If we still don't have a decision after 10 seconds, show error state
        if (!latestDecision) {
          console.error('❌ No decision received, UI will show error state');
        }
        setPhase('decision');
      }, 10000); // 10 second timeout

      runAssessment({
        orderContext,
        camera: cameraData,
        tests: {
          impulseControl: impulseMetrics,
          focusStability: focusMetrics,
          reactionConsistency: reactionMetrics,
        },
      }).then((result) => {
        clearTimeout(fallbackTimeout);
        console.log('✅ AI assessment completed successfully:', result);
        setPhase('decision');
      }).catch((err) => {
        clearTimeout(fallbackTimeout);
        console.error('❌ AI assessment failed with error:', err);
        // Force to decision phase - fallback decision was set in useTradePause
        setPhase('decision');
      });
    }
  }, [phase, impulseMetrics, focusMetrics, reactionMetrics, runAssessment, orderContext, latestDecision]);

  const handleImpulseComplete = (metrics: ImpulseControlMetrics) => {
    setImpulseMetrics(metrics);
    setPhase('focus-test');
  };

  const handleFocusComplete = (metrics: FocusStabilityMetrics) => {
    setFocusMetrics(metrics);
    setPhase('reaction-test');
  };

  const handleReactionComplete = (metrics: ReactionConsistencyMetrics) => {
    setReactionConsistencyMetrics(metrics);
    setPhase('ai-evaluation');
  };

  const handleExitAttempt = () => {
    // If we're at the decision phase, allow direct exit
    if (phase === 'decision') {
      handleConfirmExit();
    } else {
      // Otherwise, show confirmation dialog
      setShowExitConfirm(true);
    }
  };

  const handleConfirmExit = () => {
    // Cleanup camera if running
    emotionSense.stop();
    
    // Clear cooldown timer if active
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    
    // Call the cancel callback
    onCancel();
  };

  const handleDecisionAction = () => {
    if (latestDecision?.allowed) {
      onAllow();
    } else {
      // ENFORCED COOLDOWN: Start cooldown timer if decision is deny/cooldown
      if (latestDecision?.cooldownSeconds && latestDecision.cooldownSeconds > 0) {
        startCooldown(latestDecision.cooldownSeconds);
      } else {
        // No cooldown specified, just deny the trade
        onDeny(latestDecision?.reasoning.join(', ') || 'AI blocked trade');
      }
    }
  };
  
  // NEW: Start enforced cooldown - user CANNOT bypass this
  const startCooldown = (durationSeconds: number) => {
    console.log(`🕐 Starting enforced cooldown: ${durationSeconds} seconds`);
    setCooldownActive(true);
    setCooldownRemaining(durationSeconds);
    
    // Clear any existing timer
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }
    
    // Start countdown timer
    cooldownTimerRef.current = setInterval(() => {
      setCooldownRemaining(prev => {
        if (prev <= 1) {
          // Cooldown complete
          if (cooldownTimerRef.current) {
            clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          setCooldownActive(false);
          console.log('✅ Cooldown completed - user may retry assessment');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  // AUTO-START COOLDOWN: Automatically start cooldown when decision requires it
  useEffect(() => {
    if (
      phase === 'decision' && 
      latestDecision && 
      !latestDecision.allowed && 
      latestDecision.cooldownSeconds && 
      latestDecision.cooldownSeconds > 0 &&
      !cooldownActive
    ) {
      console.log(`🚫 Trade blocked with ${latestDecision.cooldownSeconds}s cooldown - auto-starting timer`);
      startCooldown(latestDecision.cooldownSeconds);
    }
  }, [phase, latestDecision, cooldownActive]);

  const getPhaseTitle = () => {
    switch (phase) {
      case 'camera-scan': return 'Camera Analysis';
      case 'impulse-test': return 'Impulse Control Test';
      case 'focus-test': return 'Focus Stability Test';
      case 'reaction-test': return 'Reaction Consistency Test';
      case 'ai-evaluation': return 'AI Evaluation';
      case 'decision': return 'Assessment Complete';
      default: return 'Assessment';
    }
  };

  const getPhaseIcon = () => {
    switch (phase) {
      case 'camera-scan': return <Camera className="w-5 h-5" />;
      case 'impulse-test': return <Zap className="w-5 h-5" />;
      case 'focus-test': return <Brain className="w-5 h-5" />;
      case 'reaction-test': return <Clock className="w-5 h-5" />;
      case 'ai-evaluation': return <Shield className="w-5 h-5 animate-pulse" />;
      case 'decision': 
        return latestDecision?.allowed 
          ? <CheckCircle2 className="w-5 h-5 text-green-500" />
          : <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const progressValue = () => {
    switch (phase) {
      case 'camera-scan': return (cameraScanDuration / CAMERA_SCAN_SECONDS) * 20;
      case 'impulse-test': return 20;
      case 'focus-test': return 40;
      case 'reaction-test': return 60;
      case 'ai-evaluation': return 80;
      case 'decision': return 100;
      default: return 0;
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={(open) => !open && handleExitAttempt()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {getPhaseIcon()}
              <span className="truncate">Mindefender AI Safety Check</span>
            </DialogTitle>
          </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{getPhaseTitle()}</span>
              <span>{Math.round(progressValue())}%</span>
            </div>
            <Progress value={progressValue()} className="h-2" />
          </div>

          {/* Phase Content */}
          {phase === 'camera-scan' && (
            <div className="space-y-4">
              {/* Camera error UX (mobile-friendly) */}
              {emotionSense.error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-1">We couldn't access your camera</div>
                    <div className="text-sm whitespace-pre-line">{emotionSense.error}</div>
                    <div className="text-xs text-muted-foreground mt-2 space-y-1">
                      <p>Tips:</p>
                      <ul className="list-disc ml-4 space-y-1">
                        <li>On mobile, camera requires HTTPS. Open the secure site URL.</li>
                        <li>Allow camera permission when prompted.</li>
                        <li>Close other apps that might be using the camera.</li>
                      </ul>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => emotionSense.start().catch(() => {})}>
                        Retry Camera
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  {emotionSense.summary?.notes && emotionSense.summary.notes.length > 0 
                    ? emotionSense.summary.notes[0]
                    : 'Analyzing facial expressions, stress indicators, and focus stability...'}
                  <br />
                  <strong>Time remaining: {CAMERA_SCAN_SECONDS - cameraScanDuration}s</strong>
                  {emotionSense.summary && emotionSense.summary.samples > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({emotionSense.summary.samples} frames analyzed)
                    </span>
                  )}
                </AlertDescription>
              </Alert>
              
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Stress Level:</span>
                  <Badge variant={(emotionSense.summary?.stressLevel ?? 0) > 0.7 ? 'destructive' : 'secondary'}>
                    {Math.round((emotionSense.summary?.stressLevel ?? 0) * 100)}%
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Agitation:</span>
                  <Badge variant={(emotionSense.summary?.agitation ?? 0) > 0.6 ? 'destructive' : 'secondary'}>
                    {Math.round((emotionSense.summary?.agitation ?? 0) * 100)}%
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Focus:</span>
                  <Badge variant={(emotionSense.summary?.focus ?? 0) < 0.5 ? 'destructive' : 'secondary'}>
                    {Math.round((emotionSense.summary?.focus ?? 0) * 100)}%
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Signal Quality:</span>
                  <Badge variant="outline">
                    {Math.round((emotionSense.summary?.signalQuality ?? 0) * 100)}%
                  </Badge>
                </div>
                
                {/* REAL-TIME STRESS INDICATORS */}
                {emotionSense.summary?.signals && (
                  <>
                    <div className="border-t border-border/50 my-2 pt-2">
                      <div className="text-xs text-muted-foreground mb-2">Real-Time Analysis</div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Brow Tension:</span>
                      <Badge variant={emotionSense.summary.signals.browTension > 60 ? 'destructive' : 'outline'}>
                        {emotionSense.summary.signals.browTension}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Jaw Clench:</span>
                      <Badge variant={emotionSense.summary.signals.jawClench > 60 ? 'destructive' : 'outline'}>
                        {emotionSense.summary.signals.jawClench}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gaze Stability:</span>
                      <Badge variant={emotionSense.summary.signals.gazeInstability > 60 ? 'destructive' : 'outline'}>
                        {100 - emotionSense.summary.signals.gazeInstability}%
                      </Badge>
                    </div>
                  </>
                )}
              </div>

              <video
                ref={emotionSense.videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg border border-border max-h-[300px] sm:max-h-[400px] object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
            </div>
          )}

          {phase === 'impulse-test' && (
            <ImpulseControlTest
              onComplete={handleImpulseComplete}
              onCancel={onCancel}
            />
          )}

          {phase === 'focus-test' && (
            <StroopColorTest
              onComplete={handleFocusComplete}
              onCancel={onCancel}
            />
          )}

          {phase === 'reaction-test' && (
            <ReactionConsistencyTest
              onComplete={handleReactionComplete}
              onCancel={onCancel}
            />
          )}

          {phase === 'ai-evaluation' && (
            <div className="space-y-4 py-8 text-center">
              <Shield className="w-16 h-16 mx-auto text-primary animate-pulse" />
              <h3 className="text-lg font-semibold">AI Analyzing Your Emotional State...</h3>
              <p className="text-sm text-muted-foreground">
                Processing camera signals and cognitive test results
              </p>
              {isRunning && <Progress value={80} className="w-full" />}
            </div>
          )}

          {phase === 'decision' && (
            <div className="space-y-4">
              {latestDecision ? (
                <>
                  {/* Decision Header - FIXED: No white background, clear text contrast */}
                  <div className={`p-6 rounded-lg border-2 ${
                    latestDecision.allowed 
                      ? 'bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/50' 
                      : 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/50'
                  }`}>
                    <div className="flex items-center gap-3 mb-2">
                      {latestDecision.allowed ? (
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                      ) : (
                        <XCircle className="w-8 h-8 text-red-600" />
                      )}
                      <div>
                        <h3 className={`text-xl font-bold ${
                          latestDecision.allowed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                          {latestDecision.allowed ? 'Trade Approved' : 'Trade Blocked'}
                        </h3>
                        <p className="text-sm text-foreground/80">
                          {latestDecision.decision === 'allow' && 'Emotional stability confirmed'}
                          {latestDecision.decision === 'cooldown' && 'Mandatory cooldown period required'}
                          {latestDecision.decision === 'block' && 'Safety threshold exceeded - trading suspended'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* AI Diagnostics - CLEAN: No background, just content */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm text-muted-foreground">AI Risk Assessment</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="text-center p-3 rounded-lg border border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">Emotional Risk Score</div>
                        <div className="text-2xl sm:text-3xl font-bold">{latestDecision.emotionalRiskScore}/100</div>
                      </div>
                      <div className="text-center p-3 rounded-lg border border-border/50">
                        <div className="text-xs text-muted-foreground mb-1">AI Confidence</div>
                        <div className="text-2xl sm:text-3xl font-bold">{Math.round(latestDecision.confidence * 100)}%</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground">Component Scores</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between items-center p-2 rounded border border-border/30">
                          <span className="text-muted-foreground">Camera:</span>
                          <span className="font-semibold">{latestDecision.diagnostics.cameraScore}/100</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded border border-border/30">
                          <span className="text-muted-foreground">Impulse:</span>
                          <span className="font-semibold">{latestDecision.diagnostics.impulseScore}/100</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded border border-border/30">
                          <span className="text-muted-foreground">Focus:</span>
                          <span className="font-semibold">{latestDecision.diagnostics.focusScore}/100</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded border border-border/30">
                          <span className="text-muted-foreground">Reaction:</span>
                          <span className="font-semibold">{latestDecision.diagnostics.reactionScore}/100</span>
                        </div>
                      </div>
                    </div>

                    {latestDecision.reasoning.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <div className="text-xs text-muted-foreground">AI Reasoning</div>
                        <ul className="text-sm space-y-1.5">
                          {latestDecision.reasoning.map((reason, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                              <span>•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* ENFORCED COOLDOWN DISPLAY */}
                  {!latestDecision.allowed && cooldownActive && (
                    <Alert variant="destructive" className="border-2">
                      <Clock className="h-5 w-5" />
                      <AlertDescription className="text-base">
                        <div className="font-bold text-lg mb-2">
                          Mandatory Cooldown Active
                        </div>
                        <div className="text-3xl font-bold mb-2">
                          {Math.floor(cooldownRemaining / 60)}:{(cooldownRemaining % 60).toString().padStart(2, '0')}
                        </div>
                        <Progress value={((latestDecision.cooldownSeconds! - cooldownRemaining) / latestDecision.cooldownSeconds!) * 100} className="mb-2" />
                        <div className="text-sm">
                          You must wait for the cooldown period to complete before attempting another trade.
                          This is a safety measure and cannot be bypassed.
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Show this only if cooldown hasn't started yet (shouldn't happen with auto-start) */}
                  {!latestDecision.allowed && !cooldownActive && latestDecision.cooldownSeconds && latestDecision.cooldownSeconds > 0 && (
                    <Alert variant="destructive">
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        Initiating cooldown period: <strong>{Math.floor(latestDecision.cooldownSeconds / 60)} minutes {latestDecision.cooldownSeconds % 60} seconds</strong>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons - ENFORCED - Mobile Optimized */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    {latestDecision.allowed ? (
                      <Button onClick={handleDecisionAction} className="flex-1 min-h-[48px]" size="lg">
                        Proceed with Trade
                      </Button>
                    ) : cooldownActive ? (
                      <>
                        {/* During cooldown, only cancel is available */}
                        <Button onClick={onCancel} variant="outline" className="flex-1 min-h-[48px]" size="lg" disabled>
                          <Clock className="w-4 h-4 mr-2" />
                          Cooldown Active ({Math.floor(cooldownRemaining / 60)}:{(cooldownRemaining % 60).toString().padStart(2, '0')})
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Cancel is always available */}
                        <Button onClick={onCancel} variant="outline" className="flex-1 min-h-[48px]" size="lg">
                          Cancel Trade
                        </Button>
                        
                        {/* Fallback: Start cooldown button - only if cooldown not already active */}
                        {latestDecision.decision === 'cooldown' && (
                          <Button 
                            onClick={handleDecisionAction} 
                            variant="destructive" 
                            className="flex-1 min-h-[48px]" 
                            size="lg"
                          >
                            Acknowledge Block
                          </Button>
                        )}
                        
                        {/* For 'block' decisions without cooldown, show simple acknowledgment */}
                        {latestDecision.decision === 'block' && !latestDecision.cooldownSeconds && (
                          <Button 
                            onClick={() => onDeny(latestDecision.reasoning.join(', '))} 
                            variant="destructive" 
                            className="flex-1 min-h-[48px]" 
                            size="lg"
                          >
                            Acknowledge Block
                          </Button>
                        )}
                        
                        {/* NO MANUAL OVERRIDE OPTION - Removed any bypass mechanism */}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Assessment failed to complete. Please try again or contact support.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {assessmentError && (
            <Alert variant="destructive">
              <AlertDescription>{assessmentError}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Exit Confirmation Dialog */}
    <Dialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Exit Assessment?</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Are you sure you want to exit this assessment? You'll need to complete the full test again before you can proceed with trading.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => setShowExitConfirm(false)}
            >
              Continue Assessment
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmExit}
            >
              Exit Assessment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
