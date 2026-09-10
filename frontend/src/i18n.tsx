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

  // Map view (the default landing tab) — its overlays, HUD panels, and export tools.
  'map.deskTitle': { en: 'TANGERANG LOGISTICS DESK', id: 'MEJA LOGISTIK TANGERANG' },
  'map.liveFeed': { en: 'LIVE FEED', id: 'UMPAN LANGSUNG' },
  'map.centralCoord': { en: 'Central Coord:', id: 'Koordinat Pusat:' },
  'map.drawingAlert': { en: 'Click anywhere on the map to define geofence center', id: 'Klik di mana saja pada peta untuk menentukan pusat geofence' },
  'map.offlineActive': { en: 'Offline Map Active (Simulated Caching - OSM Fallback)', id: 'Peta Offline Aktif (Simulasi Cache - Cadangan OSM)' },

  'map.weatherTitle': { en: 'Precipitation Radar & Hazard Layer', id: 'Radar Curah Hujan & Lapisan Bahaya' },
  'map.weatherSubtitle': { en: 'Live precipitation at each vehicle’s location (Open-Meteo)', id: 'Curah hujan langsung di lokasi setiap kendaraan (Open-Meteo)' },
  'map.dataAsOf': { en: 'Data as of', id: 'Data per' },
  'weather.clear': { en: 'Clear', id: 'Cerah' },
  'weather.cloudy': { en: 'Cloudy', id: 'Berawan' },
  'weather.fog': { en: 'Fog', id: 'Berkabut' },
  'weather.drizzle': { en: 'Drizzle', id: 'Gerimis' },
  'weather.rain': { en: 'Rain', id: 'Hujan' },
  'weather.thunderstorm': { en: 'Thunderstorm', id: 'Badai Petir' },
  'map.minimize': { en: 'Minimize', id: 'Perkecil' },
  'map.expand': { en: 'Expand', id: 'Perluas' },
  'map.close': { en: 'Close', id: 'Tutup' },
  'map.precipSpectrum': { en: 'Precipitation Spectrum', id: 'Spektrum Curah Hujan' },
  'map.light': { en: 'Light (<5mm/h)', id: 'Ringan (<5mm/jam)' },
  'map.moderate': { en: 'Moderate (5-25)', id: 'Sedang (5-25)' },
  'map.heavy': { en: 'Heavy (25-50)', id: 'Lebat (25-50)' },
  'map.torrential': { en: 'Torrential (>50)', id: 'Sangat Lebat (>50)' },
  'map.fleetRouteHazards': { en: 'Fleet Route Hazards', id: 'Bahaya Rute Armada' },
  'map.vehiclesUnderRain': { en: 'Vehicles Under Rain', id: 'Kendaraan Terkena Hujan' },
  'map.allRoutesClear': { en: 'All Routes Clear', id: 'Semua Rute Aman' },
  'map.noHazards': { en: 'No rain currently detected at any vehicle location.', id: 'Tidak ada hujan yang terdeteksi di lokasi kendaraan mana pun saat ini.' },
  'map.currentRain': { en: 'Current rain:', id: 'Hujan saat ini:' },
  'map.aquaplaningPrefix': { en: 'Aquaplaning Hazard: Exceeds', id: 'Bahaya Aquaplaning: Melebihi' },
  'map.aquaplaningSuffix': { en: 'km/h limit', id: 'km/jam batas' },
  'map.focus': { en: 'Focus', id: 'Fokus' },

  'map.measureTool': { en: 'Measure Distance Tool', id: 'Alat Ukur Jarak' },
  'map.measureHint': { en: 'Click points on map to measure linear path length', id: 'Klik titik pada peta untuk mengukur panjang jalur' },
  'map.totalDistance': { en: 'Total Path Distance', id: 'Total Jarak Jalur' },
  'map.waypoints': { en: 'Waypoints', id: 'Titik Jalur' },
  'map.point': { en: 'Point', id: 'Titik' },
  'map.start': { en: 'Start', id: 'Mulai' },
  'map.undo': { en: 'Undo', id: 'Urungkan' },
  'map.clear': { en: 'Clear', id: 'Hapus' },
  'map.measuringActive': { en: 'Measuring Active', id: 'Sedang Mengukur' },
  'map.addPoints': { en: 'Add Points', id: 'Tambah Titik' },

  'map.zoomIn': { en: 'Zoom In', id: 'Perbesar' },
  'map.zoomOut': { en: 'Zoom Out', id: 'Perkecil' },
  'map.measureActiveTooltip': { en: 'Measuring Active - Click map to add points', id: 'Sedang Mengukur - Klik peta untuk menambah titik' },
  'map.mapLayers': { en: 'Map Layers', id: 'Lapisan Peta' },
  'map.streetMap': { en: 'Street Map', id: 'Peta Jalan' },
  'map.satellite': { en: 'Satellite', id: 'Satelit' },
  'map.zoomFitTooltip': { en: 'Zoom To Fit All Assets & Geofences (Right click or click for menu)', id: 'Perbesar untuk Menampilkan Semua Aset & Geofence (Klik kanan untuk menu)' },
  'map.zoomFitOptions': { en: 'Zoom To Fit Options', id: 'Opsi Perbesar Tampilan' },
  'map.fitAll': { en: 'Fit All Assets & Geofences', id: 'Tampilkan Semua Aset & Geofence' },
  'map.fitVehicles': { en: 'Fit Fleet Vehicles Only', id: 'Tampilkan Kendaraan Saja' },
  'map.fitGeofences': { en: 'Fit Geofence Zones', id: 'Tampilkan Zona Geofence' },
  'map.focusSelected': { en: 'Focus Selected Vehicle', id: 'Fokus ke Kendaraan Terpilih' },
  'map.quickPresets': { en: 'Quick Region Presets', id: 'Preset Wilayah Cepat' },
  'map.presetTangerang': { en: 'Tangerang City Center', id: 'Pusat Kota Tangerang' },
  'map.presetAirport': { en: 'Soekarno-Hatta Airport', id: 'Bandara Soekarno-Hatta' },
  'map.presetBsd': { en: 'BSD City & Serpong', id: 'BSD City & Serpong' },
  'map.presetJabodetabek': { en: 'Jabodetabek Overview', id: 'Ikhtisar Jabodetabek' },
  'map.showWeather': { en: 'Show Real-Time Weather Radar & Precipitation Density', id: 'Tampilkan Radar Cuaca & Kepadatan Curah Hujan' },
  'map.hideWeather': { en: 'Hide Real-Time Weather Radar & Precipitation Density', id: 'Sembunyikan Radar Cuaca & Kepadatan Curah Hujan' },
  'map.exportStateTooltip': { en: 'Export Map State Parameters', id: 'Ekspor Parameter Status Peta' },
  'map.exportGeofencesTooltip': { en: 'Export Geofences (GeoJSON / CSV)', id: 'Ekspor Geofence (GeoJSON / CSV)' },
  'map.disableClustering': { en: 'Disable Marker Clustering', id: 'Nonaktifkan Pengelompokan Marker' },
  'map.enableClustering': { en: 'Enable Marker Clustering', id: 'Aktifkan Pengelompokan Marker' },
  'map.simulateOnline': { en: 'Simulate Online Map', id: 'Simulasikan Peta Online' },
  'map.simulateOffline': { en: 'Simulate Offline Map', id: 'Simulasikan Peta Offline' },
  'map.disableAutoUpdates': { en: 'Disable Automatic Position Updates', id: 'Nonaktifkan Pembaruan Posisi Otomatis' },
  'map.enableAutoUpdates': { en: 'Enable Automatic Position Updates', id: 'Aktifkan Pembaruan Posisi Otomatis' },

  'map.exportStateTitle': { en: 'Map Viewport & System State Export', id: 'Ekspor Tampilan Peta & Status Sistem' },
  'map.exportStateDesc': { en: 'Capture current zoom, bounds, layer config, and telemetry coordinates', id: 'Rekam zoom, batas, konfigurasi lapisan, dan koordinat telemetri saat ini' },
  'map.copiedClipboard': { en: 'Copied to Clipboard!', id: 'Tersalin ke Clipboard!' },
  'map.copyJson': { en: 'Copy JSON', id: 'Salin JSON' },
  'map.downloadStateJson': { en: 'Download State JSON', id: 'Unduh JSON Status' },

  'map.geofenceExportTitle': { en: 'Geofence Data Export Studio', id: 'Studio Ekspor Data Geofence' },
  'map.geofenceExportDesc': { en: 'Export active geofences in standard GeoJSON (GIS) or CSV spreadsheet formats', id: 'Ekspor geofence aktif dalam format GeoJSON (GIS) atau CSV' },
  'map.configuredGeofences': { en: 'Configured Geofences', id: 'Geofence yang Dikonfigurasi' },
  'map.activeZone': { en: 'Active Zone', id: 'Zona Aktif' },
  'map.inactive': { en: 'Inactive', id: 'Tidak Aktif' },
  'map.copied': { en: 'Copied!', id: 'Tersalin!' },
  'map.copyGeoJson': { en: 'Copy GeoJSON', id: 'Salin GeoJSON' },
  'map.downloadCsv': { en: 'Download CSV', id: 'Unduh CSV' },
  'map.downloadGeoJson': { en: 'Download GeoJSON', id: 'Unduh GeoJSON' },
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
