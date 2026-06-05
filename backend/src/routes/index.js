import { getSlots, createSlot, updateSlot, deleteSlot } from '../controllers/slotController.js'
import { Router } from 'express'
import { login, me, changePassword } from '../controllers/authController.js'
import { getBookings, getBookingById, createBooking, updateBooking, cancelBooking, getAvailability, getDashboard } from '../controllers/bookingController.js'
import { getTeachers, getTeacherById, createTeacher, updateTeacher, toggleTeacher, getResources, createResource, updateResource, deleteResource, getEquipments, createEquipment, updateEquipment, deleteEquipment, getUsers, updateUser, resetUserPassword, createUser } from '../controllers/resourceController.js'
import { getNotifications, markRead, markAllRead, deleteNotification } from '../controllers/notificationController.js'
import { uploadTeacherImage, uploadUserImage, uploadEquipmentImage, deleteImage } from '../controllers/uploadController.js'
import { authMiddleware, adminOnly, superAdminOnly } from '../middleware/auth.js'
import { upload } from '../middleware/upload.js'

const r = Router()

// ── Público ────────────────────────────────────────────────
r.post('/auth/login', login)

// ── Autenticado ────────────────────────────────────────────
r.use(authMiddleware)

r.get('/auth/me',       me)
r.put('/auth/password', changePassword)

r.get('/dashboard', getDashboard)

r.get('/bookings/availability', getAvailability)
r.get('/bookings',        getBookings)
r.get('/bookings/:id',    getBookingById)
r.post('/bookings',       createBooking)
r.put('/bookings/:id',    updateBooking)
r.delete('/bookings/:id', cancelBooking)

r.get('/resources',           getResources)
r.post('/resources',          adminOnly, createResource)
r.put('/resources/:id',       adminOnly, updateResource)
r.delete('/resources/:id',    adminOnly, deleteResource)

r.get('/equipments',           getEquipments)
r.post('/equipments',          adminOnly, createEquipment)
r.put('/equipments/:id',       adminOnly, updateEquipment)
r.delete('/equipments/:id',    adminOnly, deleteEquipment)

r.get('/teachers',               getTeachers)
r.get('/teachers/:id',           getTeacherById)
r.post('/teachers',              adminOnly, createTeacher)
r.put('/teachers/:id',           adminOnly, updateTeacher)
r.patch('/teachers/:id/toggle',  adminOnly, toggleTeacher)

r.get('/users',                       superAdminOnly, getUsers)
r.post('/users',                      superAdminOnly, createUser)
r.put('/users/:id',                   superAdminOnly, updateUser)
r.put('/users/:id/reset-password',    superAdminOnly, resetUserPassword)

// ── Upload de imagens ──────────────────────────────────────
r.post('/teachers/:id/image',   (req,res,next) => { req.uploadFolder='avatars';    next() }, upload.single('image'), uploadTeacherImage)
r.post('/users/:id/image',      (req,res,next) => { req.uploadFolder='avatars';    next() }, upload.single('image'), uploadUserImage)
r.post('/equipments/:id/image', (req,res,next) => { req.uploadFolder='equipments'; next() }, upload.single('image'), uploadEquipmentImage)
r.delete('/image/:type/:id',    adminOnly, deleteImage)

// ── Notificações ───────────────────────────────────────────
r.get('/notifications',             getNotifications)
r.patch('/notifications/:id/read',  markRead)
r.patch('/notifications/read-all',  markAllRead)
r.delete('/notifications/:id',      deleteNotification)

// ── Aulas / Horários ───────────────────────────────────────
r.get('/slots',         getSlots)
r.post('/slots',        superAdminOnly, createSlot)
r.put('/slots/:id',     superAdminOnly, updateSlot)
r.delete('/slots/:id',  superAdminOnly, deleteSlot)

export default r
