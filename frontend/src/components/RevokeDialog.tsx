import { useEffect, useState } from 'react';
import { ShieldBan } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../services/api';
import { revokeCertificate } from '../services/certificateService';
import type { Certificate } from '../types';
import { Button, Modal, Textarea } from './ui';

export function RevokeDialog({
  certificate,
  onClose,
  onRevoked,
}: {
  certificate: Pick<Certificate, 'certificateId' | 'recipientName' | 'certificateTitle'> | null;
  onClose: () => void;
  onRevoked: (updated: Certificate) => void;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => setReason(''), [certificate?.certificateId]);

  const confirm = async () => {
    if (!certificate) return;
    setBusy(true);
    try {
      const updated = await revokeCertificate(certificate.certificateId, reason.trim());
      toast.success('Certificate revoked', `${certificate.recipientName}'s certificate now verifies as REVOKED.`);
      onRevoked(updated);
      onClose();
    } catch (err) {
      toast.error('Could not revoke certificate', getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={!!certificate}
      onClose={busy ? () => undefined : onClose}
      icon={
        <span className="flex size-11 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldBan className="size-5" />
        </span>
      }
      title="Revoke this certificate?"
      description={
        certificate && (
          <>
            <strong className="font-medium text-slate-700">{certificate.recipientName}</strong> —{' '}
            {certificate.certificateTitle}. Anyone who verifies it will see it as <strong>REVOKED</strong>. This cannot be
            undone.
          </>
        )
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={busy}>
            Revoke certificate
          </Button>
        </>
      }
    >
      <Textarea
        label="Reason"
        optional
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={300}
        rows={3}
        placeholder="e.g. Issued with an incorrect course name"
        hint="Recorded for administrators; not shown publicly."
      />
    </Modal>
  );
}
