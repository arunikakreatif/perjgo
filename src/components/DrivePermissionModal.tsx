import React, { useEffect, useState } from 'react';
import { 
  X, 
  KeyRound, 
  HelpCircle, 
  ExternalLink,
  ChevronRight,
  Clipboard,
  Check,
  Play,
  RotateCw,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DrivePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DrivePermissionModal: React.FC<DrivePermissionModalProps> = ({ isOpen, onClose }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [copiedScript, setCopiedScript] = useState(false);

  // Auto-register to help trap the Google Drive error globally from gasService
  useEffect(() => {
    setActiveStep(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: "Jalankan 'mintaIzinGoogleDrive' di Apps Script",
      desc: "Buka Editor Google Apps Script, pilih fungsi 'mintaIzinGoogleDrive' di dropdown bagian atas editor, lalu klik tombol 'Run' atau 'Jalankan'. Ini akan memicu dialog otorisasi Google.",
      badge: "Inisialisasi Izin"
    },
    {
      num: 2,
      title: "Otorisasi Akun Google",
      desc: "Saat jendela pop-up muncul, klik 'Review Permissions' / 'Tinjau Izin', pilih akun Google Anda, klik 'Advanced' -> 'Go to perjadinGO (unsafe)' dan klik 'Allow' / 'Izinkan'.",
      badge: "Langkah Kritis"
    },
    {
      num: 3,
      title: "Wajib: Deploy Ulang sebagai Versi Baru",
      desc: "Sangat Penting! Walaupun fungsi di Editor Script sukses dijalankan, Web App tidak akan berubah sebelum dideploy ulang. Klik 'Deploy' -> 'Manage Deployments'. Klik ikon Pensil (Edit) -> Di kolom Version, ubah menjadi 'NEW VERSION' -> Pilih 'Execute as' ke 'Me' -> Pilih 'Who has access' ke 'Anyone' -> Klik 'Deploy'.",
      badge: "Paling Penting"
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        {/* Backdrop (Darker overlay with blur to emphasis guide importance) */}
        <motion.div
          id="permission-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-secondary/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          id="permission-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', duration: 0.45 }}
          className="relative bg-white border border-outline-variant w-full max-w-2xl rounded-2xl shadow-2xl z-20 flex flex-col overflow-hidden max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-primary p-6 text-on-primary relative">
            <button
              id="permission-modal-close"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 rounded-xl">
                <KeyRound size={28} className="text-white animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-primary-container bg-white px-2 py-0.5 rounded uppercase">Panduan Autentikasi</span>
                <h3 className="text-2xl font-black mt-1">Perbaiki Akses ditolak: DriveApp</h3>
              </div>
            </div>
          </div>

          {/* Guide Progress Tabs */}
          <div className="bg-surface-container-low border-b border-outline-variant grid grid-cols-3 text-center text-xs font-bold divide-x divide-outline-variant">
            {steps.map((st) => (
              <button
                key={st.num}
                onClick={() => setActiveStep(st.num)}
                className={`py-3 px-2 flex flex-col items-center gap-1 transition-all ${
                  activeStep === st.num 
                    ? "bg-white text-primary border-b-2 border-b-primary shadow-sm" 
                    : "text-on-surface-variant/60 hover:text-on-surface hover:bg-white/40"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  activeStep === st.num ? "bg-primary text-white" : "bg-outline text-on-surface-variant"
                }`}>{st.num}</span>
                <span className="truncate max-w-full hidden sm:block">{st.title.split(" - ")[0]}</span>
              </button>
            ))}
          </div>

          {/* Scrollable Content */}
          <div className="p-8 overflow-y-auto space-y-6 flex-1">
            <div className="flex justify-between items-center bg-red-50 border border-red-100 p-4 rounded-xl text-xs text-red-800">
              <div className="flex items-center gap-2 font-semibold">
                <HelpCircle size={16} className="text-red-600 flex-shrink-0" />
                <span>Masalah: Google Apps Script belum dideploy dengan izin Google Drive aktif.</span>
              </div>
            </div>

            {/* Active step details */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary rounded-full">
                      {steps[activeStep - 1].badge}
                    </span>
                    <h4 className="text-lg font-black text-on-surface mt-1.5">{steps[activeStep - 1].title}</h4>
                  </div>
                  <span className="text-4xl font-black text-outline/30">Step 0{activeStep}</span>
                </div>

                <p className="text-sm text-on-surface-variant/80 leading-relaxed font-medium">
                  {steps[activeStep - 1].desc}
                </p>

                {/* Technical visual guides / widgets based on step */}
                {activeStep === 1 && (
                  <div className="bg-surface-container border border-outline-variant p-4 rounded-xl space-y-3">
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                      <Play size={12} className="text-green-600" /> Tampilan di Editor Google Apps Script:
                    </p>
                    <div className="bg-secondary/95 text-white/90 p-4 rounded-lg font-mono text-xs space-y-2 border border-white/5 shadow-sm leading-relaxed">
                      <div className="flex items-center gap-1.5 text-white/40 pb-2 border-b border-white/5">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                        <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                        <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                        <span className="ml-2">Editor Google Apps Script - code.gs</span>
                      </div>
                      <div className="text-white/40">// Cari dropdown fungsi seperti ini:</div>
                      <div className="flex items-center gap-2 bg-white/5 p-1 rounded max-w-sm border border-white/10 text-[11px]">
                        <span className="text-green-400">▷ Run</span>
                        <span className="text-white/40">|</span>
                        <span className="text-yellow-400">mintaIzinGoogleDrive</span>
                        <span className="text-white/40">v (klik untuk memilih "mintaIzinGoogleDrive")</span>
                      </div>
                      <div className="text-green-300 font-bold">✓ Pilih 'mintaIzinGoogleDrive' lalu klik tombol 'Run' / 'Jalankan'</div>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl space-y-2.5 text-xs text-orange-900 font-medium">
                    <p className="font-bold text-orange-850 uppercase tracking-wide">⚠️ PENTING: Melewati Peringatan "Google hasn't verified this app"</p>
                    <p>Karena skrip ini milik Anda pribadi, Google menganggapnya belum diverifikasi. Ini 100% aman disetujui karena data disimpan di Drive Anda sendiri.</p>
                    <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px] opacity-90">
                      <li>Klik link <strong className="text-orange-950">Advanced / Lanjutan</strong> di ujung kiri bawah popup keamanan.</li>
                      <li>Di bagian bawah, klik tulisan <strong className="text-orange-950 underline">Go to perjadinGO (unsafe)</strong>.</li>
                      <li>Klik <strong className="text-orange-950">Allow / Izinkan</strong> pada konfirmasi akhir.</li>
                    </ol>
                  </div>
                )}

                {activeStep === 3 && (
                  <div className="bg-primary/5 border border-primary/10 p-5 rounded-xl space-y-3.5">
                    <p className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                      <RotateCw size={14} className="animate-spin" /> Mengapa langkah Deployment ini WAJIB?
                    </p>
                    <p className="text-xs text-on-surface-variant/80 font-medium leading-relaxed">
                      Google Apps Script Web App mengunci izin kerja saat diclear ke versi publik. Jika Anda hanya Klik 'Run' tanpa mengupdate versi deployment dengan konfigurasi yang benar, Server Web App akan terus menggunakan izin lama yang "Ditolak".
                    </p>
                    <div className="flex flex-col gap-2 p-3.5 bg-white border border-outline-variant rounded-lg text-xs leading-relaxed font-semibold">
                      <span className="text-primary flex items-center gap-1"><Plus size={14} /> Aturan Konfigurasi Deployment Wajib:</span>
                      <ol className="list-decimal pl-4 space-y-1.5 text-on-surface/85 font-medium text-[11px]">
                        <li>Klik <strong>Deploy</strong> &rarr; <strong>Manage Deployments</strong>.</li>
                        <li>Klik ikon <strong>Pensil (Edit)</strong> pada deployment aktif Anda.</li>
                        <li>Di bagian <strong>Version</strong>, pilih <strong>"NEW VERSION"</strong> (Sangat Penting!).</li>
                        <li>
                          Pada bagian <strong>Execute as / Jalankan sebagai</strong>, pastikan memilih: <span className="bg-yellow-100 text-yellow-800 px-1 rounded font-bold">Me (Saya / Email Anda)</span>.
                        </li>
                        <li>
                          Pada bagian <strong>Who has access / Yang memiliki akses</strong>, pastikan memilih: <span className="bg-yellow-100 text-yellow-800 px-1 rounded font-bold">Anyone (Siapa saja)</span>.
                        </li>
                        <li>Klik tombol <strong>Deploy</strong> yang berwarna biru untuk menyimpan perubahan.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Footer */}
          <div className="bg-surface-container-low p-6 border-t border-outline-variant flex justify-between gap-4 flex-col sm:flex-row items-center">
            <span className="text-xs text-on-surface-variant/65 font-semibold">
              Butuh bantuan? Silakan hubungi pengembang utama.
            </span>
            <div className="flex gap-2.5 w-full sm:w-auto">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={() => setActiveStep(p => p - 1)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 border border-outline-variant rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
                >
                  Kembali
                </button>
              )}
              {activeStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setActiveStep(p => p + 1)}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-container transition-colors"
                >
                  Lanjut
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary-container transition-colors"
                >
                  Saya mengerti, Tutup
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
