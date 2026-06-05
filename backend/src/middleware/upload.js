import multer from 'multer'
import path from 'path'
import cloudinary from '../config/cloudinary.js'

const fileFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  const ext = path.extname(file.originalname).toLowerCase()
  if (allowed.includes(ext)) cb(null, true)
  else cb(new Error('Apenas imagens são permitidas (jpg, png, webp)'), false)
}

// Memory storage — no disk writes (required for Vercel serverless)
export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// Upload a buffer to Cloudinary and return the result object
export function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `agendamento/${folder}`, resource_type: 'image' },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )
    stream.end(buffer)
  })
}

// Delete an image from Cloudinary using its secure_url
export async function removeCloudinaryImage(imageUrl) {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return
  try {
    // Extract public_id: everything after /upload/v{version}/ without extension
    const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/)
    if (match) await cloudinary.uploader.destroy(match[1])
  } catch {}
}
