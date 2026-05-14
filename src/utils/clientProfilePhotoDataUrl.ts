/** Réduit la photo de profil pour tenir dans le quota localStorage (data URL JPEG). */
const MAX_EDGE_PX = 512
const JPEG_QUALITY = 0.82

function drawToJpegDataUrl(bitmap: ImageBitmap): string {
  const w0 = bitmap.width
  const h0 = bitmap.height
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(w0, h0))
  const tw = Math.max(1, Math.round(w0 * scale))
  const th = Math.max(1, Math.round(h0 * scale))
  const canvas = document.createElement('canvas')
  canvas.width = tw
  canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2d indisponible')
  ctx.drawImage(bitmap, 0, 0, tw, th)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

function decodeWithHtmlImage(objectUrl: string): Promise<string> {
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
        const scale = Math.min(1, MAX_EDGE_PX / Math.max(w0, h0))
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
        ctx.drawImage(img, 0, 0, tw, th)
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY))
      } catch (e) {
        reject(e)
      }
    }
    img.onerror = () => reject(new Error('Decodage image impossible'))
    img.src = objectUrl
  })
}

export async function fileToCompressedProfilePhotoDataUrl(file: File): Promise<string> {
  let bitmap: ImageBitmap | null = null
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    bitmap = null
  }
  if (bitmap) {
    try {
      return drawToJpegDataUrl(bitmap)
    } finally {
      bitmap.close()
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await decodeWithHtmlImage(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}
