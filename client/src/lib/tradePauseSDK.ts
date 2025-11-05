import { apiRequest } from "./queryClient";
import type {
  OrderContext,
  AssessmentSignals,
  AssessmentResult,
  FullAssessmentRequest,
  FullAssessmentResponse,
} from "@/types/tradePause";

export class TradePauseSDK {
  private tenantKey?: string;
  private region?: string;
  private features?: string[];

  constructor(config?: {
    tenantKey?: string;
    region?: string;
    features?: string[];
  }) {
    this.tenantKey = config?.tenantKey;
    this.region = config?.region;
    this.features = config?.features;
  }

  async checkBeforeTrade(
    orderContext: OrderContext,
    signals: AssessmentSignals,
    userId?: string,
    fastMode?: boolean
  ): Promise<AssessmentResult> {
    const response = await apiRequest('POST', '/api/trade-pause/check-trade', {
      userId,
      orderContext,
      signals,
      fastMode,
    });

    return response.json();
  }

  async recordCooldownCompletion(
    assessmentId: string,
    durationMs: number
  ): Promise<void> {
    await apiRequest('POST', '/api/trade-pause/cooldown-completed', {
      assessmentId,
      durationMs,
    });
  }

  async saveJournalEntry(
    assessmentId: string,
    trigger: string,
    plan: string,
    entry?: string
  ): Promise<void> {
    await apiRequest('POST', '/api/trade-pause/save-journal', {
      assessmentId,
      trigger,
      plan,
      entry,
    });
  }

  async submitOverride(
    assessmentId: string,
    reason: string,
    userId?: string
  ): Promise<void> {
    await apiRequest('POST', '/api/trade-pause/override', {
      userId,
      assessmentId,
      reason,
    });
  }

  async recordTradeOutcome(
    assessmentId: string,
    outcome: {
      executed: boolean;
      pnl?: number;
      duration?: number;
      maxFavorableExcursion?: number;
      maxAdverseExcursion?: number;
    }
  ): Promise<void> {
    await apiRequest('POST', '/api/trade-pause/trade-outcome', {
      assessmentId,
      outcome,
    });
  }

  async runFullAssessment(payload: FullAssessmentRequest): Promise<FullAssessmentResponse> {
    const response = await apiRequest('POST', '/api/trade-pause/assessments/full', payload);
    return response.json();
  }

  // Event listener interface
  private eventListeners: Map<string, Function[]> = new Map();

  on(event: 'decision' | 'error', handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(handler);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventListeners.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}

// Global SDK instance
export const tradePause = new TradePauseSDK();
