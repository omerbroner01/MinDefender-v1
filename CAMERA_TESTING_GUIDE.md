# Camera Stress Analysis - Quick Testing Guide

## ⚡ Quick Start

1. Open EmotionGuard in browser
2. Navigate to Pre-Trade Assessment
3. Click "Start Camera"
4. Watch for face detection and stress values

---

## ✅ What You Should See (Fixed)

### Initial Scan
- ✅ Face detected immediately (blue "Yes" badge)
- ✅ **Stress values appear immediately** (not 0%)
- ✅ Blink rate shows actual blinks/min
- ✅ Brow tension responds to facial expressions
- ✅ All metrics update in real-time

### During Scan
- ✅ Smooth, stable stress scores (no wild jumps)
- ✅ Values increase/decrease gradually (1-3 seconds)
- ✅ AI Stress Score uses full 0-100 range
- ✅ High stress (≥60) shows red warning

### After Scan
- ✅ Results persist
- ✅ Trade decision based on stress level
- ✅ No freezing or crashes

---

## 🧪 Test Scenarios

### Test 1: Relaxed Face (Low Stress)
**Action:** Sit calmly, relax face  
**Expected:** Stress 0-30, green indicators  
**Pass:** ✅ / ❌

### Test 2: Brow Furrow (Medium Stress)
**Action:** Furrow your eyebrows  
**Expected:** Stress 30-50, brow tension increases  
**Pass:** ✅ / ❌

### Test 3: Jaw Clench (High Stress)
**Action:** Clench jaw while furrowing brows  
**Expected:** Stress 50-70, jaw clench metric rises  
**Pass:** ✅ / ❌

### Test 4: Lip Press (Very High Stress)
**Action:** Press lips together + furrow + clench  
**Expected:** Stress 60-90, red warning appears  
**Pass:** ✅ / ❌

### Test 5: Return to Relaxed
**Action:** Relax all facial muscles  
**Expected:** Stress decreases smoothly over 2-4 seconds  
**Pass:** ✅ / ❌

### Test 6: Stability Check
**Action:** Hold neutral expression for 10 seconds  
**Expected:** Stress stays stable (±5 points), no jumps  
**Pass:** ✅ / ❌

---

## 📱 Mobile Testing

### Test 7: Mobile Camera Acquisition
**Device:** _____________  
**Action:** Open on phone, start camera  
**Expected:** Front camera activates, face detected  
**Pass:** ✅ / ❌

### Test 8: Mobile Face Tracking
**Device:** _____________  
**Action:** Move head slowly (side to side, up/down)  
**Expected:** Face stays tracked, no loss of detection  
**Pass:** ✅ / ❌

### Test 9: Mobile Stress Detection
**Device:** _____________  
**Action:** Furrow brows, clench jaw  
**Expected:** Stress values increase, same as desktop  
**Pass:** ✅ / ❌

---

## 🎯 Key Metrics to Watch

### During Initial Scan (First 5 seconds)
- **Face Detected:** Should be "Yes" immediately
- **Stress Score:** Should show real values (not 0%)
- **Blink Rate:** Should count actual blinks
- **Brow Tension:** Should respond to expressions
- **FPS:** Should be 5-10 (desktop), 3-8 (mobile)

### During Active Testing
- **Stability:** No jumps >10 points in 1 second
- **Responsiveness:** Changes reflect in 1-2 seconds
- **Range:** Uses full 0-100 scale appropriately
- **Confidence:** Should be 40-95%

### High Stress Detection
- **Threshold:** 60 or higher
- **Visual:** Red badge, warning message
- **Action:** Trade blocked or warning shown

---

## 🐛 Known Issues (Should Be Fixed)

### ❌ BEFORE (Problems)
1. Initial scan shows 0% for all metrics → **FIXED**
2. Stress values jump wildly (e.g., 20→80→15) → **FIXED**
3. Analysis feels basic, not intelligent → **FIXED**
4. Mobile camera fails to detect face → **FIXED**

### ✅ AFTER (Expected)
1. ✅ Initial scan shows real values immediately
2. ✅ Stress values change smoothly and gradually
3. ✅ Analysis uses 11 weighted signals intelligently
4. ✅ Mobile camera detects and tracks reliably

---

## 🔧 Troubleshooting

### Camera Won't Start
- Check browser permissions (allow camera)
- Ensure camera isn't used by another app
- Try different browser (Chrome recommended)
- Check console for error messages

### Face Not Detected
- Ensure adequate lighting
- Position face in camera view
- Remove glasses/obstructions
- Try moving closer/farther from camera

### Values Still at 0%
- Wait 1-2 seconds for initialization
- Check if face is actually detected
- Refresh page and try again
- Check browser console for errors

### Jumping Values (If Still Occurring)
- Check FPS (should be >3)
- Ensure stable lighting
- Keep head relatively still
- Report with console logs

---

## 📊 Success Criteria

### ✅ System is Working if:
- Face detected within 1 second
- Stress values appear immediately (not 0%)
- Values change smoothly (no wild jumps)
- High stress (furrow + clench) reaches 60+
- Relaxed face shows <30 stress
- Mobile works same as desktop

### ❌ Report Issues if:
- Initial scan stays at 0% for >3 seconds
- Values jump >15 points instantly
- Face detection fails repeatedly
- Mobile camera doesn't acquire
- System freezes or crashes

---

## 📝 Test Results Template

**Date:** _______________  
**Browser:** _______________  
**Device:** _______________

| Test | Pass | Notes |
|------|------|-------|
| 1. Relaxed Face | ☐ | |
| 2. Brow Furrow | ☐ | |
| 3. Jaw Clench | ☐ | |
| 4. Lip Press | ☐ | |
| 5. Return to Relaxed | ☐ | |
| 6. Stability Check | ☐ | |
| 7. Mobile Camera | ☐ | |
| 8. Mobile Tracking | ☐ | |
| 9. Mobile Stress | ☐ | |

**Overall:** ✅ PASS / ❌ FAIL

**Comments:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## 🎬 Video Recording Checklist

When recording demo/test video:
- [ ] Show initial 0% problem (old version)
- [ ] Show immediate values (new version)
- [ ] Demonstrate smooth transitions
- [ ] Test high stress detection (≥60)
- [ ] Show mobile camera working
- [ ] Capture console logs if issues occur

---

## 📞 Support

**Issues to Report:**
1. Console error messages (F12 → Console)
2. Specific test scenario that failed
3. Browser + OS + Device
4. Screenshots/video if possible

**Expected Response:**
- Critical issues: Same day
- Non-critical: Within 48 hours
- Enhancement requests: Backlog

---

**Quick Checklist:**
- ✅ Desktop camera works
- ✅ Mobile camera works
- ✅ Initial scan shows real values
- ✅ Stress detection is stable
- ✅ High stress triggers warning
- ✅ System feels intelligent and responsive

**If all checked ✅, system is working correctly!**
