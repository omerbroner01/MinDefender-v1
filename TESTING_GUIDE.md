# AI Evaluation Testing Guide

## Quick Test Scenarios

### ✅ Scenario 1: Perfect Performance (Should ALLOW Trading)

**How to perform the test:**
1. Start Pre-Trade Gate
2. Complete Stroop test:
   - Answer FAST (< 1 second per question)
   - Answer CORRECTLY (match the ink color, not the word)
   - Be CONSISTENT (similar timing on each answer)
3. Self-report stress: Select 1-3 (low stress)
4. Keep face calm and steady (if using facial detection)

**Expected Results:**
```
✅ Confidence: 70-90%
✅ Emotional Risk Score: 10-35
✅ Decision: shouldAllowTrade = true
✅ Cooldown: 0ms
✅ UI: Green "Proceed with Trade" button
✅ No cooldown message shown
```

**What to look for:**
- Risk score should be LOW (green zone)
- Confidence should be HIGH (70%+)
- "Proceed with Trade" button appears
- No cooldown warning

---

### ❌ Scenario 2: Terrible Performance (Should BLOCK Trading)

**How to perform the test:**
1. Start Pre-Trade Gate
2. Complete Stroop test:
   - Answer SLOWLY (wait 2+ seconds, let some timeout)
   - Answer INCORRECTLY on purpose (click wrong colors)
   - Be ERRATIC (vary timing wildly)
3. Self-report stress: Select 8-10 (high stress)
4. Move around a lot (if using facial detection)

**Expected Results:**
```
🚫 Confidence: 35-55%
🚫 Emotional Risk Score: 70-95
🚫 Decision: shouldAllowTrade = false
🚫 Cooldown: 5-15 minutes (300,000-900,000ms)
🚫 UI: Red "Complete X Min Cooldown (Required)" button
🚫 Lock icon and message: "Trading is locked... cannot be bypassed"
🚫 NO "Proceed Anyway" button
🚫 NO override option available
```

**What to look for:**
- Risk score should be HIGH (red zone, 70+)
- Confidence should be MODERATE (not stuck at 36%)
- Mandatory cooldown button (red)
- Lock message saying bypass not allowed
- NO override option visible

---

### ⚠️ Scenario 3: Moderate Performance (Should COOLDOWN)

**How to perform the test:**
1. Start Pre-Trade Gate
2. Complete Stroop test:
   - Mix of fast and slow answers
   - Get ~70% correct (some mistakes)
   - Somewhat inconsistent timing
3. Self-report stress: Select 5-6 (moderate stress)

**Expected Results:**
```
⚠️ Confidence: 50-70%
⚠️ Emotional Risk Score: 50-70
⚠️ Decision: shouldAllowTrade = false
⚠️ Cooldown: 1-5 minutes (60,000-300,000ms)
⚠️ UI: Yellow "Take X Min Break (Recommended)" button
⚠️ "Override with Justification" button MAY appear (cooldown < 5 min)
```

**What to look for:**
- Risk score should be MODERATE (yellow/orange zone)
- Cooldown is shorter (1-5 minutes)
- Override option might be available for moderate risk

---

## Key Metrics to Verify

### 1. Confidence Score Variability
**BEFORE (BROKEN):** Stuck at 36% regardless of performance
**AFTER (FIXED):** Should vary based on performance:
- Perfect performance: 70-90%
- Good performance: 60-75%
- Moderate performance: 50-65%
- Poor performance: 35-50%

**Test**: Run same test 3 times with different performance levels. Confidence should change each time.

---

### 2. Decision Logic Correctness
**BEFORE (BROKEN):** Random/backwards decisions
**AFTER (FIXED):** Logical mapping:

| Performance Quality | Expected Decision | Cooldown Duration |
|-------------------|------------------|------------------|
| Excellent (>90% accuracy, fast) | Allow | 0 minutes |
| Good (70-90% accuracy) | Allow or Brief Cooldown | 0-2 minutes |
| Moderate (50-70% accuracy) | Cooldown | 2-5 minutes |
| Poor (<50% accuracy) | Block | 5-15 minutes |

---

### 3. Cooldown Enforcement
**BEFORE (BROKEN):** User could always override
**AFTER (FIXED):** Override rules:

| Cooldown Duration | Override Allowed? | UI Behavior |
|------------------|------------------|-------------|
| 0 minutes | N/A | "Proceed with Trade" button |
| 1-4 minutes | Yes (with justification) | "Override with Justification" shown |
| 5+ minutes | NO | Lock icon, "cannot be bypassed" message |

**Test**: Get a high risk score (70+). Verify NO override button appears.

---

### 4. Stroop Test Time Pressure
**Status**: ✅ Already implemented correctly

**How it works:**
- Each question has 2.5 second window
- Timeout if no answer within window
- Timeouts count as poor performance
- Reaction time recorded for each answer

**Test**: Intentionally wait too long on several questions. They should timeout and count against you.

---

## Console Logging

When running tests, check browser/server console for debug output:

### Good Performance Example:
```
🧠 AI analysis completed in 45.2ms
🤖 AI Decision: ✅ ALLOW (142.3ms)
   Risk: 28/100, Stress: 2.5/10, Confidence: 78%
✅ Assessment complete with score: 28
```

### Bad Performance Example:
```
🧠 AI analysis completed in 48.1ms
🤖 AI Decision: 🚫 BLOCK (156.7ms)
   Risk: 84/100, Stress: 8.2/10, Confidence: 42%
   Blocking factors: Poor accuracy (45%), High stress level (8.2/10)
```

---

## Common Issues & Fixes

### Issue: Confidence still stuck at 36%
**Check**: Are you completing all tests? Partial data = lower confidence.
**Fix**: Complete Stroop test fully (all rounds) AND provide self-report stress level.

### Issue: Good performance blocked, bad performance allowed
**Check**: Console logs - what's the actual risk score and stress level?
**Fix**: If this happens, there's still a logic bug. Report with console output.

### Issue: Override button always shows
**Check**: What's the cooldown duration in the response?
**Fix**: Override should only hide when `cooldownMs >= 300000` (5 minutes).

### Issue: No cooldown duration shown
**Check**: Is `cooldownMs` field present in API response?
**Fix**: Backend might not be returning new response structure. Check server logs.

---

## API Response Structure

### New (Correct) Response:
```json
{
  "shouldAllowTrade": false,
  "cooldownMs": 600000,
  "emotionalRiskScore": 75,
  "confidence": 42,
  "reason": "Trading blocked: Poor accuracy (45%)",
  "primaryConcerns": ["Poor accuracy (45%)", "Slow reaction times"],
  "blockingFactors": ["High risk score (75/100)"],
  "reasoning": "Trading blocked due to 1 critical factor(s)...",
  "recommendedAction": "block"
}
```

### Old (Legacy) Response (still supported):
```json
{
  "allowed": false,
  "riskScore": 75,
  "stressLevel": 8.2,
  "confidence": 0.42,
  "verdict": "block"
}
```

The frontend handles both formats for backward compatibility.

---

## Manual Verification Checklist

- [ ] Perfect performance → Confidence 70%+ ✅
- [ ] Poor performance → Confidence 35-50% ✅
- [ ] Perfect performance → Risk score < 35 ✅
- [ ] Poor performance → Risk score > 70 ✅
- [ ] Good performance → shouldAllowTrade = true ✅
- [ ] Bad performance → shouldAllowTrade = false ✅
- [ ] High risk (5+ min cooldown) → NO override button ✅
- [ ] Moderate risk (1-4 min cooldown) → Override option available ✅
- [ ] Stroop test timeouts counted as errors ✅
- [ ] UI shows clear reason for blocking ✅
- [ ] Cooldown duration displayed in minutes ✅
- [ ] Lock icon shown for hard blocks ✅

---

## Quick Command Reference

### Start Development Server:
```bash
npm run dev
```

### Check Console Logs:
- Browser: F12 → Console tab
- Server: Terminal where `npm run dev` is running

### Test Different Scenarios:
1. Open EmotionGuard in browser
2. Click "Buy" or "Sell" to trigger Pre-Trade Gate
3. Complete assessment with desired performance level
4. Check result screen and console logs

---

## Success Criteria

✅ **Confidence varies with performance** (not stuck)
✅ **Good performance gets approved** (low risk, allow trade)
✅ **Bad performance gets blocked** (high risk, mandatory cooldown)
✅ **Cooldown enforcement works** (no bypass for high risk)
✅ **Time pressure active** (Stroop test has 2.5s per round)
✅ **Clear user feedback** (reason shown, duration visible)

If all criteria pass, the fix is working correctly! 🎉
