export type CompressImageOptions = {
  maxEdgePx: number
  jpegQuality: number
}

const PROFILE_PHOTO_OPTS: CompressImageOptions = {
  maxEdgePx: 512,
  jpegQuality: 0.82,
}

const VEHICLE_PHOTO_OPTS: CompressImageOptions = {
  maxEdgePx: 1600,
  jpegQuality: 0.88,
}

function drawToJpegDataUrl(bitmap: ImageBitmap, options: CompressImageOptions): string {
  const w0 = bitmap.width
  const h0 = bitmap.height
  const scale = Math.min(1, options.maxEdgePx / Math.max(w0, h0))
  const tw = Math.max(1, Math.round(w0 * scale))
  const th = Math.max(1, Math.round(h0 * scale))
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d indisponible')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, tw, th)
  return canvas.toDataURL('image/jpeg', options.jpegQuality)
}

function decodeWithHtmlImage(objectUrl: string, options: CompressImageOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const w0 = img.naturalWidth
        const h0 = img.naturalHeight
        if (!w0 || !h0) {
          reject(new Error('Image vide'))
          return
        }
        const scale = Math.min(1, options.maxEdgePx / Math.max(w0, h0))
        const tw = Math.max(1, Math.round(w0 * scale))
        const th = Math.max(1, Math.round(h0 * scale))
        const canvas = document.createElement('canvas')
        canvas.width = tw
        canvas.height = th
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2d indisponible'))
          return
        }
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, tw, th)
        resolve(canvas.toDataURL('image/jpeg', options.jpegQuality))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('Decodage image impossible'))
    img.src = objectUrl
  })
}

async function fileToCompressedImageDataUrl(
  file: File,
  options: CompressImageOptions
): Promise<string> {
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    bitmap = null
  }
  if (bitmap) {
    try {
      return drawToJpegDataUrl(bitmap, options)
    } finally {
      bitmap.close()
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await decodeWithHtmlImage(url, options)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Photo de profil (avatar) — réduite pour le quota localStorage. */
export async function fileToCompressedProfilePhotoDataUrl(file: File): Promise<string> {
  return fileToCompressedImageDataUrl(file, PROFILE_PHOTO_OPTS)
}

/** Photo véhicule / bannière — résolution plus haute pour l’affichage 16:9. */
export async function fileToCompressedVehiclePhotoDataUrl(file: File): Promise<string> {
  return fileToCompressedImageDataUrl(file, VEHICLE_PHOTO_OPTS)
}
