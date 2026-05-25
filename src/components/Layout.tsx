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
import { gasService, logout } from '../services/gasService';

interface SidebarProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const [villageName, setVillageName] = useState<string>('Desa Mandiri');

  useEffect(() => {
    const tenant = gasService.getTenant();
    if (tenant && tenant.villageName) {
      setVillageName(tenant.villageName);
    } else {
      gasService.getConfig()
        .then(data => {
          if (data && data.nama_desa) {
            setVillageName(data.nama_desa);
          }
        })
        .catch(err => console.error("Failed to fetch village name for sidebar", err));
    }
  }, []);

  const navigasiUtama = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pegawai', label: 'Pegawai', icon: Users },
    { id: 'sppd', label: 'SPPD', icon: FileText },
    { id: 'laporan', label: 'Laporan', icon: ClipboardList },
    { id: 'spj', label: 'SPJ', icon: CreditCard },
  ] as const;

  const pengaturanMenu = [
    { id: 'konfigurasi', label: 'Konfigurasi', icon: Settings },
    { id: 'about', label: 'About Us', icon: Info },
  ] as const;

  const renderItem = (item: { readonly id: string; readonly label: string; readonly icon: any }) => (
    <button
      key={item.id}
      id={`nav-${item.id}`}
      onClick={() => onPageChange(item.id as Page)}
      className={cn(
        "w-full flex items-center gap-4 px-5 py-3 transition-all text-left font-semibold text-sm",
        currentPage === item.id 
          ? "bg-[#0F3460] text-white border-l-[3px] border-l-white rounded-none" 
          : "text-[#B3C6E0] hover:text-white hover:bg-white/8 rounded-none"
      )}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </button>
  );

  return (
    <aside id="sidebar" className="fixed left-0 top-0 h-full w-64 bg-[#1B4F8A] flex flex-col z-50 border-r border-[#E2E8F0]/10">
      <div className="bg-[#0F3460] px-5 py-4 flex items-center gap-3 mb-6">
        <img 
          src="https://res.cloudinary.com/maswardi/image/upload/v1778757806/go_gsqgd7.png" 
          alt="Logo" 
          className="h-10 w-10 object-contain"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white truncate">{villageName}</h1>
          <p className="text-[10px] text-[#B3C6E0] uppercase tracking-widest font-black">GOdigital</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5">
        <div className="space-y-0.5">
          {navigasiUtama.map(renderItem)}
        </div>
        
        <div className="border-t border-white/12 my-4 mx-3"></div>
        
        <div className="space-y-0.5">
          {pengaturanMenu.map(renderItem)}
        </div>
      </nav>

      <div className="border-t border-white/12 my-4 mx-3"></div>

      <div className="px-4 mt-auto pb-6">
        <a 
          id="sidebar-help" 
          href="https://wa.me/6285150617732"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-4 px-4 py-2.5 text-[#B3C6E0] hover:text-white transition-all text-left text-sm font-semibold cursor-pointer"
        >
          <HelpCircle size={18} />
          <span>Bantuan</span>
        </a>
        <button 
          id="sidebar-logout" 
          onClick={logout}
          className="w-full flex items-center gap-4 px-4 py-2.5 text-[#B3C6E0] hover:text-white transition-all text-left text-sm font-semibold"
        >
          <LogOut size={18} />
          <span>Keluar</span>
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
    <header id="top-header" className="sticky top-0 z-40 flex justify-between items-center w-full px-8 py-4 bg-white border-b border-[#E2E8F0] shadow-sm">
      <div className="flex items-center gap-6">
        <h2 className="text-[18px] font-semibold text-[#1A202C] hidden md:block">{title}</h2>
        
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
