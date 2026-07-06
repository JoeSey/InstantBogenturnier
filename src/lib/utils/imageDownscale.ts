// Client-side image downscaling utility for the Settings form's header-logo uploads
// (05-01-PLAN.md Task 1). Uses the classic FileReader -> Image -> Canvas `drawImage`
// -> `canvas.toBlob`/`toDataURL` pattern per RESEARCH.md Pattern 2.
//
// T-05-01 mitigation (Tampering, STRIDE): validates `file.type.startsWith('image/')`
// before any Canvas processing — malformed/non-image files reject before reaching
// `Image.onload`, so the caller can surface `errorUploadFailed` without ever handing
// arbitrary bytes to the Canvas/Image pipeline.

export interface DownscaledImage {
  blob: Blob;
  dataUri: string;
}

export function downscaleImageBlob(
  file: File,
  maxWidth = 500,
  maxHeight = 500,
  quality = 0.85
): Promise<DownscaledImage> {
  if (!file.type.startsWith('image/')) {
    return Promise.reject(new Error(`Not an image file: ${file.type || 'unknown type'}`));
  }

  return new Promise<DownscaledImage>((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error('Failed to decode image'));
      img.onload = () => {
        // Preserve aspect ratio — scale down to fit within maxWidth x maxHeight without
        // stretching to a fixed square.
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const mimeType = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
        const dataUri = canvas.toDataURL(mimeType, quality);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed'));
              return;
            }
            resolve({ blob, dataUri });
          },
          mimeType,
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
