# Zero Warnings + Mobile E2E Camera - Implementation Guide

## ✅ Completed

1. **Logger utility created** (`client/src/lib/logger.ts`)
   - Production-safe logging that's silent in production
   - Only errors log in production

2. **Lint scripts added** to `package.json`
   - `npm run lint` - TypeScript checks
   - `npm run lint:strict` - Strict mode checks

3. **Started console.log → logger migration**
   - Updated `useTradePause.ts` hook

## 📋 Remaining Tasks

### 1. Console Hygiene (High Priority)
Replace all `console.log/warn/info` with `logger` utility in:
- `client/src/hooks/useEmotionSense.ts` (~20 console statements)
- `client/src/lib/faceDetection.ts` (~30 console statements)
- `client/src/lib/stressAnalysisModel.ts` (~5 console statements)
- `client/src/components/AIAssessmentGate.tsx` (~6 console statements)
- `client/src/pages/Dashboard.tsx` (~4 console statements)

**Pattern to replace:**
```typescript
// Before
console.log('message', data);
console.warn('warning');
console.error('error');

// After
import { logger } from '@/lib/logger';
logger.log('message', data);
logger.warn('warning');
logger.error('error');
```

### 2. Mobile Camera Implementation (Critical)
Update `useEmotionSense.ts` to require user gesture:

```typescript
// Add state for permission
const [hasUserGesture, setHasUserGesture] = useState(false);
const [cameraReady, setCameraReady] = useState(false);

// Add button click handler
const requestCameraAccess = useCallback(async () => {
  setHasUserGesture(true);
  // ... then call getUserMedia
}, []);

// Update getUserMedia constraints for mobile
const constraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 }
  },
  audio: false
};

// Add video element attributes
videoElement.setAttribute('playsinline', '');
videoElement.setAttribute('muted', '');
videoElement.setAttribute('autoplay', '');
```

### 3. Proper Cleanup in Effects (High Priority)
Ensure all effects in these files have cleanup:
- `useEmotionSense.ts` - Stop camera tracks, cancel RAF loops
- `AIAssessmentGate.tsx` - Clear timers, stop streams
- Any component using intervals/timeouts

**Pattern:**
```typescript
useEffect(() => {
  const stream = await getUserMedia();
  let rafId: number;
  
  const loop = () => {
    // processing
    rafId = requestAnimationFrame(loop);
  };
  loop();
  
  return () => {
    // Cleanup
    stream.getTracks().forEach(track => track.stop());
    if (rafId) cancelAnimationFrame(rafId);
  };
}, [deps]);
```

### 4. Handle Camera Errors (Critical for Mobile)
Add error handling for:
- `NotAllowedError` - Permission denied
- `NotFoundError` - No camera
- `AbortError` - Request cancelled
- `NotReadableError` - Camera in use

```typescript
try {
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
} catch (err) {
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
        logger.error('Camera permission denied');
        break;
      case 'NotFoundError':
        logger.error('No camera found');
        break;
      case 'AbortError':
        logger.error('Camera request cancelled');
        break;
      case 'NotReadableError':
        logger.error('Camera is in use');
        break;
    }
  }
}
```

### 5. Visibility Change Handling (Mobile Battery)
Stop camera when page is hidden:

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      // Stop camera
      stopCamera();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### 6. TypeScript Strict Fixes
Run `npm run lint` and fix:
- Unused imports/variables
- Implicit `any` types
- Non-null assertions (`!`)
- Missing keys in lists
- `useEffect` exhaustive deps warnings
- Remove `@ts-ignore` comments

### 7. Mobile UX Requirements
Update `client/index.html`:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
```

Ensure tap targets ≥44px (already in CSS):
```css
button, a, input, select, textarea {
  min-height: 44px;
}
```

### 8. HTTPS Requirement Check
Add warning if not HTTPS:

```typescript
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
  logger.error('Camera requires HTTPS');
  // Show error to user
}
```

## 🎯 Acceptance Criteria Checklist

- [ ] `npm run lint` shows 0 errors
- [ ] Dev console shows 0 warnings
- [ ] All `console.log` replaced with `logger.log`
- [ ] Camera requires "Tap to start" button
- [ ] Video has `playsinline`, `muted`, `autoplay` attributes
- [ ] getUserMedia uses proper constraints for mobile
- [ ] All camera errors handled with user-friendly messages
- [ ] Camera stops on visibilitychange
- [ ] Camera tracks cleaned up on unmount
- [ ] No state updates after component unmount
- [ ] Tested on iOS Safari
- [ ] Tested on Android Chrome
- [ ] Lighthouse Best Practices ≥95
- [ ] Lighthouse Accessibility ≥90

## 📝 Implementation Order

1. ✅ Create logger utility
2. ✅ Add lint scripts
3. Replace all console statements (30 min)
4. Add camera permission button UI (15 min)
5. Update getUserMedia constraints (10 min)
6. Add video attributes (5 min)
7. Add error handling (20 min)
8. Add visibility change handler (10 min)
9. Fix TypeScript errors (30 min)
10. Test on mobile devices (1 hour)
11. Run Lighthouse audits (15 min)

## 🚀 Quick Commands

```bash
# Check for console statements
grep -r "console\." client/src --include="*.ts" --include="*.tsx"

# Run lint
npm run lint

# Build for production
npm run build

# Test locally with HTTPS
npm run dev
```
