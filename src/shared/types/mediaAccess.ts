/** A conservative reminder that access was granted, not live capture status. */
export interface PossibleMediaAccess {
  camera: boolean;
  microphone: boolean;
}

export type RequestedMediaType = 'audio' | 'video';
