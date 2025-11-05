/**
 * Face Detection Service - Desktop & Mobile Compatible
 * 
 * This service provides real-time facial stress analysis using the advanced
 * StressAnalysisModel. Works on both desktop webcam and mobile front camera.
 * 
 * Key features:
 * - Unified stress detection across all platforms
 * - Real-time 0-100 stress scoring
 * - Multi-signal analysis: brow, jaw, lips, blinks, micro-expressions
 * - Automatic trade blocking on high stress (>= 60)
 */

import { stressAnalysisModel, type StressAnalysisResult } from './stressAnalysisModel';

export interface FaceMetrics {
  isPresent: boolean;
  blinkRate: number;
  eyeAspectRatio: number;
  jawOpenness: number;
  browFurrow: number;
  gazeStability: number;
  expressionCues: {
    concentration: number;
    stress: number;
    fatigue: number;
  };
  fps: number;
  latencyMs: number;
  confidence: number;
  stressScore: number;
  isHighStress: boolean;
  signals: {
    browTension: number;
    jawClench: number;
    blinkRateAbnormal: number;
    lipCompression: number;
    microExpressionTension: number;
    headMovement: number;
    gazeInstability: number;
  };
  blinkData: {
    totalBlinksInWindow: number;
    blinkRatePerSecond: number;
    lastBlinkTimestamp: number;
    avgBlinkDuration: number;
  };
}

export interface BlinkEvent {
  timestamp: number;
  duration: number;
}

export interface FaceDetectionSettings {
  targetWidth: number;
  targetHeight: number;
  targetFps: number;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  blinkCloseThreshold: number;
  blinkOpenThreshold: number;
}

class FaceDetectionService {
  private videoElement: HTMLVideoElement | null = null;
  private mediaStream: MediaStream | null = null;
  private isRunning = false;
  private animationFrameId: number | null = null;
  private callback: ((metrics: FaceMetrics) => void) | null = null;
  private initializing = false;
  
  private smoothedBlinkRate = 0;
  private smoothedBrowFurrow = 0;
  private smoothedGazeStability = 0;
  private readonly shimLabel = '[faceDetection]';
  
  private settings: FaceDetectionSettings = {
    targetWidth: 640,
    targetHeight: 480,
    targetFps: 30,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
    blinkCloseThreshold: 0.21,
    blinkOpenThreshold: 0.25,
  };

  private isMobile(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    return mobileRegex.test(userAgent) || (hasTouch && isSmallScreen);
  }

  async initialize(): Promise<void> {
    try {
      const isMobileDevice = this.isMobile();
      const deviceType = isMobileDevice ? 'Mobile' : 'Desktop';
      console.log(`🎥 INFO: Initializing Face Detection Service (${deviceType})...`);

      console.log('🧠 INFO: Loading AI stress analysis model...');
      await stressAnalysisModel.initialize();

      // Ensure mediaDevices exists and provide a shim for older browsers/WebViews
      this.ensureMediaDevicesShim();

      const adjustedWidth = isMobileDevice ? Math.min(640, this.settings.targetWidth) : this.settings.targetWidth;
      const adjustedHeight = isMobileDevice ? Math.min(720, Math.max(480, this.settings.targetHeight)) : this.settings.targetHeight;
      const adjustedFps = isMobileDevice ? 24 : this.settings.targetFps;
      // Mobile: VERY low thresholds for better face tracking on diverse devices
      const minDetectionConfidence = isMobileDevice ? 0.25 : this.settings.minDetectionConfidence;
      const minTrackingConfidence = isMobileDevice ? 0.25 : this.settings.minTrackingConfidence;

      this.settings = {
        ...this.settings,
        targetWidth: adjustedWidth,
        targetHeight: adjustedHeight,
        targetFps: adjustedFps,
        minDetectionConfidence,
        minTrackingConfidence,
      };

      stressAnalysisModel.updateConfig({
        minDetectionConfidence,
        minTrackingConfidence,
        blinkCloseThreshold: this.settings.blinkCloseThreshold,
        blinkOpenThreshold: this.settings.blinkOpenThreshold,
        isMobile: isMobileDevice,
      });
      console.log('✅ INFO: AI model loaded successfully');

      console.log('📹 INFO: Creating video element...');
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.playsInline = true;
      this.videoElement.muted = true;
      this.videoElement.width = this.settings.targetWidth;
      this.videoElement.height = this.settings.targetHeight;
      this.videoElement.setAttribute('playsinline', 'true');
      this.videoElement.setAttribute('muted', 'true');

      console.log('🎬 INFO: Requesting camera access...');
      this.mediaStream = await this.getCameraStream();
      console.log(`✅ INFO: Camera stream acquired (${this.mediaStream.getVideoTracks()[0]?.label || 'unknown'})`);

      this.videoElement.srcObject = this.mediaStream;

      const primaryTrack = this.mediaStream.getVideoTracks()[0];
      if (primaryTrack) {
        const appliedConstraints: MediaTrackConstraints = {
          width: { ideal: this.settings.targetWidth, max: this.settings.targetWidth + 160 },
          height: { ideal: this.settings.targetHeight, max: this.settings.targetHeight + 160 },
          frameRate: { ideal: this.settings.targetFps, max: this.settings.targetFps + 6 },
          facingMode: 'user',
        };
        try {
          await primaryTrack.applyConstraints(appliedConstraints);
        } catch (constraintErr) {
          console.warn('⚠️ WARNING: Unable to apply preferred camera constraints:', constraintErr);
        }
      }

      console.log('⏳ INFO: Waiting for video metadata...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Video metadata load timeout')), 5000);
        const handleLoaded = () => {
          clearTimeout(timeout);
          resolve();
        };

        if (this.videoElement && this.videoElement.readyState >= 1) {
          handleLoaded();
        } else {
          this.videoElement?.addEventListener('loadedmetadata', handleLoaded, { once: true });
        }
      });
      console.log(`✅ INFO: Video metadata loaded (${this.videoElement.videoWidth}x${this.videoElement.videoHeight})`);

      console.log('▶️ INFO: Starting video playback...');
      await this.videoElement.play();

      console.log('⏳ INFO: Waiting for video frame data...');
      let attempts = 0;
      const maxAttempts = 50;
      while (this.videoElement.readyState < 2 && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (this.videoElement.readyState < 2) {
        throw new Error(`Video readyState timeout (readyState: ${this.videoElement.readyState})`);
      }

      console.log(`✅ SUCCESS: Face Detection initialized (readyState: ${this.videoElement.readyState})`);

      this.mediaStream.getVideoTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.error('❌ ERROR: Camera track ended unexpectedly');
          if (this.isRunning) {
            console.warn('⚠️ WARNING: Stopping detection due to stream loss');
            this.stopDetection();
          }
        });
      });
    } catch (error) {
      console.error('❌ ERROR: Face Detection initialization failed:', error);
      this.cleanup();
      throw error instanceof Error ? error : new Error('Failed to initialize face detection');
    }
  }

  // Create a robust shim for getUserMedia on older browsers / WebViews
  private ensureMediaDevicesShim(): void {
    const nav: any = navigator as any;
    const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
    const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname);
    const isDevelopment = isLocalhost || isLocalNetwork;
    
    console.log('🔧 SHIM [faceDetection]: Starting mediaDevices shim check...');
    console.log('🔧 SHIM [faceDetection]: navigator.mediaDevices exists?', !!nav.mediaDevices);
    console.log('🔧 SHIM [faceDetection]: getUserMedia type before shim:', typeof (nav.mediaDevices?.getUserMedia));
    
    if (!window.isSecureContext && !isDevelopment) {
      console.warn('⚠️ Camera requires HTTPS on many browsers and all mobile devices. Current context is insecure.');
    }

    // Create mediaDevices object if it doesn't exist (very old browsers)
    if (typeof nav.mediaDevices === 'undefined' || !nav.mediaDevices) {
      nav.mediaDevices = {};
      console.log('📱 INFO [faceDetection]: Created mediaDevices object');
    }
    
    // Check if getUserMedia is actually a function (not just defined)
    if (typeof nav.mediaDevices.getUserMedia !== 'function') {
      console.warn('⚠️ WARNING [faceDetection]: navigator.mediaDevices.getUserMedia is not a function, attempting polyfill...');
      
      // Try to find legacy getUserMedia API
      const legacyGetUserMedia = this.getLegacyGetUserMedia(nav);
      
      console.log('🔧 SHIM [faceDetection]: Legacy API found?', !!legacyGetUserMedia, typeof legacyGetUserMedia);
      
      if (legacyGetUserMedia && typeof legacyGetUserMedia === 'function') {
        // Polyfill using legacy API
        nav.mediaDevices.getUserMedia = function(constraints: MediaStreamConstraints) {
          console.log('📱 INFO [faceDetection]: Using legacy getUserMedia polyfill');
          return new Promise<MediaStream>((resolve, reject) => {
            try {
              legacyGetUserMedia.call(nav, constraints, resolve, reject);
            } catch (err) {
              reject(err);
            }
          });
        };
        console.log('✅ SHIM [faceDetection]: Polyfill created successfully');
      } else {
        // No API available - but DON'T throw here, let the later check handle it
        console.error('❌ ERROR [faceDetection]: No camera API available (native or legacy)');
      }
    } else {
      console.log('✅ INFO [faceDetection]: navigator.mediaDevices.getUserMedia is already available as function');
    }
    
    console.log('🔧 SHIM [faceDetection]: getUserMedia type after shim:', typeof (nav.mediaDevices?.getUserMedia));
  }

  private getLegacyGetUserMedia(nav: any) {
    return nav?.getUserMedia || nav?.webkitGetUserMedia || nav?.mozGetUserMedia || nav?.msGetUserMedia;
  }

  private hasCameraSupport(): boolean {
    if (typeof navigator === 'undefined') {
      return false;
    }
    const nav: any = navigator as any;
    const mediaDevices = nav.mediaDevices;
    const legacy = this.getLegacyGetUserMedia(nav);
    return (
      (!!mediaDevices && typeof mediaDevices.getUserMedia === 'function') ||
      typeof legacy === 'function'
    );
  }

  private async requestUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    if (typeof navigator === 'undefined') {
      throw new Error('Camera API not available in this environment.');
    }

    const nav: any = navigator as any;
    const mediaDevices = nav.mediaDevices;

    if (mediaDevices && typeof mediaDevices.getUserMedia === 'function') {
      return mediaDevices.getUserMedia.call(mediaDevices, constraints);
    }

    const legacyGetUserMedia = this.getLegacyGetUserMedia(nav);
    if (typeof legacyGetUserMedia === 'function') {
      return new Promise<MediaStream>((resolve, reject) => {
        try {
          legacyGetUserMedia.call(nav, constraints, resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
    }

    throw new Error('Camera API not available on this browser. Please update to a modern browser with camera support.');
  }

  private async getCameraStream(): Promise<MediaStream> {
    const isMobileDevice = this.isMobile();
    const maxRetries = 3;
    
    console.log(`📱 INFO: Device type: ${isMobileDevice ? 'Mobile' : 'Desktop'}`);
    
    // Enhanced HTTPS check with better error messaging
    // Allow localhost, local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalhost = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
    const isLocalNetwork = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(window.location.hostname);
    const isDevelopment = isLocalhost || isLocalNetwork;
    const isSecure = window.isSecureContext;
    
    if (!this.hasCameraSupport()) {
      if (!isSecure && !isLocalhost) {
        throw new Error(
          'Camera access is blocked because this page is not served over HTTPS.\n\n' +
          'Mobile browsers require HTTPS, even when accessing a local network address (e.g. 192.168.x.x).\n' +
          'Please enable HTTPS for development (see MOBILE_HTTPS_DEV.md) or use a secure tunnel.'
        );
      }
      throw new Error('Camera API not available on this device or browser. Please update to the latest version of Chrome, Safari, or Edge.');
    }

    if (!isSecure && !isDevelopment) {
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port;
      
      if (isMobileDevice) {
        throw new Error(
          `📱 Camera requires HTTPS on mobile devices.\n\n` +
          `Current: ${protocol}//${hostname}${port ? ':' + port : ''}\n\n` +
          `Solution:\n` +
          `1. Use HTTPS (https://${hostname}${port ? ':' + port : ''})\n` +
          `2. Or access via localhost/local network IP for testing\n\n` +
          `Most mobile browsers block camera access on insecure connections for privacy.`
        );
      } else {
        throw new Error(
          `🔒 Camera requires HTTPS or localhost.\n\n` +
          `Current: ${protocol}//${hostname}${port ? ':' + port : ''}\n\n` +
          `Please use HTTPS or run on localhost/local network.`
        );
      }
    }

    this.ensureMediaDevicesShim();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📹 INFO: Camera access attempt ${attempt}/${maxRetries}...`);
        
        // Try with facingMode first (works on most devices)
        if (attempt === 1) {
          console.log('🎯 INFO: Trying facingMode: user (front camera)');
          const constraints: MediaStreamConstraints = {
            video: {
              width: { ideal: this.settings.targetWidth },
              height: { ideal: this.settings.targetHeight },
              facingMode: 'user', // Front camera
            },
            audio: false,
          };
          const stream = await this.requestUserMedia(constraints);
          console.log(`✅ SUCCESS: Camera acquired via facingMode`);
          return stream;
        }
        
        // Attempt 2: try back camera on mobile if front-facing fails
        if (attempt === 2) {
          console.log('🎯 INFO: Trying facingMode: environment (back camera)');
          const envConstraints: MediaStreamConstraints = {
            video: {
              width: { ideal: this.settings.targetWidth },
              height: { ideal: this.settings.targetHeight },
              facingMode: { ideal: 'environment' },
            },
            audio: false,
          };
          try {
            const stream = await this.requestUserMedia(envConstraints);
            console.log('✅ SUCCESS: Camera acquired via back camera');
            return stream;
          } catch (e) {
            console.warn('⚠️ WARNING: environment facingMode failed, continuing...');
          }
        }
        
        // Try with specific device ID (mobile fallback)
        if (attempt === 3 && isMobileDevice) {
          try {
            console.log('🔍 INFO: Enumerating camera devices...');
            if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
              throw new Error('enumerateDevices not supported');
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');
            console.log(`📹 INFO: Found ${videoInputs.length} video input(s):`, videoInputs.map(d => d.label || 'unlabeled'));
            
            const frontCamera = videoInputs.find(d => /front|face|user/i.test(d.label)) || videoInputs[0];
            const backCamera = videoInputs.find(d => /back|rear|environment/i.test(d.label));
            
            if (frontCamera) {
              console.log(`🎯 INFO: Selecting camera: ${frontCamera.label || frontCamera.deviceId}`);
              const constraints: MediaStreamConstraints = {
                video: {
                  deviceId: { exact: frontCamera.deviceId },
                  width: { ideal: this.settings.targetWidth },
                  height: { ideal: this.settings.targetHeight },
                },
                audio: false,
              };
              const stream = await this.requestUserMedia(constraints);
              console.log(`✅ SUCCESS: Camera acquired via deviceId`);
              return stream;
            }

            if (backCamera) {
              console.log(`🎯 INFO: Trying alternate camera: ${backCamera.label || backCamera.deviceId}`);
              const constraints: MediaStreamConstraints = {
                video: {
                  deviceId: { exact: backCamera.deviceId },
                  width: { ideal: this.settings.targetWidth },
                  height: { ideal: this.settings.targetHeight },
                },
                audio: false,
              };
              const stream = await this.requestUserMedia(constraints);
              console.log(`✅ SUCCESS: Back camera acquired via deviceId`);
              return stream;
            }
          } catch (e) {
            console.warn('⚠️ Device enumeration not supported; skipping deviceId selection');
          }
        }
        
        // Final fallback: simplest constraints
        if (attempt === 4) {
          console.log('🔄 INFO: Using minimal constraints (last attempt)');
          const constraints: MediaStreamConstraints = {
            video: true,
            audio: false,
          };
          const stream = await this.requestUserMedia(constraints);
          console.log(`✅ SUCCESS: Camera acquired with minimal constraints`);
          return stream;
        }
        
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`❌ ERROR: Camera attempt ${attempt} failed:`, errorMsg);
        
        // Check for specific error types
        if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
          throw new Error('Camera permission denied. Please allow camera access in your browser settings.');
        }
        if (errorMsg.includes('NotFoundError') || errorMsg.includes('not found')) {
          throw new Error('No camera found. Please ensure a camera is connected.');
        }
        if (errorMsg.includes('NotReadableError')) {
          throw new Error('Camera is in use by another application. Please close other apps using the camera.');
        }
        
        if (attempt < maxRetries) {
          console.log(`⏳ INFO: Retrying in ${300 * attempt}ms...`);
          await new Promise(res => setTimeout(res, 300 * attempt));
          continue;
        }
        throw new Error(`Unable to access camera after ${maxRetries} attempts: ${errorMsg}`);
      }
    }
    
    throw new Error('Camera access failed after all retries');
  }

  startDetection(callback: (metrics: FaceMetrics) => void): void {
    if (this.isRunning) {
      console.warn('⚠️ WARNING: Detection already running');
      return;
    }
    
    if (!this.videoElement || !this.mediaStream) {
      // Attempt auto-initialize once to avoid user-facing errors
      if (!this.initializing) {
        this.initializing = true;
        this.initialize()
          .then(() => {
            this.initializing = false;
            this.startDetection(callback);
          })
          .catch((err) => {
            this.initializing = false;
            console.error('❌ ERROR: Auto-initialize failed:', err);
          });
        return;
      } else {
        console.warn('⏳ Initialization already in progress...');
        return;
      }
    }
    
    console.log('▶️ INFO: Starting face detection loop...');
    this.callback = callback;
    this.isRunning = true;
    stressAnalysisModel.reset();
    
    // Reset smoothing for new session
    this.smoothedBlinkRate = 0;
    this.smoothedBrowFurrow = 0;
    this.smoothedGazeStability = 0;
    
    this.detectionLoop();
  }

  private async detectionLoop(): Promise<void> {
    if (!this.isRunning || !this.videoElement || !this.callback) {
      return;
    }
    
    try {
      // Analyze current video frame
      const result: StressAnalysisResult = await stressAnalysisModel.analyzeFrame(this.videoElement);
      
      // Convert to FaceMetrics format with smoothing
      const metrics = this.convertToFaceMetrics(result);
      
      // Send to callback (emit every frame, typically 100-200ms at 5-10 FPS)
      this.callback(metrics);
      
    } catch (error) {
      console.error('❌ ERROR: Detection loop failed:', error instanceof Error ? error.message : error);
      // Continue loop despite error (resilient to frame processing issues)
    }
    
    // Schedule next frame
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(() => this.detectionLoop());
    }
  }

  private convertToFaceMetrics(result: StressAnalysisResult): FaceMetrics {
    // Apply exponential smoothing to reduce jitter
  const alpha = 0.2; // Smoother factor to reduce jitter
    
  this.smoothedBlinkRate = this.smoothedBlinkRate * (1 - alpha) + result.blinkRate * alpha;
  this.smoothedBrowFurrow = this.smoothedBrowFurrow * (1 - alpha) + (result.metrics.browTension / 100) * alpha;
  this.smoothedGazeStability = this.smoothedGazeStability * (1 - alpha) + (1 - result.metrics.gazeInstability / 100) * alpha;
    
    // Calculate derived metrics
    const stress = result.stressScore / 100;
    const concentration = result.faceDetected ? Math.max(0, 1 - result.metrics.gazeInstability / 100) : 0;
    const fatigue = result.faceDetected ? Math.min(1, (result.blinkRate / 30) * 0.5 + result.metrics.browTension / 200) : 0;
    
    return {
      isPresent: result.faceDetected,
      blinkRate: Math.round(this.smoothedBlinkRate * 10) / 10, // One decimal
  eyeAspectRatio: Math.round(result.eyeAspectRatio * 100) / 100,
  jawOpenness: Math.max(0, Math.min(1, 1 - result.metrics.jawClench / 100)),
      browFurrow: Math.round(this.smoothedBrowFurrow * 100) / 100,
      gazeStability: Math.round(this.smoothedGazeStability * 100) / 100,
      expressionCues: {
        concentration: Math.round(concentration * 100) / 100,
        stress: Math.round(stress * 100) / 100,
        fatigue: Math.round(fatigue * 100) / 100,
      },
      fps: result.fps ?? 0,
      latencyMs: result.latencyMs ?? 0,
      confidence: result.confidence,
      stressScore: result.stressScore,
      isHighStress: result.isHighStress,
      signals: {
        browTension: result.metrics.browTension,
        jawClench: result.metrics.jawClench,
        blinkRateAbnormal: result.metrics.blinkRateAbnormal,
        lipCompression: result.metrics.lipPress,
        microExpressionTension: result.metrics.microExpressionTension,
        headMovement: result.metrics.headMovement,
        gazeInstability: result.metrics.gazeInstability,
      },
      blinkData: {
        totalBlinksInWindow: result.blinkMetrics.totalBlinksInWindow,
        blinkRatePerSecond: result.blinkRate / 60,
        lastBlinkTimestamp: result.blinkMetrics.lastBlinkTimestamp ?? Date.now(),
        avgBlinkDuration: result.blinkMetrics.avgBlinkDuration || 0,
      },
    };
  }

  stopDetection(): void {
    if (!this.isRunning) {
      return;
    }
    
    console.log('⏸️ Stopping face detection...');
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.callback = null;
    this.cleanup();
  }

  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
    
    stressAnalysisModel.reset();
    
    // Reset smoothing
    this.smoothedBlinkRate = 0;
    this.smoothedBrowFurrow = 0;
    this.smoothedGazeStability = 0;
  }

  getBlinkHistory(): BlinkEvent[] {
    return stressAnalysisModel.getBlinkHistory().map(event => ({ ...event }));
  }

  clearBlinkHistory(): void {
    stressAnalysisModel.clearBlinkHistory();
  }

  setSettings(partial: Partial<FaceDetectionSettings>): void {
    this.settings = { ...this.settings, ...partial };
    stressAnalysisModel.updateConfig({
      minDetectionConfidence: this.settings.minDetectionConfidence,
      minTrackingConfidence: this.settings.minTrackingConfidence,
      blinkCloseThreshold: this.settings.blinkCloseThreshold,
      blinkOpenThreshold: this.settings.blinkOpenThreshold,
    });
  }

  getSettings(): FaceDetectionSettings {
    return { ...this.settings };
  }
}

export const faceDetectionService = new FaceDetectionService();
