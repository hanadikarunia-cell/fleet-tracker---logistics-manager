import { useRef, useState } from 'react';
import { MessageSquarePlus, ImagePlus, X, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

export default function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setMessage('');
    setImage(null);
    setImagePreview(null);
    setError(null);
    setSuccess(false);
  };

  const close = () => {
    setIsOpen(false);
    reset();
  };

  const handleFileChange = (file: File | null) => {
    setImage(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('Please describe your feedback first.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.feedback.submit(message.trim(), image ?? undefined);
      setSuccess(true);
      setTimeout(close, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        id="btn-open-feedback"
        onClick={() => setIsOpen(true)}
        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition border border-slate-700 flex items-center justify-center gap-2"
      >
        <MessageSquarePlus className="w-3.5 h-3.5" /> Send Feedback
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-scale-up border border-slate-100">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3 text-slate-800">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl h-fit">
                  <MessageSquarePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Send Feedback</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Found a bug or have a suggestion? Attach a screenshot if it helps.</p>
                </div>
              </div>
              <button onClick={close} className="text-slate-400 hover:text-slate-600 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {success ? (
              <div className="flex items-center gap-2 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-semibold">
                <CheckCircle2 className="w-5 h-5" /> Thanks — feedback sent.
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-600">What's going on?</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Describe the issue or idea..."
                    className="p-2.5 border border-slate-200 rounded-lg text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-slate-600">Screenshot (optional)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                  />
                  {imagePreview ? (
                    <div className="relative w-fit">
                      <img src={imagePreview} alt="Preview" className="max-h-32 rounded-lg border border-slate-200" />
                      <button
                        onClick={() => handleFileChange(null)}
                        className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-1.5 py-3 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 hover:border-blue-300 hover:text-blue-500 transition"
                    >
                      <ImagePlus className="w-4 h-4" /> Attach image
                    </button>
                  )}
                </div>

                {error && <p className="text-rose-600 font-semibold">{error}</p>}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={close}
                    className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-feedback"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold rounded-lg transition flex items-center gap-1.5"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {submitting ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
