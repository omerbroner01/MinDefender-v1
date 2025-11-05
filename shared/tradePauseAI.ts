/**
 * Shared types for the TradePause AI-driven assessment pipeline.
 * These types are consumed by both the client and the server so we keep them
 * in the shared workspace folder and expose them through the `@shared/*` alias.
 * 
 * CROSS-PLATFORM COMPATIBILITY:
 * -----------------------------
 * All types in this file are platform-agnostic and work identically on:
 * - Desktop (webcam input)
 * - Mobile (phone camera input)
 * - Tablet devices
 * 
 * The CameraSignals interface receives the same data structure regardless of
 * the input device, ensuring consistent AI decision-making across all platforms.
 * 
 * Key consistency guarantees:
 * - stressScore: Always 0-100 scale
 * - isHighStress: Same threshold (>= 60) on all platforms
 * - signals: Same 0-100 scale for all individual stress indicators
 * - Blink rate calculations: Identical algorithm desktop vs mobile
 * - Decision logic: Platform-independent risk assessment
 */

export interface OrderContext {
  instrument: string;
  size: number;
  orderType: 'market' | 'limit';
  side: 'buy' | 'sell';
  leverage?: number;
  currentPnL?: number;
  recentLosses?: number;
  timeOfDay: string;
  marketVolatility?: number;
}

export interface CameraSignalAverages {
  blinkRate: number;
  browTension: number;
  gazeStability: number;
  headMovement: number;
  microExpressionTension: number;
  lipCompression?: number; // Optional: lip pressing indicator (defaults to 0 if not available)
  jawClench?: number; // Optional: jaw tension indicator (defaults to 0 if not available)
}

export interface CameraSignals {
  /** Normalized 0-1 stress estimate derived from facial micro-expressions. */
  stressLevel: number;
  /** 0-1 agitation proxy based on head motion and rapid expression shifts. */
  agitation: number;
  /** 0-1 focus estimate – higher means user maintained steady gaze. */
  focus: number;
  /** 0-1 fatigue proxy derived from blink behavior and eye aspect ratio. */
  fatigue: number;
  /** 0-1 model confidence, factoring in signal quality and detection stability. */
  confidence: number;
  /** 0-1 signal quality multiplier used by the AI layer. */
  signalQuality: number;
  /** Duration the scan ran for, in milliseconds. */
  durationMs: number;
  /** Count of frames that produced usable landmarks. */
  samples: number;
  /** Aggregated raw averages used for diagnostics. */
  raw: CameraSignalAverages;
  /** Optional warnings or issues captured during the scan. */
  notes?: string[];
  
  // STRESS DETECTION ENHANCEMENT: New comprehensive stress analysis
  /** 0-100 comprehensive stress score from facial indicators */
  stressScore: number;
  /** True if trader shows significant stress (score >= 60) */
  isHighStress: boolean;
  /** Individual stress signals for detailed analysis */
  signals?: {
    browTension: number; // 0-100
    jawClench: number; // 0-100
    blinkRateAbnormal: number; // 0-100
    lipCompression: number; // 0-100
    microExpressionTension: number; // 0-100
    headMovement: number; // 0-100
    gazeInstability: number; // 0-100
  };
}

export interface ImpulseControlMetrics {
  totalTrials: number;
  goAccuracy: number;
  noGoAccuracy: number;
  avgReactionTimeMs: number;
  reactionStdDevMs: number;
  impulsiveErrors: number;
  responseConsistency: number;
  prematureResponses: number;
}

export interface FocusStabilityMetrics {
  totalStimuli: number;
  matchesPresented: number;
  correctMatches: number;
  missedMatches: number;
  falseAlarms: number;
  avgReactionTimeMs: number;
  reactionStdDevMs: number;
  sustainedAttention: number;
}

export interface ReactionConsistencyMetrics {
  trials: number;
  averageMs: number;
  bestMs: number;
  worstMs: number;
  variability: number;
  stabilityScore: number;
  anticipations: number;
  lateResponses: number;
}

export interface FullAssessmentUserState {
  camera: CameraSignals;
  tests: {
    impulseControl: ImpulseControlMetrics;
    focusStability: FocusStabilityMetrics;
    reactionConsistency: ReactionConsistencyMetrics;
  };
}

export interface FullAssessmentRequest {
  userId: string;
  orderContext: OrderContext;
  camera: CameraSignals;
  tests: FullAssessmentUserState['tests'];
}

export interface FullAssessmentResponse {
  allowed: boolean;
  decision: 'allow' | 'cooldown' | 'block';
  emotionalRiskScore: number;
  confidence: number;
  reasoning: string[];
  cooldownSeconds?: number;
  diagnostics: {
    cameraScore: number;
    impulseScore: number;
    focusScore: number;
    reactionScore: number;
    compositeWeights: {
      camera: number;
      impulse: number;
      focus: number;
      reaction: number;
    };
    signalQuality: number;
  };
  assessmentId?: string;
}
