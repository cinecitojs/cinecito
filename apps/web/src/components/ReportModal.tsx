// apps/web/src/components/ReportModal.tsx
// Modal reutilizable para reportar usuario / sala / mensaje / enlace.
// Envía a POST /reports. Categorías: copyright, spam, acoso, suplantación, ilegal, otro.
import React, { useState } from 'react';
import { Flag, ShieldAlert } from 'lucide-react';
import { reportsApi } from '../lib/api';
import { Modal, Button, toast } from './ui';

export type ReportTargetType = 'user' | 'room' | 'message' | 'link';
export type ReportReason = 'copyright' | 'spam' | 'harassment' | 'impersonation' | 'illegal' | 'other';

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  context?: string; // sala, fragmento del mensaje, URL…
  label?: string;   // texto mostrado ("el mensaje de Ana", "esta sala"…)
}

const REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: 'copyright',     label: 'Derechos de autor',        hint: 'Película/serie/contenido sin autorización' },
  { value: 'spam',          label: 'Spam',                     hint: 'Publicidad, enlaces masivos o repetidos' },
  { value: 'harassment',    label: 'Acoso',                    hint: 'Amenazas, hostigamiento, odio' },
  { value: 'impersonation', label: 'Suplantación de identidad', hint: 'Se hace pasar por otra persona' },
  { value: 'illegal',       label: 'Contenido ilegal',         hint: 'Material ilegal o gravemente dañino' },
  { value: 'other',         label: 'Otro',                     hint: 'Describilo abajo' },
];

const TARGET_LABEL: Record<ReportTargetType, string> = {
  user: 'usuario', room: 'sala', message: 'mensaje', link: 'enlace',
};

export default function ReportModal({ open, onClose, target }: { open: boolean; onClose: () => void; target: ReportTarget | null }) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);

  const reset = () => { setReason(null); setDetails(''); setSending(false); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!target || !reason) return;
    if (reason === 'other' && !details.trim()) { toast('Contanos brevemente el motivo', 'error'); return; }
    setSending(true);
    try {
      await reportsApi.create({
        targetType: target.type,
        targetId: target.id,
        reason,
        details: details.trim() || undefined,
        context: target.context,
      });
      toast('Reporte enviado. Gracias por avisar 🙌', 'success');
      close();
    } catch (err: any) {
      toast(err.response?.data?.error || 'No se pudo enviar el reporte', 'error');
      setSending(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title={target ? `Reportar ${TARGET_LABEL[target.type]}` : 'Reportar'} size="sm">
      <div className="space-y-4">
        {target?.label && (
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> Reportás: <span className="font-semibold text-[var(--text)]">{target.label}</span>
          </p>
        )}

        <div>
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">¿Qué problema hay?</p>
          <div className="flex flex-col gap-1.5">
            {REASONS.map((r) => (
              <button key={r.value} type="button" onClick={() => setReason(r.value)}
                className={`text-left px-3 py-2.5 rounded-2xl border-2 transition-all ${reason === r.value ? 'border-primary bg-primary/10' : 'border-[var(--border)] hover:border-primary/40'}`}>
                <span className="block text-sm font-semibold">{r.label}</span>
                <span className="block text-[11px] text-[var(--text-muted)]">{r.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="report-details" className="text-xs font-semibold text-[var(--text-muted)]">
            Detalles {reason === 'other' ? '(requerido)' : '(opcional)'}
          </label>
          <textarea id="report-details" value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={2000}
            placeholder="Contanos qué pasó…"
            className="mt-1.5 w-full px-3 py-2 rounded-2xl border border-[var(--border)] bg-[var(--bg)] dark:bg-dark-surface2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none" />
        </div>

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={close} className="flex-1">Cancelar</Button>
          <Button onClick={submit} loading={sending} disabled={!reason} className="flex-1">
            <Flag className="w-4 h-4" /> Enviar reporte
          </Button>
        </div>
      </div>
    </Modal>
  );
}
