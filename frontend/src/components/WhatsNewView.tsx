import { useState } from 'react';
import { ChangelogEntry, ChangelogBumpType } from '../types';
import { Sparkles, Plus, Edit, Trash2, Rocket } from 'lucide-react';
import { useLanguage } from '../i18n';

interface WhatsNewViewProps {
  entries: ChangelogEntry[];
  isAdmin: boolean;
  onPublish: (bumpType: ChangelogBumpType, title: string, changes: string[]) => Promise<void>;
  onUpdate: (id: string, updated: { title: string; changes: string[] }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const BUMP_STYLES: Record<ChangelogBumpType, string> = {
  major: 'bg-rose-100 text-rose-800 border-rose-200',
  minor: 'bg-blue-100 text-blue-800 border-blue-200',
  patch: 'bg-slate-100 text-slate-700 border-slate-200',
};

function parseChanges(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function WhatsNewView({ entries, isAdmin, onPublish, onUpdate, onDelete }: WhatsNewViewProps) {
  const { t } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [bumpType, setBumpType] = useState<ChangelogBumpType>('minor');
  const [title, setTitle] = useState('');
  const [changesText, setChangesText] = useState('');
  const [publishing, setPublishing] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editChangesText, setEditChangesText] = useState('');

  const currentVersion = entries[0]?.version;

  const bumpLabel = (b: ChangelogBumpType) =>
    b === 'major' ? t('whatsnew.majorBadge') : b === 'minor' ? t('whatsnew.minorBadge') : t('whatsnew.patchBadge');

  const resetForm = () => {
    setBumpType('minor');
    setTitle('');
    setChangesText('');
    setShowForm(false);
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert(t('whatsnew.titleRequiredAlert'));
      return;
    }
    const changes = parseChanges(changesText);
    if (changes.length === 0) {
      alert(t('whatsnew.changesRequiredAlert'));
      return;
    }
    setPublishing(true);
    try {
      await onPublish(bumpType, title.trim(), changes);
      resetForm();
    } finally {
      setPublishing(false);
    }
  };

  const startEdit = (entry: ChangelogEntry) => {
    setEditingId(entry.id);
    setEditTitle(entry.title);
    setEditChangesText(entry.changes.join('\n'));
  };

  const handleSaveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      alert(t('whatsnew.titleRequiredAlert'));
      return;
    }
    const changes = parseChanges(editChangesText);
    if (changes.length === 0) {
      alert(t('whatsnew.changesRequiredAlert'));
      return;
    }
    await onUpdate(id, { title: editTitle.trim(), changes });
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-3 items-center">
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">{t('whatsnew.currentVersion')}</p>
            <h4 className="font-extrabold text-lg text-blue-900 font-mono">v{currentVersion ?? '1.0.0'}</h4>
          </div>
        </div>
        {isAdmin && (
          <button
            id="btn-add-changelog-toggle"
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {t('whatsnew.publishUpdate')}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md space-y-4 animate-fade-in">
          <div className="flex gap-3 text-slate-800">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl h-fit shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">{t('whatsnew.publishTitle')}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{t('whatsnew.publishDesc')}</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('whatsnew.bumpType')}</label>
              <select
                id="form-changelog-bump"
                value={bumpType}
                onChange={(e) => setBumpType(e.target.value as ChangelogBumpType)}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="major">{t('whatsnew.bumpMajor')}</option>
                <option value="minor">{t('whatsnew.bumpMinor')}</option>
                <option value="patch">{t('whatsnew.bumpPatch')}</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('whatsnew.titleLabel')}</label>
              <input
                id="form-changelog-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('whatsnew.titlePlaceholder')}
                className="p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="font-semibold text-slate-600">{t('whatsnew.changesLabel')}</label>
              <textarea
                id="form-changelog-changes"
                rows={4}
                value={changesText}
                onChange={(e) => setChangesText(e.target.value)}
                placeholder={t('whatsnew.changesPlaceholder')}
                className="p-2.5 border border-slate-200 rounded-lg text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 text-xs pt-2">
            <button
              id="btn-changelog-cancel"
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
            >
              {t('common.cancel')}
            </button>
            <button
              id="btn-changelog-publish"
              type="button"
              disabled={publishing}
              onClick={handlePublish}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg transition"
            >
              {publishing ? t('whatsnew.publishing') : t('whatsnew.publish')}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">{t('whatsnew.empty')}</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm space-y-2.5">
              {editingId === entry.id ? (
                <div className="space-y-2.5 text-xs">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <textarea
                    rows={4}
                    value={editChangesText}
                    onChange={(e) => setEditChangesText(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={() => handleSaveEdit(entry.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition"
                    >
                      {t('whatsnew.saveChanges')}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${BUMP_STYLES[entry.bumpType]}`}>
                        {bumpLabel(entry.bumpType)}
                      </span>
                      <span className="font-mono font-extrabold text-sm text-slate-800">v{entry.version}</span>
                      <span className="font-bold text-sm text-slate-800">{entry.title}</span>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(entry)}
                          className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-blue-600 rounded-lg transition cursor-pointer"
                          title={t('whatsnew.editEntry')}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(entry.id)}
                          className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition cursor-pointer"
                          title={t('whatsnew.deleteEntry')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    {new Date(entry.createdAt).toLocaleString()}
                    {entry.createdBy ? ` · ${t('whatsnew.publishedBy')} ${entry.createdBy}` : ''}
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                    {entry.changes.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
