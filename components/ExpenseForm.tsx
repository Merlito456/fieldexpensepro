
import React, { useState } from 'react';
import { Expense, ExpenseCategory } from '../types';

interface ExpenseFormProps {
  onAdd: (expense: Omit<Expense, 'id'>) => void;
  onUpdate?: (id: string, expense: Partial<Expense>) => void;
  onClose: () => void;
  initialData?: Partial<Expense>;
  isEdit?: boolean;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAdd, onUpdate, onClose, initialData, isEdit }) => {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    amount: initialData?.amount?.toString() || '',
    category: (initialData?.category || 'Miscellaneous') as ExpenseCategory,
    date: initialData?.date || new Date().toISOString().split('T')[0],
    currency: initialData?.currency || 'PHP',
    issuerAddress: initialData?.issuerAddress || '',
    notes: initialData?.notes || '',
    receiptUrl: initialData?.receiptUrl || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      amount: parseFloat(formData.amount) || 0,
      category: formData.category,
      date: formData.date,
      currency: formData.currency,
      issuerAddress: formData.issuerAddress,
      isVerified: true,
      notes: formData.notes,
      receiptUrl: formData.receiptUrl
    };

    if (isEdit && onUpdate && initialData?.id) {
      onUpdate(initialData.id, payload);
    } else {
      onAdd(payload);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-3 md:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] w-full max-w-lg p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div>
            <h3 className="text-lg md:text-xl font-black text-slate-800">{isEdit ? 'Review & Edit' : 'Manual Entry'}</h3>
            <p className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verify details before saving</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar">
          {formData.receiptUrl && (
            <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 aspect-video flex items-center justify-center">
              <img src={formData.receiptUrl} alt="Receipt Preview" className="h-full w-full object-contain" />
            </div>
          )}

          <form id="expense-form" onSubmit={handleSubmit} className="space-y-4 pb-4">
            <div>
              <label className="block text-[9px] md:text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Merchant / Title</label>
              <input
                required
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                placeholder="e.g. Shell Gas Station"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[9px] md:text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Issuer Address</label>
              <input
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                placeholder="Store branch address"
                value={formData.issuerAddress}
                onChange={e => setFormData({ ...formData, issuerAddress: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <label className="block text-[9px] md:text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Amount (₱)</label>
                <input
                  required
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[9px] md:text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Category</label>
                <select
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold appearance-none cursor-pointer text-sm"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                >
                  {['Transport', 'Food', 'Lodging', 'Equipment', 'Miscellaneous'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[9px] md:text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Transaction Date</label>
              <input
                type="date"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-sm"
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </form>
        </div>

        <div className="pt-4 flex-shrink-0">
          <button
            form="expense-form"
            type="submit"
            className="w-full py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black text-xs md:text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
          >
            {isEdit ? 'Save Changes' : 'Confirm & Record'}
          </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default ExpenseForm;
