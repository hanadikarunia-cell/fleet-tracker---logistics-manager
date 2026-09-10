import { useState } from 'react';
import { Feedback, FeedbackStatus } from '../types';
import { MessageSquare, Trash2, ImageIcon, X } from 'lucide-react';

interface FeedbackViewProps {
  feedback: Feedback[];
  onUpdateStatus: (id: string, status: FeedbackStatus) => void;
  onDelete: (id: string) => void;
}

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  reviewed: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function FeedbackView({ feedback, onUpdateStatus, onDelete }: FeedbackViewProps) {
  const [filter, setFilter] = useState<'all' | FeedbackStatus>('all');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const visible = filter === 'all' ? feedback : feedback.filter((f) => f.status === filter);
  const newCount = feedback.filter((f) => f.status === 'new').length;

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">User Feedback</h4>
              <p className="text-[10px] text-slate-400 font-semibold">
                {newCount > 0 ? `${newCount} new submission${newCount === 1 ? '' : 's'}` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {(['all', 'new', 'reviewed', 'resolved'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded-lg transition ${
                  filter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No feedback here.</p>
        ) : (
          <div className="space-y-3">
            {visible.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3">
                {item.imageUrl && (
                  <button onClick={() => setLightboxUrl(item.imageUrl)} className="shrink-0">
                    <img src={item.imageUrl} alt="Feedback attachment" className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
                  </button>
                )}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-800">{item.userName || 'Unknown user'}</span>
                      <span className="text-slate-400">{new Date(item.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${STATUS_STYLES[item.status]}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{item.message}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <select
                      value={item.status}
                      onChange={(e) => onUpdateStatus(item.id, e.target.value as FeedbackStatus)}
                      className="bg-white border border-slate-200 rounded-lg p-1 text-[9px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <button
                      onClick={() => onDelete(item.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                      title="Delete feedback"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {!item.imageUrl && <ImageIcon className="w-3.5 h-3.5 text-slate-300 ml-auto" title="No attachment" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-slate-950/90 flex items-center justify-center z-50 p-6 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <button className="absolute top-5 right-5 text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <img src={lightboxUrl} alt="Feedback attachment full size" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
