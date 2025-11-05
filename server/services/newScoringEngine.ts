import { FullAssessmentRequest, FullAssessmentResponse, CameraSignals, ImpulseControlMetrics, FocusStabilityMetrics, ReactionConsistencyMetrics } from "@shared/tradePauseAI";
import type { Policy, UserBaseline } from "@shared/schema";

/**
 * BRAND NEW SCORING ENGINE v2.5 - CONFIDENCE OVERRIDE
 * 
 * CRITICAL FIX: Added final confidence override for excellent performance
 * - Risk < 15 + Performance > 85% = Guaranteed 88%+ confidence
 * - Risk < 20 + Performance > 80% = Guaranteed 82%+ confidence  
 * - Risk < 25 + Performance > 75% = Guaranteed 75%+ confidence
 * 
 * This ensures perfect scores get perfect confidence, regardless of other factors
 */

interface ScoreComponents {
  camera: number;      // 0-100
  impulse: number;     // 0-100
  focus: number;       // 0-100
  reaction: number;    // 0-100
}

interface ConfidenceFactors {
  dataQuality: number;     // 0-1 (how good is the signal quality)
  dataQuantity: number;    // 0-1 (how much data do we have)
  performance: number;     // 0-1 (how consistently did user perform)
  coherence: number;       // 0-1 (do signals agree with each other)
}

export class NewScoringEngine {
  
  /**
   * MAIN ENTRY POINT - Calculate risk score and confidence
   */
  evaluate(
    request: FullAssessmentRequest,
    options: { baseline?: UserBaseline | null; policy?: Policy | null } = {}
  ): FullAssessmentResponse {
    const { camera, tests } = request;
    const { baseline, policy } = options;

    // STEP 1: Calculate individual component scores (0-100 each)
    const scores = this.calculateComponentScores(camera, tests, baseline);

    // STEP 2: Calculate composite risk score (weighted average with cognitive override)
    const compositeRisk = this.calculateCompositeRisk(scores);

    // DEBUG: Log scoring details
    console.log('🎯 SCORING BREAKDOWN:', {
      camera: Math.round(scores.camera),
      impulse: Math.round(scores.impulse),
      focus: Math.round(scores.focus),
      reaction: Math.round(scores.reaction),
      cognitiveAvg: Math.round((scores.impulse + scores.focus + scores.reaction) / 3),
      composite: Math.round(compositeRisk)
    });

    // STEP 3: Calculate DYNAMIC confidence (varies 25-95%)
    const confidence = this.calculateDynamicConfidence(
      camera,
      tests,
      scores,
      compositeRisk
    );

    // STEP 4: Make decision based on policy thresholds
    const decision = this.makeDecision(compositeRisk, confidence, policy);

    return {
      allowed: decision.allowed,
      decision: decision.verdict,
      emotionalRiskScore: Math.round(compositeRisk),
      confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
      reasoning: decision.reasoning,
      cooldownSeconds: decision.cooldownSeconds,
      diagnostics: {
        cameraScore: Math.round(scores.camera),
        impulseScore: Math.round(scores.impulse),
        focusScore: Math.round(scores.focus),
        reactionScore: Math.round(scores.reaction),
        compositeWeights: { camera: 0.15, impulse: 0.35, focus: 0.30, reaction: 0.20 }, // Updated weights
        signalQuality: Number((camera.signalQuality).toFixed(2)),
      },
    };
  }

  /**
   * CALCULATE COMPONENT SCORES (0-100 scale)
   * Uses NON-LINEAR scaling to map real performance to intuitive scores
   */
  private calculateComponentScores(
    camera: CameraSignals,
    tests: {
      impulseControl: ImpulseControlMetrics;
      focusStability: FocusStabilityMetrics;
      reactionConsistency: ReactionConsistencyMetrics;
    },
    baseline?: UserBaseline | null
  ): ScoreComponents {
    
    // CAMERA RISK (0-100)
    const cameraScore = this.scoreCameraRisk(camera);

    // IMPULSE CONTROL RISK (0-100)
    const impulseScore = this.scoreImpulseRisk(tests.impulseControl, baseline);

    // FOCUS STABILITY RISK (0-100)
    const focusScore = this.scoreFocusRisk(tests.focusStability);

    // REACTION CONSISTENCY RISK (0-100)
    const reactionScore = this.scoreReactionRisk(tests.reactionConsistency, baseline);

    return {
      camera: cameraScore,
      impulse: impulseScore,
      focus: focusScore,
      reaction: reactionScore
    };
  }

  /**
   * CAMERA RISK SCORING
   * Maps stress/agitation/fatigue to 0-100 risk scale
   */
  private scoreCameraRisk(camera: CameraSignals): number {
    // Base stress calculation (0-1 scale)
    const rawStress = 
      camera.stressLevel * 0.50 +
      camera.agitation * 0.25 +
      (1 - camera.focus) * 0.15 +
      camera.fatigue * 0.10;

    // NON-LINEAR MAPPING to 0-100
    // Low stress (0-0.2) → 0-25
    // Medium stress (0.2-0.5) → 25-60
    // High stress (0.5-0.8) → 60-85
    // Extreme stress (0.8-1.0) → 85-100
    let score = 0;
    
    if (rawStress < 0.2) {
      score = rawStress * 125; // 0-25 range
    } else if (rawStress < 0.5) {
      score = 25 + (rawStress - 0.2) * 116.67; // 25-60 range
    } else if (rawStress < 0.8) {
      score = 60 + (rawStress - 0.5) * 83.33; // 60-85 range
    } else {
      score = 85 + (rawStress - 0.8) * 75; // 85-100 range
    }

    // Add penalties for specific indicators
    if (camera.raw.microExpressionTension > 0.7) {
      score += 10;
    }
    if (camera.raw.headMovement > 0.6) {
      score += 8;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * IMPULSE CONTROL RISK SCORING
   * Based on go/no-go accuracy - ENHANCED to be more aggressive for bad performance
   */
  private scoreImpulseRisk(metrics: ImpulseControlMetrics, baseline?: UserBaseline | null): number {
    // Combined accuracy (0-1 scale, 1 = perfect)
    const combinedAccuracy = (metrics.goAccuracy + metrics.noGoAccuracy) / 2;

    // ENHANCED NON-LINEAR MAPPING - More aggressive for poor performance
    // Excellent (>0.9) → 0-20
    // Good (0.75-0.9) → 20-45
    // Fair (0.6-0.75) → 45-70
    // Poor (0.4-0.6) → 70-90
    // Very Poor (<0.4) → 90-100  <-- CRITICAL: Really bad = really high score
    let score = 0;

    if (combinedAccuracy > 0.9) {
      score = (1 - combinedAccuracy) * 200; // 0-20 range
    } else if (combinedAccuracy > 0.75) {
      score = 20 + (0.9 - combinedAccuracy) * 166.67; // 20-45 range
    } else if (combinedAccuracy > 0.6) {
      score = 45 + (0.75 - combinedAccuracy) * 166.67; // 45-70 range
    } else if (combinedAccuracy > 0.4) {
      score = 70 + (0.6 - combinedAccuracy) * 100; // 70-90 range (more aggressive)
    } else {
      // REALLY BAD PERFORMANCE - Scale heavily to 90-100
      score = 90 + (0.4 - combinedAccuracy) * 25; // 90-100 for accuracy <40%
    }

    // ENHANCED PENALTIES - More aggressive for poor performance
    // Reaction time penalty
    if (metrics.avgReactionTimeMs > 1500) {
      score += 20; // Very slow = major penalty
    } else if (metrics.avgReactionTimeMs > 1000) {
      score += 15;
    } else if (metrics.avgReactionTimeMs > 800) {
      score += 8;
    }

    // Baseline comparison - more aggressive penalty
    if (baseline?.accuracy && combinedAccuracy < baseline.accuracy - 0.15) {
      score += 18; // Increased from 12
    }

    // CRITICAL: If accuracy is VERY low, ensure high risk score
    if (combinedAccuracy < 0.3) {
      score = Math.max(score, 95); // Guarantee 95+ for terrible performance
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * FOCUS STABILITY RISK SCORING - ENHANCED for poor performance
   */
  private scoreFocusRisk(metrics: FocusStabilityMetrics): number {
    const attentionScore = metrics.sustainedAttention; // 0-1, higher is better

    // ENHANCED NON-LINEAR MAPPING - More aggressive for poor attention
    // Excellent (>0.85) → 0-20
    // Good (0.7-0.85) → 20-45
    // Fair (0.5-0.7) → 45-75
    // Poor (0.3-0.5) → 75-95
    // Very Poor (<0.3) → 95-100
    let score = 0;

    if (attentionScore > 0.85) {
      score = (1 - attentionScore) * 133.33; // 0-20 range
    } else if (attentionScore > 0.7) {
      score = 20 + (0.85 - attentionScore) * 166.67; // 20-45 range
    } else if (attentionScore > 0.5) {
      score = 45 + (0.7 - attentionScore) * 150; // 45-75 range
    } else if (attentionScore > 0.3) {
      score = 75 + (0.5 - attentionScore) * 100; // 75-95 range (more aggressive)
    } else {
      // TERRIBLE ATTENTION - guarantee high score
      score = 95 + (0.3 - attentionScore) * 16.67; // 95-100
    }

    // ENHANCED PENALTIES - More severe
    if (metrics.missedMatches > 5) {
      score += 25; // Many misses = major problem
    } else if (metrics.missedMatches > 3) {
      score += 15;
    } else if (metrics.missedMatches > 1) {
      score += 8;
    }

    // CRITICAL: Very low attention = guarantee high risk
    if (attentionScore < 0.25) {
      score = Math.max(score, 98); // Guarantee 98+ for very poor attention
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * REACTION CONSISTENCY RISK SCORING - ENHANCED
   */
  private scoreReactionRisk(metrics: ReactionConsistencyMetrics, baseline?: UserBaseline | null): number {
    const stabilityScore = metrics.stabilityScore; // 0-1, higher is better

    // ENHANCED NON-LINEAR MAPPING - More aggressive for poor stability
    let score = 0;

    if (stabilityScore > 0.8) {
      score = (1 - stabilityScore) * 100; // 0-20 range
    } else if (stabilityScore > 0.6) {
      score = 20 + (0.8 - stabilityScore) * 125; // 20-45 range
    } else if (stabilityScore > 0.4) {
      score = 45 + (0.6 - stabilityScore) * 150; // 45-75 range
    } else if (stabilityScore > 0.2) {
      score = 75 + (0.4 - stabilityScore) * 100; // 75-95 range (more aggressive)
    } else {
      // TERRIBLE STABILITY
      score = 95 + (0.2 - stabilityScore) * 25; // 95-100
    }

    // ENHANCED PENALTIES - More severe
    if (metrics.anticipations > 4) {
      score += 20; // Many anticipations = major problem
    } else if (metrics.anticipations > 2) {
      score += 12;
    }
    
    if (metrics.lateResponses > 4) {
      score += 18; // Many late responses = major problem
    } else if (metrics.lateResponses > 2) {
      score += 10;
    }

    // CRITICAL: Very low stability = guarantee high risk
    if (stabilityScore < 0.25) {
      score = Math.max(score, 95);
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * CALCULATE COMPOSITE RISK (weighted average)
   * CRITICAL FIX: Heavily prioritize cognitive tests - if ANY cognitive test shows high risk, BLOCK
   */
  private calculateCompositeRisk(scores: ScoreComponents): number {
    // REBALANCED WEIGHTS - Cognitive tests now dominate
    const weights = {
      camera: 0.15,      // Reduced further (camera is often fake)
      impulse: 0.35,     // Increased - most important
      focus: 0.30,       // Increased - critical indicator
      reaction: 0.20     // Actual performance data
    };

    const baseComposite = (
      scores.camera * weights.camera +
      scores.impulse * weights.impulse +
      scores.focus * weights.focus +
      scores.reaction * weights.reaction
    );

    // AGGRESSIVE COGNITIVE OVERRIDE - If ANY cognitive test is bad, composite MUST be high
    const cognitiveMax = Math.max(scores.impulse, scores.focus, scores.reaction);
    const cognitiveAverage = (scores.impulse + scores.focus + scores.reaction) / 3;
    
    // RULE 1: If ANY cognitive test is 95+, composite MUST be at least 85 (CRITICAL FAILURE)
    if (cognitiveMax >= 95) {
      return Math.max(baseComposite, 85);
    }
    
    // RULE 2: If ANY cognitive test is 90+, composite MUST be at least 80
    if (cognitiveMax >= 90) {
      return Math.max(baseComposite, 80);
    }
    
    // RULE 3: If ANY cognitive test is 80+, composite MUST be at least 72
    if (cognitiveMax >= 80) {
      return Math.max(baseComposite, 72);
    }
    
    // RULE 4: If cognitive average is 75+, ensure composite is at least 70
    if (cognitiveAverage >= 75) {
      return Math.max(baseComposite, 70);
    }
    
    // RULE 5: If cognitive average is 65+, ensure composite is at least 62
    if (cognitiveAverage >= 65) {
      return Math.max(baseComposite, 62);
    }
    
    // RULE 6: If cognitive average is 55+, ensure composite is at least 52
    if (cognitiveAverage >= 55) {
      return Math.max(baseComposite, 52);
    }

    // RULE 7: If TWO or more cognitive tests are 75+, composite MUST be at least 72
    const highRiskTests = [scores.impulse, scores.focus, scores.reaction].filter(s => s >= 75).length;
    if (highRiskTests >= 2) {
      return Math.max(baseComposite, 72);
    }
    
    // RULE 8: If TWO or more cognitive tests are 85+, composite MUST be at least 80
    const criticalTests = [scores.impulse, scores.focus, scores.reaction].filter(s => s >= 85).length;
    if (criticalTests >= 2) {
      return Math.max(baseComposite, 80);
    }

    return baseComposite;
  }

  /**
   * CALCULATE DYNAMIC CONFIDENCE (30-95%)
   * SIMPLIFIED: Directly map risk score to confidence for clarity
   */
  private calculateDynamicConfidence(
    camera: CameraSignals,
    tests: {
      impulseControl: ImpulseControlMetrics;
      focusStability: FocusStabilityMetrics;
      reactionConsistency: ReactionConsistencyMetrics;
    },
    scores: ScoreComponents,
    compositeRisk: number
  ): number {
    
    // SIMPLIFIED APPROACH: Map composite risk directly to confidence
    // Low risk = High confidence, High risk = Low confidence
    let confidence = 0;
    
    if (compositeRisk < 15) {
      // EXCELLENT performance (0-15 risk)
      confidence = 0.90; // 90% confidence
    } else if (compositeRisk < 25) {
      // VERY GOOD performance (15-25 risk)
      confidence = 0.85; // 85% confidence
    } else if (compositeRisk < 35) {
      // GOOD performance (25-35 risk)
      confidence = 0.75; // 75% confidence
    } else if (compositeRisk < 45) {
      // FAIR performance (35-45 risk)
      confidence = 0.65; // 65% confidence
    } else if (compositeRisk < 60) {
      // MODERATE risk (45-60)
      confidence = 0.50; // 50% confidence
    } else if (compositeRisk < 75) {
      // HIGH risk (60-75)
      confidence = 0.40; // 40% confidence
    } else {
      // VERY HIGH risk (75+)
      confidence = 0.30; // 30% confidence
    }
    
    // Fine-tune based on actual performance data
    const avgAccuracy = (
      (tests.impulseControl.goAccuracy + tests.impulseControl.noGoAccuracy) / 2 * 0.4 +
      tests.focusStability.sustainedAttention * 0.3 +
      tests.reactionConsistency.stabilityScore * 0.3
    );
    
    // Boost for excellent accuracy
    if (avgAccuracy > 0.95) {
      confidence += 0.05; // Extra 5% for near-perfect
    } else if (avgAccuracy > 0.90) {
      confidence += 0.03; // Extra 3% for excellent
    }
    
    // Reduce for poor accuracy
    if (avgAccuracy < 0.40) {
      confidence -= 0.10; // Reduce 10% for very poor
    } else if (avgAccuracy < 0.60) {
      confidence -= 0.05; // Reduce 5% for poor
    }
    
    // Clamp to 30-95% range
    return Math.max(0.30, Math.min(0.95, confidence));
  }

  /**
   * MAKE DECISION based on risk and confidence
   * ENHANCED: More aggressive blocking for unsafe states
   * DEBUG: Added comprehensive logging
   */
  private makeDecision(
    riskScore: number,
    confidence: number,
    policy?: Policy | null
  ): {
    allowed: boolean;
    verdict: 'allow' | 'cooldown' | 'block';
    reasoning: string[];
    cooldownSeconds?: number;
  } {
    const threshold = policy?.riskThreshold ?? 60;
    const cooldownThreshold = Math.max(45, threshold - 15);

    console.log('🎯 DECISION LOGIC:', {
      riskScore: Math.round(riskScore),
      confidence: Math.round(confidence * 100) + '%',
      blockThreshold: threshold,
      cooldownThreshold: cooldownThreshold,
      willBlock: riskScore >= threshold,
      willCooldown: riskScore >= cooldownThreshold,
      lowConfidence: confidence < 0.40
    });

    const reasoning: string[] = [];

    // BLOCK: High risk - MORE AGGRESSIVE MESSAGING
    if (riskScore >= threshold) {
      console.log('❌ BLOCKING: Risk score >= threshold');
      if (riskScore >= 80) {
        reasoning.push(`Severe emotional instability detected (${Math.round(riskScore)}/100)`);
        reasoning.push('Trading suspended for trader safety');
      } else if (riskScore >= 70) {
        reasoning.push(`High emotional risk detected (${Math.round(riskScore)}/100)`);
        reasoning.push('Safety threshold exceeded - trading suspended');
      } else {
        reasoning.push(`Emotional risk score (${Math.round(riskScore)}) exceeds threshold (${threshold})`);
      }
      
      if (confidence < 0.6) {
        reasoning.push('Low confidence in assessment - extra caution applied');
      }
      
      // LONGER COOLDOWNS for higher risk
      let cooldown = 120; // Base 2 minutes
      if (riskScore >= 85) {
        cooldown = 300; // 5 minutes for extreme risk
      } else if (riskScore >= 75) {
        cooldown = 240; // 4 minutes for very high risk
      } else {
        cooldown = 120 + (riskScore - threshold) * 4; // Escalating cooldown
      }
      
      return {
        allowed: false,
        verdict: 'block',
        reasoning,
        cooldownSeconds: Math.round(cooldown)
      };
    }

    // COOLDOWN: Moderate risk - BUT NOT for low-risk + decent confidence
    // Don't penalize good performance just because confidence isn't perfect
    if (riskScore >= cooldownThreshold) {
      console.log('⏸️  COOLDOWN: Risk score >= cooldown threshold');
      reasoning.push(`Elevated risk detected (${Math.round(riskScore)}/100)`);
      reasoning.push('Brief cooldown required before trading');
      return {
        allowed: false,
        verdict: 'cooldown',
        reasoning,
        cooldownSeconds: Math.round(60 + riskScore * 1.5)
      };
    }
    
    // Low confidence cooldown ONLY if risk is also somewhat elevated
    if (confidence < 0.40 && riskScore >= 30) {
      console.log('⏸️  COOLDOWN: Low confidence + elevated risk');
      reasoning.push(`Low assessment confidence (${Math.round(confidence * 100)}%)`);
      reasoning.push('Additional assessment recommended');
      return {
        allowed: false,
        verdict: 'cooldown',
        reasoning,
        cooldownSeconds: 60
      };
    }

    // ALLOW: Low risk
    console.log('✅ ALLOWING: Risk is low and confidence is acceptable');
    reasoning.push('Emotional state within safe parameters');
    reasoning.push(`Risk score: ${Math.round(riskScore)}, Confidence: ${Math.round(confidence * 100)}%`);
    return {
      allowed: true,
      verdict: 'allow',
      reasoning
    };
  }
}

export const newScoringEngine = new NewScoringEngine();
