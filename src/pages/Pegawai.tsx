import React, { useEffect, useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  UserCircle,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Plus
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Employee } from '../types';
import { gasService } from '../services/gasService';

const Pegawai: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    nik: '',
    niap: '',
    position: '',
    pangkat: '',
    golongan: '',
    address: ''
  });

  useEffect(() => {
    gasService.getPegawai()
      .then(data => {
        setEmployees(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch employees", err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    
    const promise = formData.id 
      ? gasService.editPegawai(formData.id, formData)
      : gasService.tambahPegawai(formData);

    promise
      .then(() => {
        return gasService.getPegawai();
      })
      .then(data => {
        setEmployees(data);
        setSaving(false);
        setStatus({ type: 'success', message: `Data pegawai berhasil ${formData.id ? 'diperbarui' : 'disimpan'}!` });
        setTimeout(() => {
          setShowForm(false);
          setStatus(null);
          setFormData({ name: '', nik: '', niap: '', position: '', pangkat: '', golongan: '', address: '' });
        }, 2000);
      })
      .catch(err => {
        console.error("Failed to save employee", err);
        setSaving(false);
        setStatus({ type: 'error', message: 'Gagal menyimpan data pegawai.' });
      });
  };

  const handleEdit = (emp: Employee) => {
    setFormData({ ...emp });
    setShowForm(true);
    setStatus(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data pegawai ini?")) {
      setLoading(true);
      gasService.hapusPegawai(id)
        .then(() => {
          return gasService.getPegawai();
        })
        .then(data => {
          setEmployees(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Failed to delete employee", err);
          alert("Gagal menghapus pegawai.");
          setLoading(false);
        });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-medium">Memuat data pegawai...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-outline-variant pb-6">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Daftar Pegawai</h2>
          <p className="text-on-surface-variant font-medium mt-1">Manajemen data personil dan otoritas akses sistem.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => {
              setFormData({ name: '', nik: '', niap: '', position: '', pangkat: '', golongan: '', address: '' });
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-all shadow-sm"
          >
            <UserPlus size={20} />
            Tambah Pegawai
          </button>
        )}
      </div>

      {showForm ? (
        <div className="animate-in slide-in-from-top-4 duration-500 max-w-2xl mx-auto">
          <div className="bg-white border border-outline-variant rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 bg-primary text-on-primary flex justify-between items-center">
              <h4 className="text-xl font-bold flex items-center gap-2">
                {formData.id ? <Edit /> : <UserPlus />}
                {formData.id ? 'Edit Data Pegawai' : 'Data Pegawai Baru'}
              </h4>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Nama Lengkap</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-2.5 border border-outline-variant rounded-lg outline-none focus:border-primary" placeholder="Nama..." />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Jabatan</label>
                  <input required value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="p-2.5 border border-outline-variant rounded-lg outline-none focus:border-primary" placeholder="Jabatan..." />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">NIK</label>
                  <input required value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value})} className="p-2.5 border border-outline-variant rounded-lg outline-none focus:border-primary" placeholder="NIK..." />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">NIAP</label>
                  <input value={formData.niap} onChange={e => setFormData({...formData, niap: e.target.value})} className="p-2.5 border border-outline-variant rounded-lg outline-none focus:border-primary" placeholder="NIAP..." />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Pangkat</label>
                  <input value={formData.pangkat} onChange={e => setFormData({...formData, pangkat: e.target.value})} className="p-2.5 border border-outline-variant rounded-lg outline-none focus:border-primary" placeholder="Pangkat..." />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Golongan</label>
                  <input value={formData.golongan} onChange={e => setFormData({...formData, golongan: e.target.value})} className="p-2.5 border border-outline-variant rounded-lg outline-none focus:border-primary" placeholder="Golongan..." />
                </div>
                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-[10px] font-bold text-on-surface-variant uppercase">Alamat</label>
                  <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="p-2.5 border border-outline-variant rounded-lg outline-none focus:border-primary" placeholder="Alamat..." />
                </div>
              </div>

              {status && (
                <div className={cn(
                  "p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300",
                  status.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
                )}>
                  <p className="text-sm font-bold flex items-center gap-2">
                    {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    {status.message}
                  </p>
                </div>
              )}

              <div className="pt-6 border-t border-outline-variant flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 border border-outline text-on-surface rounded-lg font-bold">Batal</button>
                <button disabled={saving} type="submit" className="px-6 py-2 bg-primary text-on-primary rounded-lg font-bold flex items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                  Simpan Pegawai
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Summary Area */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'Total Pegawai', value: '24', color: 'border-t-primary' },
          { label: 'Aktif Dinas', value: '5', color: 'border-t-secondary' },
          { label: 'Jabatan Struktural', value: '12', color: 'border-t-outline' },
          { label: 'Staff Teknis', value: '7', color: 'border-t-primary-container' },
        ].map((stat) => (
          <div key={stat.label} className={cn("bg-white p-6 border border-outline-variant rounded-xl border-t-4", stat.color)}>
            <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-2xl font-bold mt-2 tnum">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Search & Actions Bar */}
      <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant bg-surface-container-low flex flex-col md:flex-row justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
            <input 
              type="text" 
              placeholder="Cari Pegawai berdasarkan nama atau NIK..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-outline-variant rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-on-surface">
              <tr>
                <th className="p-4 text-xs font-bold uppercase tracking-wider border-b border-outline-variant">No</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider border-b border-outline-variant">Nama</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider border-b border-outline-variant">NIK / NIAP</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider border-b border-outline-variant">Jabatan</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider border-b border-outline-variant">Alamat</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider border-b border-outline-variant text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30 text-sm">
              {employees.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-surface-container-low transition-colors group">
                  <td className="p-4 tnum">{idx + 1}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container/20 flex items-center justify-center text-primary font-bold text-xs">
                        {emp.name.charAt(0)}
                      </div>
                      <span className="font-bold text-on-surface">{emp.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-on-surface-variant tnum">
                    {emp.nik}
                    {emp.niap && <span className="block text-[10px] opacity-70">NIAP: {emp.niap}</span>}
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-3 py-1 text-xs font-bold rounded-full border",
                      emp.position.includes('Sekretaris') ? "bg-secondary-container text-on-secondary-container border-outline/20" :
                      emp.position.includes('Bendahara') ? "bg-tertiary-fixed text-on-tertiary-fixed-variant border-outline/20" :
                      "bg-surface-variant text-on-surface-variant border-outline/20"
                    )}>
                      {emp.position}
                    </span>
                  </td>
                  <td className="p-4 max-w-xs truncate text-on-surface-variant">{emp.address}</td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => handleEdit(emp)}
                        className="p-2 text-on-surface-variant hover:text-primary transition-colors" 
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 text-on-surface-variant hover:text-error transition-colors" 
                        title="Hapus"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 bg-surface-container-low flex justify-between items-center text-sm border-t border-outline-variant">
          <span className="text-on-surface-variant font-medium">Menampilkan 1-3 dari 24 pegawai</span>
          <div className="flex gap-1.5">
            <button className="p-2 border border-outline-variant rounded bg-white hover:bg-surface transition-colors disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <button className="px-3 py-1.5 border border-primary bg-primary text-on-primary rounded font-bold">1</button>
            <button className="px-3 py-1.5 border border-outline-variant bg-white hover:bg-surface rounded font-medium transition-colors">2</button>
            <button className="px-3 py-1.5 border border-outline-variant bg-white hover:bg-surface rounded font-medium transition-colors">3</button>
            <button className="p-2 border border-outline-variant rounded bg-white hover:bg-surface transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
      </>
      )}
      
      {/* Decorative GARUDA background asset (Watermark style) */}
      <div className="fixed bottom-0 right-0 p-12 opacity-[0.03] pointer-events-none select-none z-0">
        <UserCircle size={400} />
      </div>
    </div>
  );
};

export default Pegawai;
