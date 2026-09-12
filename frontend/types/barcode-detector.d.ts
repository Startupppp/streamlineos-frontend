/**
 * The Barcode Detection API, which TypeScript's DOM lib does not yet declare.
 *
 * Declared as optional on `Window` on purpose: it ships on Chromium and Android
 * and on nothing else, so every call site has to feature-detect rather than
 * assume. An optional property makes that a type error to skip.
 */
interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
}

interface BarcodeDetectorOptions {
  formats?: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  static getSupportedFormats(): Promise<string[]>;
  detect(source: CanvasImageSource | ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector;
}
