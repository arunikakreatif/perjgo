export interface Employee {
  id: string;
  name: string;
  nik: string;
  niap?: string;
  position: string;
  pangkat?: string;
  golongan?: string;
  address: string;
}

export interface SPPD {
  id: string;
  number: string;
  purpose: string;
  destination: string;
  dateStart: string;
  dateEnd: string;
  transport: string;
  budgetCode: string;
  basis: string;
  peopleCount: number;
  laporan1?: string;
  laporan2?: string;
  laporan3?: string;
  caption?: string;
  fotoUrl?: string;
  fotoId?: string;
  uangHarian?: number;
  uangBBM?: number;
  tglBayar?: string;
  employeeIds: string[]; // Up to 5 IDs
  employeeNames?: string[]; // For display
}

export interface TemplateConfig {
  type: 'SPD' | 'Laporan' | 'SPJ';
  count: number;
  templateId: string;
}

export type Page = 'dashboard' | 'pegawai' | 'sppd' | 'laporan' | 'spj' | 'konfigurasi' | 'about';
