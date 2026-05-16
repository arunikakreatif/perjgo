import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ClipboardList, 
  CreditCard, 
  Settings, 
  HelpCircle, 
  LogOut,
  Bell,
  UserCircle,
  Search,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Page } from '../types';
import { gasService } from '../services/gasService';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const [villageName, setVillageName] = useState<string>('Desa Mandiri');

  useEffect(() => {
    gasService.getConfig()
      .then(data => {
        if (data && data.nama_desa) {
          setVillageName(data.nama_desa);
        }
      })
      .catch(err => console.error("Failed to fetch village name for sidebar", err));
  }, []);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pegawai', label: 'Pegawai', icon: Users },
    { id: 'sppd', label: 'SPPD', icon: FileText },
    { id: 'laporan', label: 'Laporan', icon: ClipboardList },
    { id: 'spj', label: 'SPJ', icon: CreditCard },
    { id: 'konfigurasi', label: 'Konfigurasi', icon: Settings },
    { id: 'about', label: 'About Us', icon: Info },
  ] as const;

  return (
    <aside id="sidebar" className="fixed left-0 top-0 h-full w-64 bg-tertiary flex flex-col py-8 z-50">
      <div className="px-6 mb-8 flex items-center gap-3">
        <img 
          src="https://res.cloudinary.com/maswardi/image/upload/v1778757806/go_gsqgd7.png" 
          alt="Logo" 
          className="h-12 w-12 object-contain"
          referrerPolicy="no-referrer"
        />
        <div>
          <h1 className="text-xl font-bold text-on-tertiary">{villageName}</h1>
          <p className="text-[10px] text-on-tertiary/70 uppercase tracking-widest font-black">GOdigital</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => onPageChange(item.id as Page)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-2.5 rounded-lg transition-all text-left",
              currentPage === item.id 
                ? "bg-primary text-on-primary" 
                : "text-on-tertiary/70 hover:text-on-tertiary hover:bg-white/10"
            )}
          >
            <item.icon size={20} />
            <span className="text-sm font-semibold">{item.label}</span>
          </button>
        ))}

        <div className="mt-8 pt-8 border-t border-white/10">
        </div>
      </nav>

      <div className="px-4 mt-auto">
        <button id="sidebar-help" className="w-full flex items-center gap-4 px-4 py-2.5 text-on-tertiary/70 hover:text-on-tertiary transition-all text-left">
          <HelpCircle size={20} />
          <span className="text-sm font-semibold">Bantuan</span>
        </button>
        <button id="sidebar-logout" className="w-full flex items-center gap-4 px-4 py-2.5 text-on-tertiary/70 hover:text-on-tertiary transition-all text-left">
          <LogOut size={20} />
          <span className="text-sm font-semibold">Keluar</span>
        </button>
      </div>
    </aside>
  );
};

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header id="top-header" className="sticky top-0 z-40 flex justify-between items-center w-full px-8 py-4 bg-surface border-b border-outline-variant shadow-sm backdrop-blur-sm bg-surface/80">
      <div className="flex items-center gap-6">
        <h2 className="text-xl font-bold text-primary hidden md:block">{title}</h2>
        
        <div className="relative hidden lg:block ml-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
          <input 
            type="text" 
            placeholder="Cari..." 
            className="pl-10 pr-4 py-1.5 bg-surface-container-low border border-outline-variant rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-primary w-64 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button id="noti-btn" className="p-2 hover:bg-surface-container-low rounded-full transition-colors text-primary relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-surface" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-on-surface leading-none">Admin Desa</p>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">Administrator</p>
          </div>
          <UserCircle size={32} className="text-primary" />
        </div>
      </div>
    </header>
  );
};

export const Layout: React.FC<{ 
  currentPage: Page; 
  onPageChange: (page: Page) => void;
  children: React.ReactNode;
}> = ({ currentPage, onPageChange, children }) => {
  const pageTitles: Record<Page, string> = {
    dashboard: 'Dashboard Utama',
    pegawai: 'Manajemen Pegawai',
    sppd: 'Manajemen SPPD',
    laporan: 'Laporan Perjalanan',
    spj: 'Pertanggungjawaban',
    konfigurasi: 'Konfigurasi Sistem',
    about: 'Tentang Kami',
  };

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar currentPage={currentPage} onPageChange={onPageChange} />
      <main className="pl-64 flex flex-col min-h-screen">
        <Header title={pageTitles[currentPage]} />
        <div className="p-8 flex-1 max-w-[1440px] mx-auto w-full">
          {children}
        </div>
        <footer className="mt-auto p-6 border-t border-outline-variant bg-white">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-on-surface-variant">© 2026 perjadinGO. Seluruh Hak Cipta Dilindungi.</p>
            <div className="flex gap-8">
              <button className="text-xs font-semibold text-on-surface-variant hover:text-primary">Syarat & Ketentuan</button>
              <button className="text-xs font-semibold text-on-surface-variant hover:text-primary">Kebijakan Privasi</button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};
