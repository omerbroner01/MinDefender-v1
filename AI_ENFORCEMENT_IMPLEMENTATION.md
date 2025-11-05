# EmotionGuard AI Enforcement Refactoring - Implementation Summary

## Overview
This document outlines the complete refactoring of EmotionGuard to implement true AI-driven emotional risk assessment with non-bypassable enforcement.

## Core Changes

### 1. AI Decision Layer (NEW) ✅ COMPLETE
**File**: `server/services/aiDecisionLayer.ts`

**Purpose**: The gatekeeper that makes final allow/deny decisions.

**Key Functions**:
```typescript
shouldAllowTrade(signals, orderContext, baseline, policy, userId): Promise<AIDecisionResult>
// Returns: { allowed: boolean, riskScore, stressLevel, confidence, blockingFactors, reasoning }
```

**Decision Rules**:
1. Critical stress level (≥8/10) → BLOCK
2. High risk score (≥75/100) → BLOCK  
3. AI verdict = 'block' → BLOCK
4. Multiple red flags (≥3) → BLOCK
5. Dangerous order context (high leverage, recent losses) → BLOCK
6. Low confidence (<0.4) → BLOCK by default

**Non-Bypassable**: The `allowed` boolean is the final authority. No UI override.

### 2. Cognitive Test Refactoring (IN PROGRESS)

#### Stroop Test - Impulse Control Measurement
**File**: `client/src/components/StroopTest.tsx`

**Changes Needed**:
1. Add `StroopMetrics` interface with AI-ready metrics:
   - `impulseControlScore`: Accuracy on incongruent trials (word ≠ color)
   - `consistencyScore`: Reaction time stability
   - `stressResilienceScore`: Performance degradation over time
   - `speedAccuracyTradeoff`: Balance between speed and accuracy
   - `overallScore`: 0-1 composite for AI

2. Update `onComplete` callback:
```typescript
onComplete: (results: StroopTrial[], metrics: StroopMetrics) => void
```

3. Add `calculateStroopMetrics()` function to extract structured metrics

4. Strategic trial sequencing:
   - Trials 1-5: 60% congruent (warm-up)
   - Trials 6-15: 20% congruent (stress test - impulse control)
   - Trials 16-20: 40% congruent (recovery check)

#### Go/No-Go Test - Response Inhibition
**File**: `client/src/components/GoNoGoTest.tsx`

**Changes Needed**:
1. Add `GoNoGoMetrics` interface:
   - `inhibitionControl`: No-Go accuracy (key metric)
   - `falseAlarmRate`: Responding when shouldn't
   - `missRate`: Not responding when should
   - `responseStability`: RT consistency
   - `overallScore`: 0-1 composite

2. Export structured metrics, not just pass/fail

3. Increase No-Go frequency to 30% (more stress)

#### Emotion Recognition Test
**File**: `client/src/components/EmotionRecognitionTest.tsx`

**Current Issues**:
- Not actually testing emotion recognition ability
- Should be testing stress detection via facial analysis
- Need to integrate with live face detection

**Recommended Changes**:
1. **Option A**: Remove this test (redundant with face detection)
2. **Option B**: Repurpose as "Stress Detection Test"
   - Show faces with varying stress levels
   - Trader identifies stress level
   - Tests their emotional awareness

### 3. Face Detection Integration

**File**: `client/src/lib/faceDetection.ts` ✅ ALREADY STABLE

**Current State**: Face detection is already fixed and stable from previous work.

**Integration Needed**:
- Ensure face metrics flow into AI decision layer
- Add real-time stress signal extraction
- Validate metrics before passing to AI

**Key Metrics for AI**:
```typescript
{
  isPresent: boolean,
  blinkRate: number, // 0-60 bpm
  eyeAspectRatio: number, // 0-1
  jawOpenness: number, // 0-1
  browFurrow: number, // 0-1 (stress indicator)
  gazeStability: number // 0-1 (attention indicator)
}
```

### 4. PreTradeGate Enforcement (CRITICAL)

**File**: `client/src/components/PreTradeGate.tsx`

**Required Changes**:

```typescript
// After collecting all signals (cognitive tests + face + self-report)
const assessmentSignals: AssessmentSignals = {
  stroopTrials,
  stroopMetrics, // NEW: structured metrics
  facialMetrics,
  stressLevel,
  mouseMovements,
  keystrokeTimings
};

// Call AI decision layer via API
const aiDecision = await fetch('/api/ai/decide', {
  method: 'POST',
  body: JSON.stringify({
    signals: assessmentSignals,
    orderContext,
    userId
  })
});

const { allowed, riskScore, reasoning, blockingFactors } = await aiDecision.json();

// ENFORCE THE DECISION
if (!allowed) {
  // Show blocking UI - NO bypass button
  return <TradeBlockedScreen 
    riskScore={riskScore}
    reasoning={reasoning}
    blockingFactors={blockingFactors}
    onClose={onClose} // Can only close, not proceed
  />;
}

// If allowed, proceed to trade
```

**Remove**:
- "Override" button for blocked trades
- Any UI that lets users skip assessment
- "Skip this step" options

**Keep**:
- Cooldown option for moderate risk
- Breathing exercises
- Micro-journaling

### 5. Server-Side Integration

**File**: `server/routes.ts` (NEW ENDPOINT NEEDED)

```typescript
// NEW: AI Decision Endpoint
app.post('/api/ai/decide', async (req, res) => {
  const { signals, orderContext, userId } = req.body;
  
  // Get user baseline
  const baseline = await storage.getUserBaseline(userId);
  const policy = await storage.getPolicy(); // Get trading desk policy
  
  // Call AI decision layer
  const decision = await aiDecisionLayer.shouldAllowTrade(
    signals,
    orderContext,
    baseline,
    policy,
    userId
  );
  
  // Store decision in database
  await storage.createAssessment({
    userId,
    signals,
    aiDecision: decision,
    timestamp: Date.now()
  });
  
  // Return decision (cannot be modified client-side)
  res.json(decision);
});
```

**File**: `server/services/emotionGuard.ts` (UPDATE)

Update `updateAssessment` to:
1. Call `aiDecisionLayer.shouldAllowTrade()`
2. Store the AI decision
3. Return the decision (not allow client to override)

### 6. Type Definitions

**File**: `client/src/types/emotionGuard.ts` (UPDATE)

Add new types:
```typescript
export interface StroopTrial {
  word: string;
  color: string;
  response: string;
  reactionTimeMs: number;
  correct: boolean;
  congruence?: 'congruent' | 'incongruent'; // NEW
}

export interface CognitiveMetrics {
  testType: 'stroop' | 'gonogo' | 'emotion';
  overallScore: number; // 0-1
  impulseControl?: number;
  attention Stability?: number;
  stressResilience?: number;
  rawData: any;
}

export interface AssessmentSignals {
  stroopTrials?: StroopTrial[];
  cognitiveMetrics?: CognitiveMetrics[]; // NEW: structured metrics
  facialMetrics?: FaceMetrics;
  stressLevel?: number;
  mouseMovements?: number[];
  keystrokeTimings?: number[];
}
```

## Implementation Priority

### Phase 1: Core AI Enforcement (THIS UPDATE)
1. ✅ Create `aiDecisionLayer.ts` 
2. ⏳ Add `/api/ai/decide` endpoint
3. ⏳ Update PreTradeGate to call AI and enforce decision
4. ⏳ Remove all bypass mechanisms

### Phase 2: Test Improvements
1. Update Stroop test to output structured metrics
2. Update Go/No-Go test for better inhibition measurement  
3. Remove or repurpose Emotion Recognition test
4. Ensure all tests feed metrics to AI layer

### Phase 3: Integration & Testing
1. Connect face detection to AI pipeline
2. Test full flow: tests → metrics → AI → enforce
3. Validate no bypass paths exist
4. Performance testing

## Security Considerations

**Critical**: The AI decision MUST be server-side only.

```typescript
// ❌ WRONG: Client can modify
const decision = calculateRiskClientSide();
if (decision.allowed) { ... }

// ✅ CORRECT: Server decides, client enforces
const decision = await fetch('/api/ai/decide');
// Server returns signed decision
// Client UI just displays result
```

**Implementation**:
1. All AI decisions happen on server
2. Decisions include timestamp + signature
3. Client cannot modify decision
4. Trading system validates decision server-side before executing

## Testing Checklist

- [ ] AI decision layer returns correct allow/deny for edge cases
- [ ] High stress (>8) always blocks
- [ ] High risk (>75) always blocks
- [ ] Multiple red flags trigger block
- [ ] No client-side bypass possible
- [ ] Face detection metrics flow to AI
- [ ] Cognitive test metrics flow to AI
- [ ] Decision stored in database for audit
- [ ] Performance: decision < 500ms

## Remaining Work

### Files to Create:
1. `server/routes.ts` - Add `/api/ai/decide` endpoint
2. `client/src/components/TradeBlockedScreen.tsx` - No-bypass blocking UI

### Files to Modify:
1. `client/src/components/StroopTest.tsx` - Add metrics calculation
2. `client/src/components/GoNoGoTest.tsx` - Add metrics calculation
3. `client/src/components/PreTradeGate.tsx` - Integrate AI decision
4. `server/services/emotionGuard.ts` - Call aiDecisionLayer
5. `client/src/types/emotionGuard.ts` - Add new type definitions

## Next Steps

1. **Immediate**: Integrate aiDecisionLayer into emotionGuard service
2. **Next**: Update PreTradeGate to enforce AI decisions
3. **Then**: Refactor tests to output structured metrics
4. **Finally**: Remove all bypass mechanisms and test end-to-end

---

## API Contract

### POST /api/ai/decide
**Request**:
```json
{
  "signals": {
    "stroopTrials": [...],
    "facialMetrics": {...},
    "stressLevel": 6
  },
  "orderContext": {
    "instrument": "BTC/USD",
    "size": 10000,
    "leverage": 5
  },
  "userId": "user123"
}
```

**Response**:
```json
{
  "allowed": false,
  "riskScore": 78,
  "stressLevel": 7.2,
  "confidence": 0.85,
  "blockingFactors": [
    "High risk score (78/100)",
    "Elevated stress level (7.2/10)"
  ],
  "reasoning": "Trading blocked due to 2 critical factors...",
  "recommendedAction": "block",
  "timestamp": 1234567890
}
```

This decision is final and cannot be overridden by the client.
