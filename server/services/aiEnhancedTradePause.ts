/**
 * AI-Enhanced TradePause Service Integration
 * 
 * This file integrates the new AI Decision Layer with the existing TradePause service.
 * It provides a wrapper that calls the AI decision layer and enforces its decisions.
 */

import { aiDecisionLayer, AIDecisionResult } from './aiDecisionLayer';
import { TradePauseService, AssessmentSignals, AssessmentResult } from './tradePause';
import { storage } from '../storage';
import type { UserBaseline, Policy } from '@shared/schema';
import type { OrderContext } from '@shared/tradePauseAI';

export interface EnhancedAssessmentResult {
  assessmentId: string;
  
  // AI Decision (this is what matters)
  allowed: boolean; // THE GATEKEEPER - if false, block trade
  
  // Risk metrics
  riskScore: number; // 0-100
  stressLevel: number; // 0-10
  confidence: number; // 0-100 (percentage)
  
  // Decision details
  verdict: 'allow' | 'cooldown' | 'block' | 'supervisor_review';
  primaryConcerns: string[];
  blockingFactors: string[];
  reasoning: string;
  
  // Recommended actions
  cooldownDurationSeconds?: number;
  recommendedInterventions?: string[];
  
  // Audit trail
  timestamp: number;
  aiDecisionId: string;
}

/**
 * AI-Enhanced TradePause Service
 * 
 * This service wraps the existing TradePause service and adds AI-driven
 * decision enforcement. All trading decisions now go through the AI layer.
 */
export class AIEnhancedTradePauseService {
  private tradePause: TradePauseService;
  
  constructor() {
    this.tradePause = new TradePauseService();
  }
  
  /**
   * Create a new assessment and get AI-driven allow/deny decision
   * 
   * This is the main entry point for pre-trade assessments.
   * It collects all signals, runs them through the AI decision layer,
   * and returns a final decision that MUST be enforced.
   */
  async createAssessmentWithAIDecision(
    userId: string,
    orderContext: OrderContext,
    signals: AssessmentSignals
  ): Promise<EnhancedAssessmentResult> {
    console.log(`🤖 AI-Enhanced Assessment for user ${userId}`);
    
    // Get user baseline and policy
  const baseline = await storage.getUserBaseline(userId);
  const policy = await storage.getDefaultPolicy();
    
    // Run the AI decision layer
    const aiDecision: AIDecisionResult = await aiDecisionLayer.shouldAllowTrade(
      signals,
      orderContext,
      baseline,
      policy,
      userId
    );
    
    // Create the base assessment using existing TradePause service
    const baseAssessment: AssessmentResult = await this.tradePause.checkBeforeTrade(
      userId,
      orderContext,
      signals
    );

    const assessmentId = baseAssessment.assessmentId;
    if (!assessmentId) {
      throw new Error('TradePause did not return an assessmentId');
    }
    
    // Store the AI decision in the database
    const aiDecisionId = await this.storeAIDecision(
      assessmentId,
      aiDecision
    );
    
    // Update the assessment with AI decision results
    await storage.updateAssessment(assessmentId, {
      riskScore: aiDecision.emotionalRiskScore,
      verdict: this.mapAIVerdictToDBVerdict(aiDecision.recommendedAction),
      reasonTags: aiDecision.blockingFactors.concat(aiDecision.primaryConcerns),
      confidence: aiDecision.confidence
    });
    
    // Create the enhanced result
    const result: EnhancedAssessmentResult = {
      assessmentId,
      allowed: aiDecision.shouldAllowTrade,
      riskScore: aiDecision.emotionalRiskScore,
      stressLevel: aiDecision.stressLevel || 0,
      confidence: aiDecision.confidence,
      verdict: aiDecision.recommendedAction,
      primaryConcerns: aiDecision.primaryConcerns,
      blockingFactors: aiDecision.blockingFactors,
      reasoning: aiDecision.reasoning,
      cooldownDurationSeconds: aiDecision.cooldownDurationSeconds,
      timestamp: aiDecision.timestamp,
      aiDecisionId
    };
    
    // Log the decision for auditing
    console.log(`🤖 AI Decision: ${aiDecision.shouldAllowTrade ? '✅ ALLOW' : '🚫 BLOCK'}`);
    console.log(`   Risk: ${aiDecision.emotionalRiskScore}/100, Stress: ${aiDecision.stressLevel || 0}/10`);
    if (!aiDecision.shouldAllowTrade) {
      console.log(`   Blocking: ${aiDecision.blockingFactors.join(', ')}`);
    }
    
    return result;
  }
  
  /**
   * Verify that a decision is valid and hasn't been tampered with
   * 
   * This should be called by the trading system before executing a trade.
   * It ensures the decision is recent, hasn't been used, and is authentic.
   */
  async verifyTradePermission(
    assessmentId: string,
    userId: string
  ): Promise<{ allowed: boolean; reason: string }> {
    console.log(`🛡️ Verifying trade permission for assessment ${assessmentId}`);
    
    // Fetch the assessment
    const assessment = await storage.getAssessment(assessmentId);
    
    if (!assessment) {
      return {
        allowed: false,
        reason: 'Assessment not found'
      };
    }
    
    // Verify it belongs to the user
    if (assessment.userId !== userId) {
      console.error(`⛔ User mismatch: assessment belongs to ${assessment.userId}, not ${userId}`);
      return {
        allowed: false,
        reason: 'Assessment does not belong to this user'
      };
    }
    
    // Verify it's recent (within 5 minutes)
    const createdAt = assessment.createdAt ? new Date(assessment.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) {
      console.error('Invalid assessment timestamp for', assessmentId);
      return {
        allowed: false,
        reason: 'Assessment has invalid timestamp'
      };
    }

    const assessmentAge = Date.now() - createdAt.getTime();
    const MAX_AGE = 5 * 60 * 1000; // 5 minutes
    
    if (assessmentAge > MAX_AGE) {
      console.warn(`⏰ Assessment expired: ${assessmentAge}ms old (max ${MAX_AGE}ms)`);
      return {
        allowed: false,
        reason: 'Assessment expired - please complete a new assessment'
      };
    }
    
    // Verify it hasn't been used already
    if (assessment.tradeExecuted) {
      console.error(`♻️ Assessment already used for trade`);
      return {
        allowed: false,
        reason: 'Assessment already used - one assessment per trade'
      };
    }
    
    // Check the verdict
    const allowed = assessment.verdict === 'go';
    
    if (!allowed) {
      return {
        allowed: false,
        reason: `Trade blocked by AI: ${assessment.verdict} (risk score: ${assessment.riskScore})`
      };
    }
    
    // Mark the assessment as used
    await storage.updateAssessment(assessmentId, {
      tradeExecuted: true
    });
    
    console.log(`✅ Trade permission verified for assessment ${assessmentId}`);
    
    return {
      allowed: true,
      reason: 'Trade approved by AI assessment'
    };
  }
  
  /**
   * Store the AI decision for audit trail
   */
  private async storeAIDecision(
    assessmentId: string,
    decision: AIDecisionResult
  ): Promise<string> {
    // In a full implementation, this would store to a dedicated ai_decisions table
    // For now, we'll use the audit log
    
    const aiDecisionId = `ai_${assessmentId}_${Date.now()}`;
    
    await storage.createAuditLog({
      assessmentId,
      action: 'ai_decision_made',
      details: {
        aiDecisionId,
        allowed: decision.shouldAllowTrade,
        riskScore: decision.emotionalRiskScore,
        stressLevel: decision.stressLevel || 0,
        confidence: decision.confidence,
        verdict: decision.recommendedAction,
        blockingFactors: decision.blockingFactors,
        primaryConcerns: decision.primaryConcerns,
        reasoning: decision.reasoning,
        timestamp: decision.timestamp
      }
    });
    
    return aiDecisionId;
  }
  
  /**
   * Map AI verdict to database verdict format
   */
  private mapAIVerdictToDBVerdict(aiVerdict: string): 'go' | 'hold' | 'block' {
    switch (aiVerdict) {
      case 'allow':
        return 'go';
      case 'cooldown':
      case 'supervisor_review':
        return 'hold';
      case 'block':
      default:
        return 'block';
    }
  }
  
  /**
   * Legacy method - use createAssessmentWithAIDecision instead
   */
  async createAssessment(
    userId: string,
    orderContext: OrderContext,
    signals: AssessmentSignals
  ) {
    console.warn('⚠️ Using legacy createAssessment - consider using createAssessmentWithAIDecision');
    return this.tradePause.checkBeforeTrade(userId, orderContext, signals);
  }
  
  /**
   * Update an existing assessment (delegated to base service)
   */
  async updateAssessment(
    assessmentId: string,
    updates: Parameters<typeof storage.updateAssessment>[1]
  ) {
    return storage.updateAssessment(assessmentId, updates);
  }
  
  /**
   * Complete cooldown (delegated to base service)
   */
  async completeCooldown(assessmentId: string, durationMs: number) {
    return this.tradePause.recordCooldownCompletion(assessmentId, durationMs);
  }
  
  /**
   * Save journal entry (delegated to base service)
   */
  async saveJournalEntry(
    assessmentId: string,
    trigger: string,
    plan: string,
    entry?: string
  ) {
    return this.tradePause.recordJournalEntry(assessmentId, trigger, plan, entry);
  }
  
  /**
   * Submit override request (delegated to base service)
   */
  async submitOverride(assessmentId: string, reason: string, userId: string) {
    return this.tradePause.recordOverride(assessmentId, reason, userId);
  }
  
  /**
   * Record trade outcome (delegated to base service)
   */
  async recordTradeOutcome(...args: Parameters<TradePauseService['recordTradeOutcome']>) {
    return this.tradePause.recordTradeOutcome(...args);
  }
}

/**
 * Singleton instance for use across the application
 */
export const aiEnhancedTradePause = new AIEnhancedTradePauseService();
