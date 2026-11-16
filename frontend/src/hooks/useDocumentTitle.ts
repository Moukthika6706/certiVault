import { useEffect } from 'react';

export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · CertiVault` : 'CertiVault — Certificate Issuance & Verification';
  }, [title]);
}
