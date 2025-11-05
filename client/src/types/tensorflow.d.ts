declare module "@tensorflow-models/face-landmarks-detection" {
  export enum SupportedModels {
    MediaPipeFaceMesh = "mediapipe_face_mesh",
  }

  export interface MediaPipeFaceMeshMediaPipeModelConfig {
    runtime: "mediapipe";
    refineLandmarks?: boolean;
    solutionPath?: string;
  }

  export interface MediaPipeFaceMeshTFJSModelConfig {
    runtime: "tfjs";
    maxFaces?: number;
  }

  export type MediaPipeFaceMeshModelConfig = 
    | MediaPipeFaceMeshMediaPipeModelConfig 
    | MediaPipeFaceMeshTFJSModelConfig;

  export interface FaceLandmarksDetectorInput {
    input: HTMLVideoElement;
    predictIrises?: boolean;
  }

  export interface FaceLandmarksDetectorKeypoint {
    x: number;
    y: number;
    z?: number;
  }

  export interface FaceLandmarksDetectorResult {
    keypoints: FaceLandmarksDetectorKeypoint[];
  }

  export interface FaceLandmarksDetector {
    estimateFaces(config: FaceLandmarksDetectorInput): Promise<FaceLandmarksDetectorResult[]>;
  }

  export function createDetector(
    model: SupportedModels,
    config: MediaPipeFaceMeshModelConfig
  ): Promise<FaceLandmarksDetector>;

  export function load(
    model: SupportedModels,
    config: MediaPipeFaceMeshModelConfig
  ): Promise<FaceLandmarksDetector>;
}
