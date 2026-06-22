// apps/web/src/pages/NotFound.tsx  — FASE 1A
import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
      <img src="/pochi-sleep.png?v=20260622" alt="Pochi dormido" className="w-56 h-auto mb-4" />
      <h1 className="font-cursive text-5xl text-primary mb-2">404</h1>
      <p className="text-[var(--text-muted)] mb-6">Esta página no existe</p>
      <Link to="/" className="px-6 py-3 rounded-2xl bg-primary text-white font-bold hover:bg-primary-dark transition-all shadow-cine">
        Volver al inicio
      </Link>
    </div>
  );
}
