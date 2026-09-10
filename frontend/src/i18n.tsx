import { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'id';

// Scope: this covers the app's persistent chrome — login, navigation, per-tab headers,
// the sidebar utility panel, and the feedback flow — i.e. everything visible regardless
// of which tab is open. Deep content inside individual tabs (dashboard analytics forms,
// inventory tables, vehicle/device management forms, etc.) stays English-only; translating
// all of that across 60+ components is a separate, much larger effort.
const translations = {
  'brand.name': { en: 'FLEET TRACKER', id: 'FLEET TRACKER' },
  'brand.subtitle': { en: 'Tangerang Logistics', id: 'Logistik Tangerang' },

  'login.title': { en: 'Sign in', id: 'Masuk' },
  'login.subtitle': { en: "Ask an administrator for access if you don't have an account.", id: 'Hubungi administrator untuk mendapatkan akses jika Anda belum punya akun.' },
  'login.email': { en: 'Email', id: 'Email' },
  'login.password': { en: 'Password', id: 'Kata Sandi' },
  'login.submit': { en: 'Sign In', id: 'Masuk' },
  'login.submitting': { en: 'Signing in…', id: 'Sedang masuk…' },
  'login.notConfigured': { en: 'Supabase is not configured (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).', id: 'Supabase belum dikonfigurasi (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY tidak ditemukan).' },

  'nav.map': { en: 'Live Tracking Map', id: 'Peta Pelacakan Langsung' },
  'nav.dashboard': { en: 'Operational Dashboard', id: 'Dasbor Operasional' },
  'nav.telemetry': { en: 'Vehicle Telemetry History', id: 'Riwayat Telemetri Kendaraan' },
  'nav.eta': { en: 'Predictive Arrival (ETA)', id: 'Prediksi Kedatangan (ETA)' },
  'nav.efficiency': { en: 'Geofence Efficiency Alerts', id: 'Peringatan Efisiensi Geofence' },
  'nav.inventory': { en: 'Logistics Inventory', id: 'Inventaris Logistik' },
  'nav.drivers': { en: 'Driver Performance', id: 'Performa Pengemudi' },
  'nav.vehicles': { en: 'Fleet Directory', id: 'Direktori Armada' },
  'nav.devices': { en: 'GPS Hardware Register', id: 'Registrasi Perangkat GPS' },
  'nav.users': { en: 'User & Role Center', id: 'Pusat Pengguna & Peran' },
  'nav.feedback': { en: 'User Feedback', id: 'Masukan Pengguna' },

  'header.map.title': { en: 'Live GPS Navigation Tracking', id: 'Pelacakan Navigasi GPS Langsung' },
  'header.map.subtitle': { en: 'Track physical assets en-route across Greater Jakarta (Jabodetabek).', id: 'Lacak aset yang sedang dalam perjalanan di seluruh wilayah Jabodetabek.' },
  'header.dashboard.title': { en: 'Operational Fleet Management Scoreboard', id: 'Papan Skor Manajemen Armada Operasional' },
  'header.dashboard.subtitle': { en: 'Aggregated diagnostic logs, low battery alarms, and geofence cross triggers.', id: 'Log diagnostik gabungan, peringatan baterai lemah, dan pemicu lintas geofence.' },
  'header.telemetry.title': { en: 'Vehicle CAN-Bus Telemetry & Route History', id: 'Telemetri CAN-Bus Kendaraan & Riwayat Rute' },
  'header.telemetry.subtitle': { en: 'Inspect CAN-bus diagnostic logs, speed curves, TPMS pressure history, and telemetry playbacks.', id: 'Periksa log diagnostik CAN-bus, kurva kecepatan, riwayat tekanan TPMS, dan pemutaran ulang telemetri.' },
  'header.eta.title': { en: 'AI Predictive Arrival Estimator (ETA Engine)', id: 'Estimator Kedatangan Prediktif AI (Mesin ETA)' },
  'header.eta.subtitle': { en: 'Predict exact arrival times using highway traffic index, weather friction, and driver rest mandates.', id: 'Prediksi waktu kedatangan menggunakan indeks lalu lintas tol, hambatan cuaca, dan aturan istirahat pengemudi.' },
  'header.efficiency.title': { en: 'Geofence Dwell Time & Route Efficiency Alerts', id: 'Peringatan Waktu Tinggal Geofence & Efisiensi Rute' },
  'header.efficiency.subtitle': { en: 'Audit geofence dwell times, tardy arrivals, curfew breaches, and demurrage cost risks.', id: 'Audit waktu tinggal geofence, keterlambatan kedatangan, pelanggaran jam malam, dan risiko biaya demurrage.' },
  'header.inventory.title': { en: 'Seamless Logistics Inventory System', id: 'Sistem Inventaris Logistik Terpadu' },
  'header.inventory.subtitle': { en: 'Log cargo manifests and balance payload capacities connected to tracking telemetry.', id: 'Catat manifes kargo dan seimbangkan kapasitas muatan yang terhubung ke telemetri pelacakan.' },
  'header.drivers.title': { en: 'Driver Telematics Scorecard', id: 'Kartu Skor Telematika Pengemudi' },
  'header.drivers.subtitle': { en: 'Evaluate operator safety quotients, harsh braking limits, and idling times.', id: 'Evaluasi skor keselamatan operator, batas pengereman mendadak, dan waktu idle.' },
  'header.vehicles.title': { en: 'Vehicle Directory', id: 'Direktori Kendaraan' },
  'header.vehicles.subtitle': { en: 'Add, edit, or retire transport vehicle assets from active dispatch cycles.', id: 'Tambah, ubah, atau nonaktifkan aset kendaraan dari siklus pengiriman aktif.' },
  'header.devices.title': { en: 'GPS Telemetry Register', id: 'Registrasi Telemetri GPS' },
  'header.devices.subtitle': { en: 'Bind hardware IMEI transceivers to track precise geographic telemetry.', id: 'Kaitkan perangkat IMEI untuk melacak telemetri geografis secara presisi.' },
  'header.users.title': { en: 'User Role & Permissions Center', id: 'Pusat Peran & Izin Pengguna' },
  'header.users.subtitle': { en: 'Manage system operator accounts, operational roles, and security policies.', id: 'Kelola akun operator sistem, peran operasional, dan kebijakan keamanan.' },
  'header.feedback.title': { en: 'User Feedback Inbox', id: 'Kotak Masuk Masukan Pengguna' },
  'header.feedback.subtitle': { en: 'Bug reports and suggestions submitted from inside the app, with screenshots.', id: 'Laporan bug dan saran yang dikirim dari dalam aplikasi, lengkap dengan tangkapan layar.' },

  'sidebar.pingRate': { en: 'Telemetry Ping Rate', id: 'Frekuensi Ping Telemetri' },
  'sidebar.geofencesGuard': { en: 'Geofences Guard:', id: 'Penjaga Geofence:' },
  'sidebar.active': { en: 'Active', id: 'Aktif' },
  'sidebar.alertAudio': { en: 'Alert Audio Synth:', id: 'Suara Peringatan:' },
  'sidebar.on': { en: 'ON', id: 'AKTIF' },
  'sidebar.off': { en: 'OFF', id: 'MATI' },
  'sidebar.signOut': { en: 'Sign out', id: 'Keluar' },

  'feedback.sendButton': { en: 'Send Feedback', id: 'Kirim Masukan' },
  'feedback.modalTitle': { en: 'Send Feedback', id: 'Kirim Masukan' },
  'feedback.modalSubtitle': { en: "Found a bug or have a suggestion? Attach a screenshot if it helps.", id: 'Menemukan bug atau punya saran? Lampirkan tangkapan layar jika perlu.' },
  'feedback.messageLabel': { en: "What's going on?", id: 'Apa yang terjadi?' },
  'feedback.messagePlaceholder': { en: 'Describe the issue or idea...', id: 'Jelaskan masalah atau ide Anda...' },
  'feedback.imageLabel': { en: 'Screenshot (optional)', id: 'Tangkapan layar (opsional)' },
  'feedback.attachImage': { en: 'Attach image', id: 'Lampirkan gambar' },
  'feedback.pasteHint': { en: 'or paste an image (Ctrl+V)', id: 'atau tempel gambar (Ctrl+V)' },
  'feedback.pasted': { en: 'Pasted!', id: 'Tertempel!' },
  'feedback.cancel': { en: 'Cancel', id: 'Batal' },
  'feedback.send': { en: 'Send', id: 'Kirim' },
  'feedback.sending': { en: 'Sending…', id: 'Mengirim…' },
  'feedback.thanks': { en: 'Thanks — feedback sent.', id: 'Terima kasih — masukan terkirim.' },
  'feedback.errorEmpty': { en: 'Please describe your feedback first.', id: 'Mohon jelaskan masukan Anda terlebih dahulu.' },
  'feedback.inboxTitle': { en: 'User Feedback', id: 'Masukan Pengguna' },
  'feedback.allCaughtUp': { en: 'All caught up', id: 'Semua sudah ditinjau' },
  'feedback.newSubmissions': { en: 'new submission', id: 'masukan baru' },
  'feedback.filterAll': { en: 'all', id: 'semua' },
  'feedback.filterNew': { en: 'new', id: 'baru' },
  'feedback.filterReviewed': { en: 'reviewed', id: 'ditinjau' },
  'feedback.filterResolved': { en: 'resolved', id: 'selesai' },
  'feedback.empty': { en: 'No feedback here.', id: 'Belum ada masukan di sini.' },
} as const;

export type TranslationKey = keyof typeof translations;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('fleet_language');
    return saved === 'id' || saved === 'en' ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('fleet_language', lang);
  };

  const t = (key: TranslationKey): string => translations[key]?.[language] ?? key;

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
  return ctx;
}
