import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function handleDocumentUrl(url: string, type: string, number: string) {
  if (url.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = url;
    // Sanitized file name for download
    const cleanNum = String(number).replace(/[^a-zA-Z0-9_\-]/g, '_');
    link.download = `${type}_${cleanNum}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const newWin = window.open(url, '_blank');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      window.location.href = url;
    }
  }
}
