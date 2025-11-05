import { useState, useCallback } from "react";
import { tradePause } from "@/lib/tradePauseSDK";
import { logger } from "@/lib/logger";
import type { FullAssessmentRequest, FullAssessmentResponse } from "@/types/tradePause";

type RunAssessmentParams = Omit<FullAssessmentRequest, "userId">;

export function useTradePause(userId = "demo-user") {
  const [latestDecision, setLatestDecision] = useState<FullAssessmentResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAssessment = useCallback(async (params: RunAssessmentParams) => {
    setIsRunning(true);
    setError(null);
    try {
      logger.log('🚀 Sending assessment request with payload:', {
        ...params,
        userId,
      });
      
      const response = await tradePause.runFullAssessment({
        ...params,
        userId,
      });
      
      logger.log('✅ Assessment response received:', response);
      setLatestDecision(response);
      return response;
    } catch (err) {
      logger.error("❌ TradePause assessment failed:", err);
      const message = err instanceof Error ? err.message : "Unknown assessment failure";
      setError(message);
      
      // Create a fallback decision to prevent UI freeze
      const fallbackDecision = {
        allowed: false,
        decision: 'block' as const,
        emotionalRiskScore: 100,
        confidence: 0.3,
        reasoning: ['Assessment failed - blocking for safety'],
        diagnostics: {
          cameraScore: 0,
          impulseScore: 0,
          focusScore: 0,
          reactionScore: 0,
          compositeWeights: { camera: 0, impulse: 0, focus: 0, reaction: 0 },
          signalQuality: 0,
        },
      };
      
      console.warn('⚠️ Using fallback decision due to error');
      setLatestDecision(fallbackDecision);
      
      throw err;
    } finally {
      setIsRunning(false);
    }
  }, [userId]);

  const reset = useCallback(() => {
    setLatestDecision(null);
    setError(null);
  }, []);

  return {
    runAssessment,
    latestDecision,
    isRunning,
    error,
    reset,
  };
}
