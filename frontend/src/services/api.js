import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const auth = {
  login:          d  => api.post('/auth/login', d),
  me:             ()  => api.get('/auth/me'),
  changePassword: d  => api.put('/auth/password', d),
}
export const bookings = {
  list:         p  => api.get('/bookings', { params: p }),
  get:          id => api.get(`/bookings/${id}`),
  create:       d  => api.post('/bookings', d),
  update:       (id,d) => api.put(`/bookings/${id}`, d),
  cancel:       id => api.delete(`/bookings/${id}`),
  availability: p  => api.get('/bookings/availability', { params: p }),
}
export const teachers = {
  list:   ()      => api.get('/teachers'),
  get:    id      => api.get(`/teachers/${id}`),
  create: d       => api.post('/teachers', d),
  update: (id,d)  => api.put(`/teachers/${id}`, d),
  toggle: id      => api.patch(`/teachers/${id}/toggle`),
}
export const resources = {
  list:   p      => api.get('/resources', { params: p }),
  create: d      => api.post('/resources', d),
  update: (id,d) => api.put(`/resources/${id}`, d),
  delete: id     => api.delete(`/resources/${id}`),
}
export const equipments = {
  list:   p      => api.get('/equipments', { params: p }),
  create: d      => api.post('/equipments', d),
  update: (id,d) => api.put(`/equipments/${id}`, d),
  delete: id     => api.delete(`/equipments/${id}`),
}
export const slots = {
  list:   ()      => api.get('/slots'),
  create: d       => api.post('/slots', d),
  update: (id,d)  => api.put(`/slots/${id}`, d),
  delete: id      => api.delete(`/slots/${id}`),
}
export const dashboard = {
  get: () => api.get('/dashboard'),
}
export default api
