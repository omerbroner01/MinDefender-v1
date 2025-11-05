/**
 * AI Decision Layer - The Gatekeeper
 * 
 * This is the CORE enforcement mechanism for EmotionGuard.
 * It analyzes all collected signals (face metrics, cognitive tests, biometrics)
 * and makes a FINAL, NON-BYPASSABLE decision about whether trading is allowed.
 * 
 * Key Principles:
 * - AI makes the final call, not the user
 * - Decision is binary: allow or deny
 * - No UI bypass mechanisms
 * - Designed to prevent emotional/revenge/panic trading
 * - Conservative approach: when in doubt, block the trade
 */

import { AIScoringService } from './aiScoringService';
import { RiskScoringService } from './riskScoring';
import type { AssessmentSignals, OrderContext } from '../../client/src/types/tradePause';
import type { UserBaseline, Policy } from '@shared/schema';

export interface AIDecisionResult {
  // The final verdict - this is what matters
  shouldAllowTrade: boolean; // Renamed from 'allowed' for API consistency
  
  // Cooldown enforcement (0 if allowed, milliseconds if blocked)
  cooldownMs: number;
  
  // Supporting data for transparency
  emotionalRiskScore: number; // 0-100, renamed from riskScore
  confidence: number; // 0-100 (percentage, not 0-1)
  
  // Detailed analysis
  reason: string; // Primary explanation
  primaryConcerns: string[];
  blockingFactors: string[];
  reasoning: string; // Detailed reasoning
  
  // Intervention recommendations
  recommendedAction: 'allow' | 'cooldown' | 'block' | 'supervisor_review';
  
  // Legacy fields (for backward compatibility)
  allowed?: boolean;
  stressLevel?: number; // 0-10
  cooldownDurationSeconds?: number;
  
  // Audit trail
  timestamp: number;
  signals: {
    cognitive: boolean;
    facial: boolean;
    biometric: boolean;
    selfReport: boolean;
  };
}

/**
 * Core AI Decision Layer Service
 * 
 * This service is the final arbiter for all trading decisions.
 * It combines multiple signal sources and applies AI-driven analysis
 * to determine if a trader is emotionally stable enough to trade.
 */
export class AIDecisionLayer {
  private aiScoring: AIScoringService;
  private riskScoring: RiskScoringService;
  
  // Decision thresholds (conservative by default)
  private readonly BLOCK_THRESHOLD = 75; // Risk score >= 75: immediate block
  private readonly WARNING_THRESHOLD = 60; // Risk score >= 60: warning/cooldown
  private readonly ALLOW_THRESHOLD = 60; // Risk score < 60: allow
  
  // Stress level thresholds
  private readonly CRITICAL_STRESS = 8.0; // Stress >= 8: block
  private readonly HIGH_STRESS = 6.0; // Stress >= 6: warning
  
  // Minimum confidence required for decision
  private readonly MIN_CONFIDENCE = 0.4;
  
  constructor() {
    this.aiScoring = new AIScoringService();
    this.riskScoring = new RiskScoringService();
  }
  
  /**
   * MAIN DECISION FUNCTION
   * 
   * This is the gatekeeper. It analyzes all signals and returns a boolean.
   * If this returns false, trading MUST be blocked.
   * 
   * @param signals - All collected assessment signals (face, cognitive, biometric, self-report)
   * @param orderContext - Context about the trade being attempted
   * @param baseline - User's baseline performance (if available)
   * @param policy - Trading desk policy configuration
   * @param userId - User ID for audit trail
   * @returns AIDecisionResult with allowed=true/false
   */
  async shouldAllowTrade(
    signals: AssessmentSignals,
    orderContext?: OrderContext,
    baseline?: UserBaseline,
    policy?: Policy,
    userId?: string
  ): Promise<AIDecisionResult> {
    console.log('🤖 AI Decision Layer: Evaluating trade permission...');
    const startTime = performance.now();
    
    // Step 1: Validate inputs
    const validationResult = this.validateSignals(signals);
    if (!validationResult.valid) {
      console.warn('⚠️ Insufficient signal quality, blocking trade by default');
      return this.createBlockDecision(
        'Insufficient assessment data',
        ['Incomplete cognitive tests', 'Missing critical signals'],
        0,
        0,
        0.3
      );
    }
    
    // Step 2: AI-powered stress analysis
    const aiAnalysis = await this.aiScoring.analyzeStressSignals(
      signals,
      baseline,
      orderContext
    );
    
    // Step 3: Risk scoring calculation
    const riskResult = await this.riskScoring.calculateRiskScore(
      signals,
      baseline,
      orderContext,
      policy,
      userId
    );
    
    // Step 4: Combine AI + Risk analysis for final decision
    const decision = this.makeDecision(
      aiAnalysis,
      riskResult,
      signals,
      orderContext,
      policy
    );
    
    const analysisTime = performance.now() - startTime;
    console.log(`🤖 AI Decision: ${decision.shouldAllowTrade ? '✅ ALLOW' : '🚫 BLOCK'} (${analysisTime.toFixed(1)}ms)`);
    console.log(`   Risk: ${decision.emotionalRiskScore}/100, Stress: ${decision.stressLevel || 0}/10, Confidence: ${decision.confidence.toFixed(0)}%`);
    
    if (!decision.shouldAllowTrade) {
      console.log(`   Blocking factors: ${decision.blockingFactors.join(', ')}`);
    }
    
    return decision;
  }
  
  /**
   * Validate that we have sufficient signals to make a reliable decision
   */
  private validateSignals(signals: AssessmentSignals): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for cognitive test data
    if (!signals.stroopTrials || signals.stroopTrials.length < 5) {
      issues.push('Insufficient cognitive test data');
    }
    
    // Check for self-report
    if (signals.stressLevel === undefined || signals.stressLevel === null) {
      issues.push('Missing self-reported stress level');
    }
    
    // Facial metrics are optional but recommended
    if (!signals.facialMetrics || !signals.facialMetrics.isPresent) {
      console.warn('⚠️ Facial metrics not available - decision will be less accurate');
    }
    
    // We need at least 2 signal sources for reliable decision
    const signalCount = [
      signals.stroopTrials && signals.stroopTrials.length > 0,
      signals.stressLevel !== undefined && signals.stressLevel !== null,
      signals.facialMetrics && signals.facialMetrics.isPresent,
      signals.mouseMovements && signals.mouseMovements.length > 0
    ].filter(Boolean).length;
    
    if (signalCount < 2) {
      issues.push('Insufficient signal sources (need at least 2)');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Make the final decision based on AI analysis and risk scoring
   */
  private makeDecision(
    aiAnalysis: any,
    riskResult: any,
    signals: AssessmentSignals,
    orderContext?: OrderContext,
    policy?: Policy
  ): AIDecisionResult {
    const concerns: string[] = [];
    const blockingFactors: string[] = [];
    
    // Use policy thresholds if available, otherwise use defaults
    const blockThreshold = policy?.riskThreshold || this.BLOCK_THRESHOLD;
    const warningThreshold = Math.max(50, blockThreshold - 15);
    
    // Extract metrics
    const riskScore = riskResult.riskScore || 0;
    const stressLevel = aiAnalysis.stressLevel || 0;
    const rawConfidence = Math.min(riskResult.confidence || 0, aiAnalysis.confidence || 0);
    
    // Convert confidence to 0-100 scale for API
    const confidencePercentage = Math.round(rawConfidence * 100);
    
    // DECISION RULE 1: Critical stress level (immediate block)
    if (stressLevel >= this.CRITICAL_STRESS) {
      blockingFactors.push(`Critical stress level (${stressLevel.toFixed(1)}/10)`);
    }
    
    // STRESS DETECTION: Check for high stress from facial analysis
    if (signals.facialMetrics?.isHighStress) {
      blockingFactors.push(`High stress detected from facial scan (score: ${signals.facialMetrics.stressScore}/100)`);
    }
    
    // DECISION RULE 2: High risk score (immediate block)
    if (riskScore >= blockThreshold) {
      blockingFactors.push(`High risk score (${riskScore}/100)`);
    }
    
    // DECISION RULE 3: AI verdict (trust the AI model)
    if (aiAnalysis.verdict === 'block') {
      blockingFactors.push('AI model recommends blocking');
      if (aiAnalysis.primaryIndicators && aiAnalysis.primaryIndicators.length > 0) {
        concerns.push(...aiAnalysis.primaryIndicators);
      }
    }
    
    // DECISION RULE 4: Multiple red flags (cumulative risk)
    const redFlags = [
      riskResult.reactionTimeElevated,
      riskResult.accuracyLow,
      riskResult.behavioralAnomalies,
      riskResult.facialStressDetected,
      signals.facialMetrics?.isHighStress, // STRESS DETECTION: Add as red flag
      stressLevel >= this.HIGH_STRESS,
      signals.stressLevel && signals.stressLevel >= 7
    ].filter(Boolean).length;
    
    if (redFlags >= 3) {
      blockingFactors.push(`Multiple stress indicators (${redFlags} detected)`);
    }
    
    // DECISION RULE 5: Dangerous order context
    if (orderContext) {
      if (orderContext.leverage && orderContext.leverage > 15) {
        blockingFactors.push('Extremely high leverage detected');
      }
      if (orderContext.recentLosses && orderContext.recentLosses >= 5) {
        blockingFactors.push('Excessive recent losses (revenge trading risk)');
      }
      if (orderContext.currentPnL && orderContext.currentPnL < -5000) {
        blockingFactors.push('Severe negative P&L (panic trading risk)');
      }
    }
    
    // DECISION RULE 6: Low confidence (block by default when uncertain)
    if (rawConfidence < this.MIN_CONFIDENCE) {
      blockingFactors.push('Low confidence in assessment quality');
    }
    
    // Add warning-level concerns (not blocking, but concerning)
    if (riskScore >= warningThreshold && riskScore < blockThreshold) {
      concerns.push(`Elevated risk score (${riskScore}/100)`);
    }
    if (stressLevel >= this.HIGH_STRESS && stressLevel < this.CRITICAL_STRESS) {
      concerns.push(`High stress level (${stressLevel.toFixed(1)}/10)`);
    }
    // STRESS DETECTION: Add stress score as concern if elevated but not critical
    if (signals.facialMetrics?.stressScore && signals.facialMetrics.stressScore >= 50 && !signals.facialMetrics.isHighStress) {
      concerns.push(`Elevated facial stress score (${signals.facialMetrics.stressScore}/100)`);
    }
    if (riskResult.reactionTimeElevated) {
      concerns.push('Slower reaction times than baseline');
    }
    if (riskResult.accuracyLow) {
      concerns.push('Reduced cognitive accuracy');
    }
    if (riskResult.behavioralAnomalies) {
      concerns.push('Unusual behavioral patterns detected');
    }
    if (riskResult.facialStressDetected) {
      concerns.push('Facial stress indicators detected');
    }
    
    // FINAL DECISION LOGIC
    let shouldAllowTrade = false;
    let recommendedAction: 'allow' | 'cooldown' | 'block' | 'supervisor_review';
    let cooldownMs = 0;
    
    if (blockingFactors.length > 0) {
      // BLOCK: Critical issues detected - ENFORCE COOLDOWN
      shouldAllowTrade = false;
      recommendedAction = 'block';
      
      // Very high risk requires supervisor review + extended cooldown
      if (riskScore >= 85 || stressLevel >= 9) {
        recommendedAction = 'supervisor_review';
        cooldownMs = 15 * 60 * 1000; // 15 minutes
      } else {
        // Standard block: 5-10 minute cooldown based on severity
        const riskRatio = riskScore / 100;
        cooldownMs = Math.round((5 + (riskRatio * 5)) * 60 * 1000); // 5-10 minutes
      }
    } else if (concerns.length >= 2 || riskScore >= warningThreshold) {
      // WARNING: Moderate risk, enforce mandatory cooldown
      shouldAllowTrade = false;
      recommendedAction = 'cooldown';
      
      // Calculate cooldown duration based on risk level (1-5 minutes)
      const riskRatio = Math.max(0, Math.min(1, (riskScore - warningThreshold) / (blockThreshold - warningThreshold)));
      cooldownMs = Math.round((1 + (riskRatio * 4)) * 60 * 1000); // 1-5 minutes
    } else {
      // ALLOW: Low risk, trader is emotionally stable
      shouldAllowTrade = true;
      recommendedAction = 'allow';
      cooldownMs = 0;
    }
    
    // Generate human-readable reasoning
    const reasoning = this.generateReasoning(
      shouldAllowTrade,
      riskScore,
      stressLevel,
      rawConfidence,
      blockingFactors,
      concerns,
      aiAnalysis
    );
    
    // Primary reason for decision
    const reason = shouldAllowTrade 
      ? `Low emotional risk detected. Safe to proceed with trading.`
      : blockingFactors.length > 0
        ? `Trading blocked: ${blockingFactors[0]}`
        : `Cooldown required: ${concerns.slice(0, 2).join(', ')}`;
    
    // Track which signals were available
    const signalAvailability = {
      cognitive: !!(signals.stroopTrials && signals.stroopTrials.length > 0),
      facial: !!(signals.facialMetrics && signals.facialMetrics.isPresent),
      biometric: !!(signals.mouseMovements && signals.mouseMovements.length > 0),
      selfReport: signals.stressLevel !== undefined && signals.stressLevel !== null
    };
    
    return {
      shouldAllowTrade,
      cooldownMs,
      emotionalRiskScore: riskScore,
      confidence: confidencePercentage,
      reason,
      primaryConcerns: concerns.slice(0, 5), // Top 5 concerns
      blockingFactors,
      reasoning,
      recommendedAction,
      // Legacy fields for backward compatibility
      allowed: shouldAllowTrade,
      stressLevel,
      cooldownDurationSeconds: Math.round(cooldownMs / 1000),
      timestamp: Date.now(),
      signals: signalAvailability
    };
  }
  
  /**
   * Generate human-readable reasoning for the decision
   */
  private generateReasoning(
    allowed: boolean,
    riskScore: number,
    stressLevel: number,
    confidence: number,
    blockingFactors: string[],
    concerns: string[],
    aiAnalysis: any
  ): string {
    if (!allowed && blockingFactors.length > 0) {
      return `Trading blocked due to ${blockingFactors.length} critical factor(s): ${blockingFactors.slice(0, 2).join(', ')}. ` +
             `Risk score: ${riskScore}/100, Stress level: ${stressLevel.toFixed(1)}/10. ` +
             `This decision is final and cannot be overridden for safety reasons.`;
    }
    
    if (!allowed && concerns.length > 0) {
      return `Trading temporarily restricted. ${concerns.length} warning sign(s) detected: ${concerns.slice(0, 2).join(', ')}. ` +
             `Please complete the recommended cooldown period to ensure emotional stability.`;
    }
    
    if (allowed) {
      return `Trading approved. Risk score (${riskScore}/100) and stress level (${stressLevel.toFixed(1)}/10) are within acceptable limits. ` +
             `Confidence: ${(confidence * 100).toFixed(0)}%.`;
    }
    
    return `Decision made with ${(confidence * 100).toFixed(0)}% confidence based on available signals.`;
  }
  
  /**
   * Helper to create a block decision (used for validation failures)
   */
  private createBlockDecision(
    reason: string,
    factors: string[],
    emotionalRiskScore: number,
    stressLevel: number,
    rawConfidence: number
  ): AIDecisionResult {
    const confidencePercentage = Math.round(rawConfidence * 100);
    
    return {
      shouldAllowTrade: false,
      cooldownMs: 10 * 60 * 1000, // 10 minute cooldown for validation failures
      emotionalRiskScore,
      confidence: confidencePercentage,
      reason,
      primaryConcerns: [reason],
      blockingFactors: factors,
      reasoning: `Trading blocked: ${reason}. ${factors.join(', ')}.`,
      recommendedAction: 'block',
      // Legacy fields
      allowed: false,
      stressLevel,
      cooldownDurationSeconds: 600,
      timestamp: Date.now(),
      signals: {
        cognitive: false,
        facial: false,
        biometric: false,
        selfReport: false
      }
    };
  }
  
  /**
   * Enforcement check - called by trading infrastructure
   * 
   * This is the function that would be called by the actual trading system
   * before executing any trade. It returns a simple boolean that cannot be bypassed.
   * 
   * @param userId - Trader attempting the trade
   * @param assessmentId - ID of the completed assessment
   * @returns true if trade is allowed, false otherwise
   */
  async enforceTradePermission(
    userId: string,
    assessmentId: string
  ): Promise<{ allowed: boolean; reason: string }> {
    console.log(`🛡️ Enforcing trade permission for user ${userId}, assessment ${assessmentId}`);
    
    // In a real system, this would:
    // 1. Fetch the assessment from the database
    // 2. Verify it's recent (< 5 minutes old)
    // 3. Verify it hasn't been used already
    // 4. Return the stored decision
    
    // For now, this is a placeholder that demonstrates the enforcement pattern
    // The actual implementation would integrate with the database and trading system
    
    return {
      allowed: false,
      reason: 'Enforcement layer not yet connected to trading system'
    };
  }
}

/**
 * Singleton instance for use across the application
 */
export const aiDecisionLayer = new AIDecisionLayer();

/**
 * Convenience function for quick access
 */
export async function shouldAllowTrade(
  signals: AssessmentSignals,
  orderContext?: OrderContext,
  baseline?: UserBaseline,
  policy?: Policy,
  userId?: string
): Promise<AIDecisionResult> {
  return aiDecisionLayer.shouldAllowTrade(signals, orderContext, baseline, policy, userId);
}
