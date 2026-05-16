import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Wallet, 
  Users2, 
  Contact, 
  Save,
  HelpCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { gasService } from '../services/gasService';

const Konfigurasi: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    gasService.getConfig()
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch config", err);
        setLoading(false);
      });
  }, []);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    gasService.updateConfig(config)
      .then(() => {
        setSaving(false);
        setStatus({ type: 'success', message: 'Konfigurasi berhasil disimpan ke sistem.' });
        setTimeout(() => setStatus(null), 5000);
      })
      .catch(err => {
        console.error("Failed to update config", err);
        setSaving(false);
        setStatus({ type: 'error', message: 'Gagal menyimpan konfigurasi. Silakan coba lagi.' });
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setConfig((prev: any) => ({ ...prev, [name]: value }));
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-medium">Memuat konfigurasi sistem...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-top-2 duration-500 pb-20">
      {/* Header Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-8 rounded-xl border border-outline-variant flex gap-6 items-center">
          <div className="p-4 bg-primary-fixed rounded-full text-primary">
            <ShieldCheck size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-on-surface">Konfigurasi Sistem</h3>
            <p className="text-sm text-on-surface-variant font-medium mt-1">Lengkapi parameter desa untuk sinkronisasi otomatis dokumentasi perjalanan dinas.</p>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => {
                  if(confirm("Jalankan inisialisasi sheet? Ini akan membuat sheet jika belum ada.")) {
                    gasService.initApp().then(msg => alert(msg));
                  }
                }}
                className="text-[10px] font-bold text-primary uppercase border border-primary px-2 py-1 rounded hover:bg-primary/5"
              >
                Cek / Inisialisasi Sheet
              </button>
            </div>
          </div>
        </div>
        <div className="bg-primary p-8 rounded-xl text-on-primary flex flex-col justify-center shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <Wallet size={80} />
          </div>
          <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Tahun Anggaran Aktif</p>
          <p className="text-4xl font-bold mt-1 tnum">{config.tahun_anggaran}</p>
        </div>
      </div>

      {status && (
        <div className={cn(
          "p-6 rounded-xl border animate-in slide-in-from-top-2 duration-300 shadow-sm",
          status.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
        )}>
          <div className="flex gap-3">
            {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <div className="space-y-1">
              <p className="text-base font-bold">{status.message}</p>
              {status.type === 'error' && status.message.includes('Gagal membuka Template ID') && (
                <div className="mt-2 p-3 bg-white/50 rounded-lg text-sm font-medium">
                  <p className="flex items-center gap-2 mb-1"><Info size={16} /> Solusi Permission Error:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-90 text-xs">
                    <li>Pastikan ID Template Google Doc sudah benar.</li>
                    <li>Pastikan Google Doc tersebut bisa "Dilihat oleh siapa saja yang memiliki link".</li>
                    <li>Atau pastikan akun yang mendeploy script memiliki akses Edit ke Doc tersebut.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Configuration Form */}
      <form className="grid grid-cols-1 md:grid-cols-12 gap-6" onSubmit={handleUpdate}>
        {/* Identitas Wilayah */}
        <div className="md:col-span-12 bg-white p-8 rounded-xl border border-outline-variant space-y-8">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <MapPin size={24} className="text-primary" />
            <h4 className="text-lg font-bold text-primary">Identitas Wilayah</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nama Desa</label>
              <input 
                name="nama_desa"
                value={config.nama_desa || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                placeholder="Contoh: Desa Suka Maju" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kecamatan</label>
              <input 
                name="kecamatan"
                value={config.kecamatan || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                placeholder="Nama Kecamatan" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kabupaten / Kota</label>
              <input 
                name="kabupaten"
                value={config.kabupaten || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                placeholder="Nama Kabupaten" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Alamat Kantor</label>
              <input 
                name="alamat_kantor"
                value={config.alamat_kantor || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none transition-all" 
                placeholder="Alamat Lengkap" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email Kantor</label>
              <input 
                name="email"
                value={config.email || ""}
                onChange={handleChange}
                type="email" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none transition-all" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Website Kantor</label>
              <input 
                name="web"
                value={config.web || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none transition-all" 
                placeholder="www.desa-sukamaju.id"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kode Pos</label>
              <input 
                name="kodepos"
                value={config.kodepos || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none transition-all" 
              />
            </div>
          </div>
        </div>


        {/* Pejabat Penandatangan */}
        <div className="md:col-span-12 bg-white p-8 rounded-xl border border-outline-variant space-y-8">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <Contact size={24} className="text-primary" />
            <h4 className="text-lg font-bold text-primary">Pejabat Penandatangan</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kepala Desa</label>
              <input 
                name="kepala_desa"
                value={config.kepala_desa || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Sekretaris Desa</label>
              <input 
                name="sekretaris_desa"
                value={config.sekretaris_desa || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Bendahara</label>
              <input 
                name="bendahara"
                value={config.bendahara || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none" 
              />
            </div>
          </div>
        </div>

        {/* Konteks Anggaran */}
        <div className="md:col-span-12 bg-white p-8 rounded-xl border border-outline-variant space-y-8">
          <div className="flex items-center gap-3 border-b border-outline-variant pb-4">
            <Wallet size={24} className="text-primary" />
            <h4 className="text-lg font-bold text-primary">Konteks Anggaran</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tahun Anggaran</label>
              <input 
                name="tahun_anggaran"
                value={config.tahun_anggaran}
                onChange={handleChange}
                type="number" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none" 
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Kode Anggaran Utama</label>
              <input 
                name="kode_anggaran"
                value={config.kode_anggaran || ""}
                onChange={handleChange}
                type="text" 
                className="p-3 bg-surface border border-outline-variant rounded-lg focus:border-primary outline-none" 
                placeholder="4.2.1.01" 
              />
            </div>
          </div>

        </div>

        <div className="md:col-span-12 flex justify-end pb-12">
          <button 
            disabled={saving}
            type="submit"
            className="w-full md:w-64 bg-primary hover:bg-primary-container text-on-primary font-bold py-4 rounded-xl text-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={24} />}
            Simpan Konfigurasi
          </button>
        </div>
      </form>

      <div className="fixed bottom-8 right-8 z-50">
        <button className="bg-primary text-on-primary w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform active:scale-95">
          <HelpCircle size={28} />
        </button>
      </div>
    </div>
  );
};

export default Konfigurasi;
