// apps/web/src/pages/CreateRoom.tsx  — FASE 1A
// Redirige al modal de Home; esta ruta es para acceso directo por URL
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CreateRoom() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/home', { replace: true }); }, []);
  return null;
}
