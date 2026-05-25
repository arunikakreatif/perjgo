import React, { useState } from 'react';
import { Check, Clipboard, ExternalLink, Printer, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrintSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const PrintSuccessModal: React.FC<PrintSuccessModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleOpen = () => {
    window.open(url, '_blank');
    onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          id="print-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-secondary/65 backdrop-blur-sm"
        />

        {/* Modal card */}
        <motion.div
          id="print-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="relative bg-white border border-outline-variant w-full max-w-md p-6 rounded-2xl shadow-xl z-10 flex flex-col items-center text-center"
        >
          {/* Close button top right */}
          <button
            id="print-modal-close"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-low transition-all rounded-full"
          >
            <X size={20} />
          </button>

          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-200 shadow-sm mb-4">
            <Printer size={32} className="animate-pulse" />
          </div>

          {/* Message */}
          <h3 className="text-xl font-bold text-on-surface mb-2">Dokumen Siap Dicetak!</h3>
          <p className="text-sm text-on-surface-variant/70 mb-6 max-w-sm">
            File PDF untuk <span className="font-semibold text-primary">{title}</span> telah berhasil dibuat. Silakan klik tombol di bawah ini untuk membuka dokumen di tab baru.
          </p>

          {/* Action buttons */}
          <div className="w-full space-y-2.5">
            <button
              id="print-modal-open-btn"
              onClick={handleOpen}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 px-4 rounded-xl font-bold hover:bg-primary-container transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              <ExternalLink size={18} />
              Buka & Cetak PDF
            </button>

            <button
              id="print-modal-copy-btn"
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 bg-surface border border-outline-variant text-on-surface font-semibold py-3 px-4 rounded-xl hover:bg-surface-container-low transition-all hover:scale-[1.01] active:scale-[0.98] cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={18} className="text-green-600 animate-in zoom-in-50 duration-200" />
                  <span className="text-green-600">Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <Clipboard size={18} className="text-on-surface-variant" />
                  <span>Salin Link Dokumen</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
