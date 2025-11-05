declare module '@mediapipe/camera_utils' {
  export class Camera {
    constructor(videoElement: HTMLVideoElement, config: {
      onFrame: () => void | Promise<void>;
      width: number;
      height: number;
    });
    start(): void;
    stop(): void;
  }
}

declare module '@mediapipe/face_mesh' {
  export interface NormalizedLandmark {
    x: number;
    y: number;
    z?: number;
  }

  export interface Results {
    multiFaceLandmarks?: NormalizedLandmark[][];
    image?: HTMLCanvasElement | HTMLVideoElement | HTMLImageElement;
  }

  export interface FaceMeshConfig {
    locateFile: (file: string) => string;
  }

  export interface FaceMeshOptions {
    maxNumFaces?: number;
    refineLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }

  export class FaceMesh {
    constructor(config: FaceMeshConfig);
    setOptions(options: FaceMeshOptions): void;
    onResults(callback: (results: Results) => void): void;
    send(inputs: { image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement }): Promise<void>;
    close(): void;
  }
}
