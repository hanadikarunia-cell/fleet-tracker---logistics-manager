import { useLanguage } from '../i18n';

export default function LanguageToggle({ dark = false }: { dark?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      id="language-toggle"
      className={`inline-flex items-center rounded-full p-0.5 border text-[10px] font-black shrink-0 ${
        dark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
      }`}
    >
      {(['en', 'id'] as const).map((lang) => (
        <button
          key={lang}
          id={`lang-btn-${lang}`}
          onClick={() => setLanguage(lang)}
          className={`px-2.5 py-1 rounded-full uppercase tracking-wide transition cursor-pointer ${
            language === lang
              ? 'bg-blue-600 text-white shadow-sm'
              : dark
              ? 'text-slate-400 hover:text-white'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
