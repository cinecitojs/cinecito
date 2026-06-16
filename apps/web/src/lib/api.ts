import axios from 'axios';

const api = axios.create({ baseURL: (import.meta.env.VITE_API_URL as string) || 'http://localhost:4000' });

export default api;
