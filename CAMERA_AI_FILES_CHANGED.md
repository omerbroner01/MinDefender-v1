# Camera AI Upgrade - Changed Files Quick Reference

## Files Created (New)

### 1. `client/src/lib/stressAnalysisModel.ts` (NEW - 639 lines)
**Purpose**: Advanced AI model for facial stress detection

**Key Exports**:
- `interface StressAnalysisResult` - Output format for stress analysis
- `class StressAnalysisModel` - Main AI model class
- `stressAnalysisModel` - Singleton instance

**Key Methods**:
- `async initialize()` - Load TensorFlow.js face detection model
- `async analyzeFrame(videoElement)` - Analyze single video frame for stress
- `reset()` - Reset tracking state
- `dispose()` - Clean up resources

**Returns**:
```typescript
{
  faceDetected: boolean,
  stressScore: number,        // 0-100
  isHighStress: boolean,      // >= 60
  blinkRate: number,
  metrics: {
    browTension: number,
    jawClench: number,
    lipPress: number,
    blinkRateAbnormal: number,
    microExpressionTension: number,
    headMovement: number,
    gazeInstability: number
  },
  confidence: number,
  fps: number,
  latencyMs: number
}
```

---

## Files Modified (Updated)

### 2. `client/src/lib/faceDetection.ts` (REPLACED - 335 lines)
**What Changed**: Complete rewrite from disabled stub to fully functional service

**Before**:
- Threw errors blocking desktop and mobile
- No actual face detection
- Placeholder implementation

**After**:
- Integrates `stressAnalysisModel` for real-time analysis
- Robust camera acquisition (3-attempt retry with fallback)
- Works on desktop webcam and mobile front camera
- Real-time stress monitoring loop
- Exponential smoothing for stable metrics

**Key Methods** (unchanged interface):
- `async initialize()` - Initialize camera and AI model
- `startDetection(callback)` - Start real-time stress monitoring
- `stopDetection()` - Stop and cleanup
- `setSettings(partial)` - Update detection settings
- `getSettings()` - Get current settings

**Output Format**: Same as before (`FaceMetrics` interface) but now includes:
- `stressScore: number` (0-100)
- `isHighStress: boolean`
- `signals: StressSignals` (7 stress indicators)

---

### 3. `client/src/hooks/useEmotionSense.ts` (UPDATED - 380 lines)
**What Changed**: Replaced old landmark analysis code with stress model integration

**Removed**:
- Old landmark constants (LEFT_EYE_UPPER, etc.)
- Old helper functions (computeEyeAspectRatio, computeBrowTension, etc.)
- Direct face landmark calculations
- Manual blink detection logic

**Added**:
- Import and use `stressAnalysisModel`
- New metric buckets for stress data collection
- Comprehensive stress score calculation
- Same weighted algorithm as real-time model

**Key Changes**:
```typescript
// OLD: Direct landmark analysis
const faces = await modelRef.current.estimateFaces(...);
const ear = computeEyeAspectRatio(keypoints, ...);
const brow = computeBrowTension(keypoints);

// NEW: Use stress analysis model
const result = await stressAnalysisModel.analyzeFrame(videoRef.current);
metrics.stressScoreSamples.push(result.stressScore);
metrics.browTensionSamples.push(result.metrics.browTension);
```

**Output Format**: Returns `CameraSignals` with:
- `stressScore: number` (0-100 composite)
- `isHighStress: boolean`
- `signals: { browTension, jawClench, lipPress, ... }`

---

## Files Verified (No Changes Needed)

### 4. `server/services/aiDecisionLayer.ts` (ALREADY COMPATIBLE)
**Why No Changes**: Already designed to use new stress fields

**Existing Integration Points**:
```typescript
// Line ~265: High stress detection
if (signals.facialMetrics?.isHighStress) {
  blockingFactors.push(`High stress detected from facial scan (score: ${signals.facialMetrics.stressScore}/100)`);
}

// Line ~285: Red flag accumulation
const redFlags = [
  // ... other flags
  signals.facialMetrics?.isHighStress,  // Uses new field
  // ...
];

// Line ~310+: Stress score concerns
if (signals.facialMetrics?.stressScore && 
    signals.facialMetrics.stressScore >= 50 && 
    !signals.facialMetrics.isHighStress) {
  concerns.push(`Elevated facial stress score (${signals.facialMetrics.stressScore}/100)`);
}
```

### 5. `server/routes.ts` (ALREADY COMPATIBLE)
**Why No Changes**: Schema already includes new fields

**Existing Schema Validation**:
```typescript
// Lines 100-101
stressScore: z.number().min(0).max(100).optional().default(0),
isHighStress: z.boolean().optional().default(false),

// Lines 229-230 (facialMetricsSchema)
stressScore: z.number().min(0).max(100).optional(),
isHighStress: z.boolean().optional(),
```

### 6. `client/src/components/FaceDetectionDisplay.tsx` (ALREADY COMPATIBLE)
**Why No Changes**: Already displays stressScore UI

**Existing UI Code**:
```typescript
// Line ~235: Stress score display
{metrics.stressScore !== undefined && (
  <div className="border border-border rounded-lg p-4 bg-card/50">
    <div className="flex justify-between items-center mb-3">
      <span className="text-sm sm:text-base font-semibold">AI Stress Score</span>
      <span className="text-2xl sm:text-3xl font-bold tabular-nums">
        {metrics.stressScore}<span className="text-lg sm:text-xl text-muted-foreground">/100</span>
      </span>
    </div>
    <Progress value={metrics.stressScore} ... />
    {metrics.isHighStress && (
      <div className="... text-red-600 ...">
        ⚠️ High stress detected - trading may be restricted
      </div>
    )}
  </div>
)}
```

### 7. `shared/emotionGuardAI.ts` (ALREADY COMPATIBLE)
**Why No Changes**: Type definitions already include comprehensive stress fields

**Existing Types**:
```typescript
export interface CameraSignals {
  stressLevel: number;
  agitation: number;
  focus: number;
  fatigue: number;
  confidence: number;
  signalQuality: number;
  durationMs: number;
  samples: number;
  raw: CameraSignalAverages;
  notes?: string[];
  
  // STRESS DETECTION (already defined)
  stressScore: number;
  isHighStress: boolean;
  signals?: {
    browTension: number;
    jawClench: number;
    blinkRateAbnormal: number;
    lipCompression: number;
    microExpressionTension: number;
    headMovement: number;
    gazeInstability: number;
  };
}
```

---

## Summary

### New Files: 1
- `client/src/lib/stressAnalysisModel.ts` - Advanced stress detection AI

### Modified Files: 2
- `client/src/lib/faceDetection.ts` - Complete rewrite with stress model
- `client/src/hooks/useEmotionSense.ts` - Updated to use stress model

### Verified Compatible: 5
- `server/services/aiDecisionLayer.ts` - Already uses new fields
- `server/routes.ts` - Schema already validates new fields
- `client/src/components/FaceDetectionDisplay.tsx` - UI already displays new fields
- `client/src/components/PreTradeGate.tsx` - Already passes metrics correctly
- `shared/emotionGuardAI.ts` - Types already defined

### Total Files Touched: 3 (1 new, 2 modified)
### Total Files in System: 8 (all working together)

---

## How to Find Changes

### Search for "STRESS DETECTION" comments:
```bash
grep -r "STRESS DETECTION" client/src/
```

### Search for stressScore usage:
```bash
grep -r "stressScore" client/src/ server/
```

### Search for isHighStress usage:
```bash
grep -r "isHighStress" client/src/ server/
```

---

## Testing the Changes

### Test Desktop Face Detection:
1. Open `FaceDetectionDisplay` component
2. Click "Start Camera"
3. Verify face locks on
4. Watch `stressScore` update in real-time
5. Make stressed expressions (furrow brow)
6. Verify score increases

### Test Mobile Camera Scan:
1. Open on mobile device
2. Navigate to trade assessment
3. Start camera scan (8 seconds)
4. Verify front camera activates
5. Verify stress analysis completes
6. Check summary for `stressScore` field

### Test Trade Blocking:
1. Complete assessment with high stress (score 60+)
2. Verify `isHighStress: true` in result
3. Attempt to place trade
4. Verify trade is BLOCKED
5. Verify cooldown is enforced (5-15 min)

---

## Code Architecture

```
┌─────────────────────────────────────────┐
│   User's Face (Desktop/Mobile Camera)   │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  stressAnalysisModel.ts (NEW)           │
│  - TensorFlow.js Face Detection         │
│  - 7 stress signal calculations         │
│  - Composite stress score (0-100)       │
└────────────────┬────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────────┐
│faceDetection │  │ useEmotionSense  │
│   Desktop    │  │     Mobile       │
└──────┬───────┘  └────────┬─────────┘
       │                   │
       └─────────┬─────────┘
                 ▼
┌─────────────────────────────────────────┐
│  FaceDetectionDisplay (UI Component)    │
│  - Shows stressScore                    │
│  - Shows individual metrics             │
│  - High stress warning                  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  PreTradeGate (Assessment Flow)         │
│  - Collects facialMetrics               │
│  - Passes to AI decision                │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  aiDecisionLayer (Trade Gatekeeper)     │
│  - Checks isHighStress                  │
│  - Blocks if stressScore >= 60          │
│  - Enforces cooldown                    │
└─────────────────────────────────────────┘
```

---

**Last Updated**: October 26, 2025  
**Status**: ✅ Complete and Ready for Testing
