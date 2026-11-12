// Decodes QR codes in image files with macOS's own detector (Core Image), so
// scripts/verify-qr.mjs checks our encoder against a reader we did not write.
//
//   swift scripts/qr-decode.swift a.png b.png
//
// Prints one line per image: the decoded text, or NONE when no code was found.
import CoreImage
import Foundation

guard let detector = CIDetector(
  ofType: CIDetectorTypeQRCode,
  context: nil,
  options: [CIDetectorAccuracy: CIDetectorAccuracyHigh]
) else {
  print("NODETECTOR")
  exit(1)
}

for path in CommandLine.arguments.dropFirst() {
  guard let image = CIImage(contentsOf: URL(fileURLWithPath: path)) else {
    print("NOIMAGE")
    continue
  }
  let codes = detector.features(in: image).compactMap { $0 as? CIQRCodeFeature }
  print(codes.first?.messageString ?? "NONE")
}
