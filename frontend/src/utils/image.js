const canvasToBlob = (canvas, mimeType, quality) => {
  return new Promise((resolve) => {
    if (!canvas.toBlob) return resolve(null);
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
};

const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
};

const getTargetSize = (width, height, maxWidth, maxHeight) => {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
};

export async function compressImageFile(
  file,
  {
    maxWidth = 1600,
    maxHeight = 1600,
    maxBytes = 1_800_000,
    mimeType = 'image/jpeg'
  } = {}
) {
  const baseResult = { file, optimized: false, code: 'skip' };
  if (!file || !(file instanceof File)) return baseResult;
  if (!file.type || !file.type.startsWith('image/')) return baseResult;

  let source = null;
  let sourceWidth = 0;
  let sourceHeight = 0;

  try {
    if (window.createImageBitmap) {
      try {
        source = await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        source = await createImageBitmap(file);
      }
      sourceWidth = source.width;
      sourceHeight = source.height;
    } else {
      const img = await loadImage(file);
      source = img;
      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
    }
  } catch {
    return { ...baseResult, code: 'decode_failed' };
  }

  const { width, height } = getTargetSize(sourceWidth, sourceHeight, maxWidth, maxHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return { ...baseResult, code: 'canvas_failed' };
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  if (source && typeof source.close === 'function') {
    try { source.close(); } catch {}
  }

  const qualities = [0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6];
  let bestBlob = null;

  for (const q of qualities) {
    const blob = await canvasToBlob(canvas, mimeType, q);
    if (!blob) break;
    bestBlob = blob;
    if (blob.size <= maxBytes) break;
  }

  if (!bestBlob) return { ...baseResult, code: 'encode_failed' };

  if (bestBlob.size >= file.size && width === sourceWidth && height === sourceHeight) {
    return baseResult;
  }

  const base = file.name.replace(/\.[^.]+$/, '') || 'cover';
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
  return {
    file: new File([bestBlob], `${base}.${ext}`, { type: bestBlob.type || mimeType }),
    optimized: true,
    code: 'ok'
  };
}
