import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Rocket, Shield, Zap, Heart } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/5 rounded-3xl p-4 md:p-8 text-center flex flex-col items-center"
      >
        <div className="flex justify-center -mb-8 md:-mb-12">
           <div>
              <img 
                src="https://res.cloudinary.com/maswardi/image/upload/v1778637104/logo_simpati_5_a41xyp.png" 
                alt="SIMPATI Logo" 
                className="h-48 md:h-64 lg:h-72 object-contain"
                referrerPolicy="no-referrer"
              />
           </div>
        </div>
        <p className="text-base md:text-lg text-on-surface-variant max-w-2xl mx-auto leading-relaxed relative z-10">
          Solusi terintegrasi untuk manajemen perjalanan dinas pemerintah desa yang modern, 
          efisien, dan akuntabel. Dirancang khusus untuk mempermudah administrasi desa di era digital.
        </p>
      </motion.div>

      {/* Modern Grid - Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-2xl border border-outline-variant hover:shadow-lg transition-all space-y-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Zap size={24} />
          </div>
          <h4 className="text-xl font-bold text-primary">Efisien & Cepat</h4>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Otomasi pembuatan dokumen SPPD, Laporan, dan SPJ hanya dengan beberapa klik. Menghemat waktu hingga 80% dibanding cara manual.
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-outline-variant hover:shadow-lg transition-all space-y-4">
          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
            <Shield size={24} />
          </div>
          <h4 className="text-xl font-bold text-secondary">Akurat & Aman</h4>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Validasi data otomatis memastikan tidak ada kesalahan input. Data tersimpan aman di infrastruktur cloud yang handal.
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-outline-variant hover:shadow-lg transition-all space-y-4">
          <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
            <Rocket size={24} />
          </div>
          <h4 className="text-xl font-bold text-tertiary">Siap Pakai</h4>
          <p className="text-on-surface-variant text-sm leading-relaxed">
            Disesuaikan dengan format standar administrasi desa. Instalasi mudah dan antarmuka yang sangat ramah pengguna.
          </p>
        </div>
      </div>

      {/* Developer Section */}
      <div className="bg-white border border-outline-variant rounded-3xl overflow-hidden shadow-sm">
        <div className="md:flex">
          <div className="md:w-1/3 bg-on-surface p-12 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="p-2 w-32 h-32 mx-auto flex items-center justify-center">
                <img 
                  src="https://res.cloudinary.com/maswardi/image/upload/v1775745397/akm_yq9a7m.png" 
                  alt="Arunika Kreatif Media" 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-white font-bold text-lg uppercase tracking-widest">Innovative Solutions</p>
            </div>
          </div>
          <div className="md:w-2/3 p-12 space-y-6">
            <div className="space-y-2">
              <h4 className="text-xs font-black text-on-surface-variant uppercase tracking-[0.2em]">Pengembang</h4>
              <h2 className="text-3xl font-black text-primary">Arunika Kreatif Media</h2>
            </div>
            <p className="text-on-surface-variant leading-relaxed">
              Arunika Kreatif Media adalah agensi teknologi dan kreatif yang berfokus pada digitalisasi sektor publik dan UMKM. 
              Kami percaya bahwa teknologi yang tepat guna dapat memberikan dampak sosial yang besar bagi transformasi masyarakat desa.
            </p>
            <div className="flex flex-wrap gap-4">
               <div className="flex items-center gap-2 px-4 py-2 bg-surface text-on-surface rounded-full border border-outline-variant text-sm font-bold">
                 <CheckCircle2 size={16} className="text-success" />
                 Software Developer
               </div>
               <div className="flex items-center gap-2 px-4 py-2 bg-surface text-on-surface rounded-full border border-outline-variant text-sm font-bold">
                 <CheckCircle2 size={16} className="text-success" />
                 IT Consultant
               </div>
               <div className="flex items-center gap-2 px-4 py-2 bg-surface text-on-surface rounded-full border border-outline-variant text-sm font-bold">
                 <CheckCircle2 size={16} className="text-success" />
                 Digital Transformation
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advantages & Technical Excellence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h4 className="text-2xl font-black text-on-surface uppercase tracking-tight">Kelebihan Platform</h4>
          <ul className="space-y-4">
            {[
              "Arsip terdigitalisasi dan mudah dicari di kemudian hari.",
              "Koneksi langsung dengan Google Drive untuk penyimpanan dokumen.",
              "Generate otomatis PDF SPPD, Laporan, dan SPJ siap cetak.",
              "Optimasi tata letak (Layout) dokumen otomatis untuk laporan multi-person.",
              "Manajemen data pegawai yang komprehensif (NIK, NIAP, Jabatan, Pangkat)."
            ].map((item, i) => (
              <li key={i} className="flex gap-4 items-start">
                <div className="mt-1 bg-primary text-on-primary p-0.5 rounded-full">
                  <CheckCircle2 size={14} />
                </div>
                <span className="text-on-surface-variant font-medium">{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-primary/5 p-8 rounded-3xl flex flex-col justify-center border border-primary/10 space-y-4">
          <h5 className="font-bold text-primary tnum uppercase tracking-widest text-xs">Update V1.2.5 - Dynamic Placeholders</h5>
          <p className="text-on-surface-variant text-sm italic font-medium">
            "Sistem kini mendukung placeholder identitas wilayah otomatis: {"{{KAB}}"}, {"{{KEC}}"}, {"{{DESA}}"}, serta optimasi penempatan foto dokumentasi {"{{FOTO_Upload}}"} (Behind Text) untuk laporan perjalanan."
          </p>
          <div className="w-12 h-1 bg-primary rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default About;
