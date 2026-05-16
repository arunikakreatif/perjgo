import React, { useEffect, useState } from 'react';
import { 
  BadgeCheck, 
  FileText, 
  ClipboardList, 
  CreditCard, 
  Zap, 
  PlusCircle, 
  UserPlus, 
  Settings2,
  ChevronRight,
  TrendingUp,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { cn } from '../lib/utils';
import { gasService } from '../services/gasService';

const StatCard = ({ title, value, subtitle, icon: Icon, progress }: any) => (
  <div className="bg-white border border-outline-variant p-6 rounded-xl flex flex-col justify-between hover:shadow-md transition-shadow group">
    <div className="flex justify-between items-start">
      <div className="p-2.5 bg-surface-container-high rounded-lg text-primary group-hover:scale-110 transition-transform">
        <Icon size={24} />
      </div>
      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{title}</span>
    </div>
    <div className="mt-6">
      <h3 className="text-4xl font-bold text-on-surface tnum">{value}</h3>
      <p className="text-xs text-secondary font-medium mt-1">{subtitle}</p>
    </div>
    <div className="mt-4 h-1.5 w-full bg-surface-container-low rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full bg-primary" 
      />
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      gasService.getDashboardStats(),
      gasService.getConfig()
    ]).then(([statsData, configData]) => {
      setStats(statsData);
      setConfig(configData);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch dashboard data", err);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-on-surface-variant font-medium">Memuat data dari server...</p>
      </div>
    );
  }

  const chartData = [
    { name: 'Jan', value: stats?.chart?.[0] || 0 },
    { name: 'Feb', value: stats?.chart?.[1] || 0 },
    { name: 'Mar', value: stats?.chart?.[2] || 0 },
    { name: 'Apr', value: stats?.chart?.[3] || 0 },
    { name: 'Mei', value: stats?.chart?.[4] || 0 },
    { name: 'Jun', value: stats?.chart?.[5] || 0 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">{config?.nama_desa || 'Memuat...'}</h2>
          <p className="text-on-surface-variant font-medium">Tahun Anggaran {config?.tahun_anggaran || '2026'}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold text-primary">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <p className="text-sm text-on-surface-variant font-medium">
            {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
          </p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Pegawai Aktif" value={stats?.pegawai || 0} subtitle="Total Pegawai" icon={BadgeCheck} progress={75} />
        <StatCard title="Surat Tugas" value={stats?.sppd || 0} subtitle="Total SPPD" icon={FileText} progress={50} />
        <StatCard title="Dokumen Laporan" value={stats?.laporan || 0} subtitle="Total Laporan" icon={ClipboardList} progress={65} />
        <StatCard title="Pertanggungjawaban" value={stats?.spj || 0} subtitle="Total SPJ" icon={CreditCard} progress={85} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Quick Actions & Banner */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white border border-outline-variant p-6 rounded-xl">
            <h4 className="text-lg font-bold text-on-surface mb-6 flex items-center gap-2">
              <Zap size={20} className="text-primary" />
              Quick Actions
            </h4>
            <div className="space-y-3">
              {[
                { label: 'Buat SPPD Baru', icon: PlusCircle },
                { label: 'Tambah Pegawai', icon: UserPlus },
                { label: 'Update Konfigurasi', icon: Settings2 },
              ].map((action) => (
                <button 
                  key={action.label}
                  className="w-full flex items-center justify-between p-4 border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <action.icon size={20} className="text-primary" />
                    <span className="text-sm font-bold text-on-surface">{action.label}</span>
                  </div>
                  <ChevronRight size={18} className="text-outline group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Activity & Charts */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
              <h4 className="font-bold text-on-surface">Aktivitas Terakhir</h4>
              <button className="text-xs font-bold text-primary hover:underline">Lihat Semua</button>
            </div>
            <div className="p-2">
              {stats?.recentActivities?.length > 0 ? (
                stats.recentActivities.map((activity: any) => (
                  <div key={activity.id} className="p-4 flex items-center gap-4 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer group">
                    <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                       {activity.type === 'SPPD' ? <BadgeCheck size={20} /> : activity.type === 'SPJ' ? <ClipboardList size={20} /> : <FileText size={20} />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-on-surface truncate">{activity.title}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{activity.subtitle}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                      activity.type === 'SPPD' ? "bg-green-100 text-green-800" : 
                      activity.type === 'SPJ' ? "bg-amber-100 text-amber-800" : 
                      "bg-blue-100 text-blue-800"
                    )}>
                      {activity.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-on-surface-variant text-sm font-medium">
                  Belum ada aktivitas terbaru.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-outline-variant p-6 rounded-xl">
            <div className="flex justify-between items-center mb-8">
              <h4 className="font-bold text-on-surface">Status Anggaran Perjalanan</h4>
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                <TrendingUp size={14} />
                <span>Meningkat 12%</span>
              </div>
            </div>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#5a413d', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ fill: '#eff4ff' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#570000' : '#800000'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
