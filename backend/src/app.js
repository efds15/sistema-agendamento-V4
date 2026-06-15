import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import routes from './routes/index.js'

const app = express()

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)
    const allowed =
      allowedOrigins.some(u => origin.startsWith(u)) ||
      /\.vercel\.app$/.test(origin) ||
      /\.railway\.app$/.test(origin)
    if (allowed) cb(null, true)
    else cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

app.use(express.json())
app.use('/api', routes)
app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

export default app
