export interface LandscapePoint {
  x: number;
  y: number;
  stageWidth: number;
  stageHeight: number;
}

export function isViewportPortrait(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < window.innerHeight;
}

/**
 * Converts raw browser clientX/clientY coordinates into the logical Landscape Stage
 * coordinates, seamlessly supporting both native landscape screens and portrait screens
 * auto-rotated +90deg into default Landscape Mode.
 */
export function clientToLandscapePoint(clientX: number, clientY: number): LandscapePoint {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (vw >= vh) {
    return {
      x: clientX,
      y: clientY,
      stageWidth: vw,
      stageHeight: vh,
    };
  }
  // Stage is rotated +90deg with transform: translateX(100vw) rotate(90deg)
  return {
    x: clientY,
    y: vw - clientX,
    stageWidth: vh,
    stageHeight: vw,
  };
}

/**
 * Converts a delta in client screen coordinates into logical Landscape Stage delta.
 */
export function clientDeltaToLandscape(dxClient: number, dyClient: number): { dx: number; dy: number } {
  if (!isViewportPortrait()) {
    return { dx: dxClient, dy: dyClient };
  }
  return {
    dx: dyClient,
    dy: -dxClient,
  };
}

export function tryLockScreenLandscape(): void {
  try {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (mode: 'landscape') => Promise<void>;
    };
    if (orientation && typeof orientation.lock === 'function') {
      orientation.lock('landscape').catch(() => {
        // Ignored on browsers/iframes that disallow orientation lock without fullscreen
      });
    }
  } catch {
    // Ignore unsupported orientation lock APIs
  }
}

type VendorDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type VendorElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function isDocumentFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const doc = document as VendorDocument;
  return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
}

export async function requestAppFullscreen(): Promise<boolean> {
  if (typeof document === 'undefined') return false;
  try {
    const root = document.documentElement as VendorElement;
    if (typeof root.requestFullscreen === 'function') {
      await root.requestFullscreen({ navigationUI: 'hide' });
      tryLockScreenLandscape();
      return true;
    }
    if (typeof root.webkitRequestFullscreen === 'function') {
      await root.webkitRequestFullscreen();
      tryLockScreenLandscape();
      return true;
    }
  } catch {
    // Gracefully ignore when blocked by host iframe policy or browser gesture rules
  }
  return isDocumentFullscreen();
}

export async function exitAppFullscreen(): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    const doc = document as VendorDocument;
    if (doc.fullscreenElement && typeof doc.exitFullscreen === 'function') {
      await doc.exitFullscreen();
    } else if (doc.webkitFullscreenElement && typeof doc.webkitExitFullscreen === 'function') {
      await doc.webkitExitFullscreen();
    }
  } catch {
    // Ignore exit errors
  }
}

export async function toggleAppFullscreen(): Promise<boolean> {
  if (isDocumentFullscreen()) {
    await exitAppFullscreen();
    return false;
  }
  return requestAppFullscreen();
}
