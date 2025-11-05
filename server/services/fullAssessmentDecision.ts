import { FullAssessmentRequest, FullAssessmentResponse, CameraSignals, ImpulseControlMetrics, FocusStabilityMetrics, ReactionConsistencyMetrics } from "@shared/tradePauseAI";
import type { Policy, UserBaseline } from "@shared/schema";

interface ComponentEvaluation {
  risk: number;
  reasons: string[];
  warnings: string[];
  confidence: number;
}

interface CompositeWeights {
  camera: number;
  impulse: number;
  focus: number;
  reaction: number;
}

export interface FullAssessmentEvaluation {
  response: FullAssessmentResponse;
  componentRisks: {
    camera: number;
    impulse: number;
    focus: number;
    reaction: number;
    composite: number;
  };
  reasons: string[];
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export class FullAssessmentDecisionEngine {
  evaluate(
    request: FullAssessmentRequest,
    options: { baseline?: UserBaseline | null; policy?: Policy | null } = {}
  ): FullAssessmentEvaluation {
    const { camera, tests } = request;
    const { baseline, policy } = options;

    const cameraEvaluation = this.evaluateCamera(camera);
    const impulseEvaluation = this.evaluateImpulseControl(tests.impulseControl, baseline);
    const focusEvaluation = this.evaluateFocusStability(tests.focusStability);
    const reactionEvaluation = this.evaluateReactionConsistency(tests.reactionConsistency, baseline);

    const weights = this.resolveWeights(policy, {
      hasCamera: camera.signalQuality > 0,
      hasImpulse: tests.impulseControl.totalTrials > 0,
      hasFocus: tests.focusStability.totalStimuli > 0,
      hasReaction: tests.reactionConsistency.trials > 0,
    });

    const componentRisks = {
      camera: cameraEvaluation.risk,
      impulse: impulseEvaluation.risk,
      focus: focusEvaluation.risk,
      reaction: reactionEvaluation.risk,
    };

    const compositeRisk = this.combineRisk(componentRisks, weights);
    const reasoning = this.compileReasoning([
      cameraEvaluation,
      impulseEvaluation,
      focusEvaluation,
      reactionEvaluation,
    ]);

    const signalQuality = this.calculateSignalQuality(camera, [
      cameraEvaluation.confidence,
      impulseEvaluation.confidence,
      focusEvaluation.confidence,
      reactionEvaluation.confidence,
    ]);

    let confidence = this.aggregateConfidence([
      cameraEvaluation.confidence,
      impulseEvaluation.confidence,
      focusEvaluation.confidence,
      reactionEvaluation.confidence,
    ], camera.confidence);

    // FULLY DYNAMIC CONFIDENCE: Varies based on actual performance and quality
    // Start with base confidence from signal aggregation
    
    // 1. Signal quality modulation - quality affects confidence significantly
    if (signalQuality >= 0.8) {
      confidence = Math.min(1.0, confidence * 1.3); // Excellent signal quality
    } else if (signalQuality >= 0.65) {
      confidence = Math.min(1.0, confidence * 1.15); // Good signal quality
    } else if (signalQuality >= 0.45) {
      confidence = Math.min(1.0, confidence * 1.05); // Acceptable signal quality
    } else if (signalQuality < 0.3) {
      confidence = confidence * 0.7; // Poor signal quality reduces confidence
    }
    
    // 2. Performance-based confidence: actual test accuracy matters
    const avgAccuracy = (
      impulseEvaluation.confidence * 0.3 +
      focusEvaluation.confidence * 0.3 +
      reactionEvaluation.confidence * 0.2 +
      cameraEvaluation.confidence * 0.2
    );
    
    // Performance directly modulates confidence
    if (avgAccuracy > 0.85) {
      confidence = Math.min(1.0, confidence + 0.15); // Excellent performance
    } else if (avgAccuracy > 0.75) {
      confidence = Math.min(1.0, confidence + 0.10); // Very good performance
    } else if (avgAccuracy > 0.65) {
      confidence = Math.min(1.0, confidence + 0.05); // Good performance
    } else if (avgAccuracy < 0.5) {
      confidence = Math.max(0.25, confidence - 0.1); // Poor performance reduces confidence
    }
    
    // 3. Risk coherence: when all signals agree, confidence increases
    const riskSpread = Math.max(
      Math.abs(cameraEvaluation.risk - impulseEvaluation.risk),
      Math.abs(focusEvaluation.risk - reactionEvaluation.risk)
    );
    
    if (riskSpread < 15) {
      confidence = Math.min(1.0, confidence + 0.08); // High coherence bonus
    } else if (riskSpread > 40) {
      confidence = Math.max(0.3, confidence - 0.05); // Low coherence penalty
    }
    
    // 4. Trial count confidence: more data = more confidence
    const totalTrials = 
      tests.impulseControl.totalTrials +
      tests.focusStability.totalStimuli +
      tests.reactionConsistency.trials;
    
    if (totalTrials > 50) {
      confidence = Math.min(1.0, confidence + 0.05); // Rich data bonus
    } else if (totalTrials < 20) {
      confidence = Math.max(0.25, confidence - 0.05); // Sparse data penalty
    }
    
    // Final bounds: ensure confidence varies across full realistic range
    confidence = Math.max(0.25, Math.min(0.95, confidence));

    const policyRiskThreshold = policy?.riskThreshold ?? 65;
    const cooldownThreshold = Math.max(50, policyRiskThreshold - 12);

    let decision: FullAssessmentResponse['decision'];
    let allowed = true;
    let cooldownSeconds: number | undefined;

    const highComponentBlock =
      cameraEvaluation.risk >= policyRiskThreshold + 8 ||
      impulseEvaluation.risk >= policyRiskThreshold + 12 ||
      (focusEvaluation.risk >= policyRiskThreshold && reactionEvaluation.risk >= policyRiskThreshold);

    if (compositeRisk >= policyRiskThreshold || highComponentBlock) {
      decision = 'block';
      allowed = false;
      reasoning.unshift('Composite emotional risk exceeds policy threshold');
    } else if (
      compositeRisk >= cooldownThreshold ||
      signalQuality < 0.4 ||
      confidence < 0.5 ||
      cameraEvaluation.risk >= cooldownThreshold + 8
    ) {
      decision = 'cooldown';
      allowed = false;
      cooldownSeconds = this.estimateCooldown(compositeRisk, policy?.cooldownDuration ?? 90);
      if (signalQuality < 0.4) {
        reasoning.push('Signal quality is marginal – caution advised');
      }
      if (confidence < 0.5) {
        reasoning.push('Assessment confidence is low – enforcing cooldown');
      }
    } else {
      decision = 'allow';
    }

    const response: FullAssessmentResponse = {
      allowed,
      decision,
      emotionalRiskScore: Math.round(compositeRisk),
      confidence: Number(confidence.toFixed(2)),
      reasoning: reasoning.slice(0, 6),
      cooldownSeconds,
      diagnostics: {
        cameraScore: Math.round(componentRisks.camera),
        impulseScore: Math.round(componentRisks.impulse),
        focusScore: Math.round(componentRisks.focus),
        reactionScore: Math.round(componentRisks.reaction),
        compositeWeights: weights,
        signalQuality: Number(signalQuality.toFixed(2)),
      },
    };

    return {
      response,
      componentRisks: {
        ...componentRisks,
        composite: compositeRisk,
      },
      reasons: reasoning,
    };
  }

  private evaluateCamera(camera: CameraSignals): ComponentEvaluation {
    const focusDeficit = 1 - camera.focus;
    
    // STRESS DETECTION UPGRADE: Use the new stressScore if available
    // This is the comprehensive stress score from facial analysis (0-100)
    // If not available, fall back to legacy stressLevel calculation
    const primaryStressIndicator = camera.stressScore !== undefined 
      ? camera.stressScore / 100  // Convert 0-100 to 0-1
      : camera.stressLevel;        // Use legacy 0-1 stressLevel
    
    // BASE RISK: Weighted combination of stress indicators (0-1 scale)
    const baseRisk =
      primaryStressIndicator * 0.45 +  // Primary stress indicator (now using stressScore when available)
      camera.agitation * 0.25 +          // Secondary stress
      focusDeficit * 0.20 +              // Focus issues
      camera.fatigue * 0.10;             // Fatigue factor

    // REALISTIC SCALING: Map 0-1 to realistic 0-100 range
    // Most normal users should fall in 20-60 range
    // Poor performance = 60-85
    // Very poor = 85-100
    let risk = baseRisk * 85; // Scale to 0-85 base
    
    // Additional penalties for specific severe indicators
    if (camera.raw.microExpressionTension > 0.6) {
      risk += Math.pow(camera.raw.microExpressionTension - 0.6, 0.9) * 15;
    }
    
    if (camera.raw.headMovement > 0.5) {
      risk += Math.pow(camera.raw.headMovement - 0.5, 0.9) * 15;
    }

    // STRESS DETECTION: If high stress is detected, increase risk
    if (camera.isHighStress) {
      risk = Math.max(risk, 65); // Ensure high stress results in at least moderate-high risk
      risk += 10; // Add penalty for confirmed high stress
    }

    // Very low signal quality indicates uncertainty, not necessarily high risk
    if (camera.signalQuality < 0.2 && risk < 30) {
      risk = Math.max(risk, 25); // Minimal baseline for very poor signals
    }

    // Ensure full range usage: 0-100
    risk = Math.max(0, Math.min(100, risk));

    const reasons: string[] = [];
    const warnings: string[] = [];

    // STRESS DETECTION: Add specific reasons for high stress
    if (camera.isHighStress) {
      reasons.push(`High stress detected from facial analysis (score: ${camera.stressScore}/100)`);
      
      // Add specific stress signals if available
      if (camera.signals) {
        const topSignals = [];
        if (camera.signals.browTension >= 60) topSignals.push('brow tension');
        if (camera.signals.jawClench >= 60) topSignals.push('jaw clenching');
        if (camera.signals.microExpressionTension >= 60) topSignals.push('micro-expressions');
        if (camera.signals.gazeInstability >= 60) topSignals.push('gaze instability');
        if (camera.signals.lipCompression >= 60) topSignals.push('lip compression');
        
        if (topSignals.length > 0) {
          reasons.push(`Stress indicators: ${topSignals.join(', ')}`);
        }
      }
    } else if (primaryStressIndicator >= 0.7) {
      reasons.push(`Facial stress level high (${Math.round(primaryStressIndicator * 100)}%)`);
    }
    
    if (camera.agitation >= 0.6) {
      reasons.push('Agitation indicators elevated');
    }
    if (focusDeficit >= 0.4) {
      reasons.push('Focus instability detected in gaze patterns');
    }
    if (camera.fatigue >= 0.6) {
      reasons.push('Eye fatigue indicators present');
    }
    if (camera.signalQuality < 0.35) {
      warnings.push('Camera signal quality degraded');
    }

    const confidence = clamp((camera.confidence * 0.6) + (camera.signalQuality * 0.4), 0, 1);

    return {
      risk,
      reasons,
      warnings,
      confidence,
    };
  }

  private evaluateImpulseControl(metrics: ImpulseControlMetrics, baseline?: UserBaseline | null): ComponentEvaluation {
    const trials = Math.max(1, metrics.totalTrials);
    
    // Calculate deficits (0 = perfect, 1 = complete failure)
    const goDeficit = 1 - metrics.goAccuracy;
    const noGoDeficit = 1 - metrics.noGoAccuracy;
    const impulseRatio = metrics.impulsiveErrors / trials;
    const prematureRatio = metrics.prematureResponses / trials;
    const consistencyPenalty = 1 - metrics.responseConsistency;

    // REACTION TIME PENALTY: Realistic scaling
    let reactionPenalty = 0;
    if (metrics.avgReactionTimeMs > 0) {
      const baselineReaction = baseline?.reactionTimeMs ?? 550;
      const delta = metrics.avgReactionTimeMs - baselineReaction;
      
      if (delta > 100) {
        // Progressive penalty: moderate for slow, severe for very slow
        reactionPenalty = Math.min(0.6, delta / 800);
      }
      
      // Absolute thresholds for very slow reactions
      if (metrics.avgReactionTimeMs > 1000) {
        reactionPenalty = Math.max(reactionPenalty, 0.6); // Very slow
      } else if (metrics.avgReactionTimeMs > 800) {
        reactionPenalty = Math.max(reactionPenalty, 0.4); // Slow
      }
    }

    // CALCULATE RISK: Weighted component risk (0-1 scale)
    const componentRisk = 
      goDeficit * 0.20 +           // Missing go signals
      noGoDeficit * 0.30 +         // Impulse control failures (most important)
      impulseRatio * 0.20 +        // Impulsive error rate
      prematureRatio * 0.10 +      // Premature responses
      consistencyPenalty * 0.10 +  // Response consistency
      reactionPenalty * 0.10;      // Reaction time

    // REALISTIC SCALING to 0-100
    // Good performance (< 0.3 risk) = 0-35
    // Medium performance (0.3-0.6) = 35-65
    // Poor performance (> 0.6) = 65-100
    let risk = componentRisk * 90; // Base scale to 0-90

    // BASELINE COMPARISON: Additional penalty if significantly worse than baseline
    if (baseline?.accuracy) {
      const combinedAccuracy = (metrics.goAccuracy + metrics.noGoAccuracy) / 2;
      const baselineDeficit = Math.max(0, baseline.accuracy - combinedAccuracy);
      if (baselineDeficit > 0.15) {
        risk += baselineDeficit * 25; // Significant decline from baseline
      }
    }

    // Ensure full range 0-100
    risk = Math.max(0, Math.min(100, risk));

    const reasons: string[] = [];
    const warnings: string[] = [];

    if (metrics.noGoAccuracy < 0.8) {
      reasons.push('Impulse control lapses during inhibition trials');
    }
    if (metrics.goAccuracy < 0.85) {
      reasons.push(`Go trial accuracy low (${Math.round(metrics.goAccuracy * 100)}%)`);
    }
    if (metrics.impulsiveErrors > 0) {
      reasons.push(`${metrics.impulsiveErrors} impulsive error${metrics.impulsiveErrors > 1 ? 's' : ''} detected`);
    }
    if (metrics.responseConsistency < 0.7) {
      warnings.push('Reaction timing inconsistency observed');
    }
    if (reactionPenalty > 0.3) {
      warnings.push(`Slow reaction times detected (avg: ${Math.round(metrics.avgReactionTimeMs)}ms)`);
    }

    // ENHANCED: Confidence reflects trial count and consistency
    const confidenceBase = clamp(metrics.totalTrials / 12, 0.35, 1);
    const consistencyBonus = metrics.responseConsistency * 0.15;
    const confidence = clamp(confidenceBase + consistencyBonus, 0.35, 1);

    return {
      risk,
      reasons,
      warnings,
      confidence,
    };
  }

  private evaluateFocusStability(metrics: FocusStabilityMetrics): ComponentEvaluation {
    const matches = Math.max(1, metrics.matchesPresented);
    const totalStimuli = Math.max(1, metrics.totalStimuli);

    // Calculate penalties (0 = perfect, 1 = complete failure)
    const sustainedPenalty = 1 - metrics.sustainedAttention;
    const missRatio = metrics.missedMatches / matches;
    const falseAlarmRatio = metrics.falseAlarms / totalStimuli;
    const variabilityPenalty = Math.min(0.8, metrics.reactionStdDevMs / Math.max(metrics.avgReactionTimeMs || 1, 1));

    // CALCULATE RISK: Weighted component risk (0-1 scale)
    const componentRisk =
      sustainedPenalty * 0.35 +    // Sustained attention (most important)
      missRatio * 0.30 +           // Missed targets
      falseAlarmRatio * 0.20 +     // False alarms
      variabilityPenalty * 0.15;   // Response variability

    // REALISTIC SCALING to 0-100
    // Excellent (< 0.2) = 0-25
    // Good (0.2-0.4) = 25-50
    // Fair (0.4-0.6) = 50-70
    // Poor (> 0.6) = 70-100
    let risk = componentRisk * 95; // Scale to use most of range

    // Ensure full range 0-100
    risk = Math.max(0, Math.min(100, risk));

    const reasons: string[] = [];
    const warnings: string[] = [];

    if (metrics.sustainedAttention < 0.7) {
      reasons.push('Sustained attention fell below safe threshold');
    }
    if (metrics.missedMatches > 0) {
      warnings.push(`${metrics.missedMatches} target matches were missed`);
    }
    if (metrics.falseAlarms > 1) {
      warnings.push('False alarms indicate vigilance drift');
    }

    const confidence = clamp(totalStimuli / 60, 0.4, 1);

    return {
      risk,
      reasons,
      warnings,
      confidence,
    };
  }

  private evaluateReactionConsistency(metrics: ReactionConsistencyMetrics, baseline?: UserBaseline | null): ComponentEvaluation {
    const trials = Math.max(1, metrics.trials);
    
    // Calculate penalties (0 = perfect, 1 = complete failure)
    const stabilityPenalty = 1 - metrics.stabilityScore;
    const variabilityRatio = clamp(metrics.variability / Math.max(metrics.averageMs || 1, 1), 0, 1);
    const anticipationRatio = metrics.anticipations / trials;
    const lateRatio = metrics.lateResponses / trials;

    let baselinePenalty = 0;
    if (baseline?.reactionTimeStdDev) {
      const delta = metrics.variability - baseline.reactionTimeStdDev;
      if (delta > 25) {
        // Penalty for significant increase in variability vs baseline
        baselinePenalty = Math.min(0.3, delta / 120);
      }
    }

    // CALCULATE RISK: Weighted component risk (0-1 scale)
    const componentRisk =
      stabilityPenalty * 0.35 +     // Stability is key
      variabilityRatio * 0.25 +     // Variability in timing
      anticipationRatio * 0.20 +    // Anticipatory errors
      lateRatio * 0.20;             // Late responses

    // REALISTIC SCALING to 0-100
    let risk = componentRisk * 90; // Base scale

    // Add baseline penalty
    risk += baselinePenalty * 20;
    
    // Ensure full range 0-100
    risk = Math.max(0, Math.min(100, risk));

    const reasons: string[] = [];
    const warnings: string[] = [];

    if (metrics.stabilityScore < 0.6) {
      reasons.push('Reaction timing stability degraded');
    }
    if (metrics.anticipations > 0) {
      warnings.push(`${metrics.anticipations} anticipatory responses detected`);
    }
    if (metrics.lateResponses > 0) {
      warnings.push(`${metrics.lateResponses} late responses recorded`);
    }

    const confidence = clamp(trials / 12, 0.35, 1);

    return {
      risk,
      reasons,
      warnings,
      confidence,
    };
  }

  private resolveWeights(policy: Policy | null | undefined, availability: { hasCamera: boolean; hasImpulse: boolean; hasFocus: boolean; hasReaction: boolean; }): CompositeWeights {
    const baseWeights: CompositeWeights = {
      camera: availability.hasCamera ? 0.35 : 0,
      impulse: availability.hasImpulse ? 0.25 : 0,
      focus: availability.hasFocus ? 0.2 : 0,
      reaction: availability.hasReaction ? 0.2 : 0,
    };

    const enabled = (policy?.enabledModes ?? {}) as Partial<Record<'cognitiveTest' | 'behavioralBiometrics' | 'selfReport' | 'voiceProsody' | 'facialExpression', boolean>>;
    if (Object.keys(enabled).length > 0) {
      if (enabled.facialExpression === false) baseWeights.camera = 0;
      if (enabled.cognitiveTest === false) {
        baseWeights.impulse = 0;
        baseWeights.focus = 0;
        baseWeights.reaction = 0;
      }
      if (enabled.behavioralBiometrics === false) {
        baseWeights.reaction = 0;
      }
    }

    const total = baseWeights.camera + baseWeights.impulse + baseWeights.focus + baseWeights.reaction;
    if (total === 0) {
      return { camera: 0.35, impulse: 0.25, focus: 0.2, reaction: 0.2 };
    }

    return {
      camera: baseWeights.camera / total,
      impulse: baseWeights.impulse / total,
      focus: baseWeights.focus / total,
      reaction: baseWeights.reaction / total,
    };
  }

  private combineRisk(risks: { camera: number; impulse: number; focus: number; reaction: number; }, weights: CompositeWeights): number {
    return (
      risks.camera * weights.camera +
      risks.impulse * weights.impulse +
      risks.focus * weights.focus +
      risks.reaction * weights.reaction
    );
  }

  private compileReasoning(components: ComponentEvaluation[]): string[] {
    const reasons: string[] = [];
    components.forEach((component) => {
      reasons.push(...component.reasons);
      component.warnings.forEach((warning) => {
        if (!reasons.includes(warning)) {
          reasons.push(warning);
        }
      });
    });
    return reasons;
  }

  private calculateSignalQuality(camera: CameraSignals, componentConfidence: number[]): number {
    const meanConfidence = componentConfidence.reduce((sum, value) => sum + value, 0) / componentConfidence.length;
    return clamp((camera.signalQuality * 0.6) + (meanConfidence * 0.4), 0, 1);
  }

  private aggregateConfidence(componentConfidence: number[], cameraConfidence: number): number {
    const meanConfidence = componentConfidence.reduce((sum, value) => sum + value, 0) / componentConfidence.length;
    return clamp(cameraConfidence * 0.4 + meanConfidence * 0.6, 0, 1);
  }

  private estimateCooldown(riskScore: number, policyCooldown: number): number {
    const normalizedRisk = clamp(riskScore / 100, 0, 1);
    const base = Math.max(45, policyCooldown);
    const extension = normalizedRisk * 75;
    return Math.round(base + extension);
  }
}

export const fullAssessmentDecisionEngine = new FullAssessmentDecisionEngine();
