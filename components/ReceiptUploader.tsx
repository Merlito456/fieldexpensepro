
import React, { useRef } from 'react';
import { analyzeReceipt } from '../services/geminiService';
import { Expense } from '../types';

interface ReceiptUploaderProps {
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onStartScan: () => void;
  isProcessing: boolean;
}

const ReceiptUploader: React.FC<ReceiptUploaderProps> = ({ onAddExpense, onStartScan, isProcessing }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result?.toString().split(',')[1];
      if (base64) {
        // Fallback for direct upload analysis
        // Since isProcessing is handled globally now, we just pass the result back
        try {
           const result = await analyzeReceipt(base64, file.type);
           onAddExpense({
             title: result.title || "Uploaded Receipt",
             amount: result.amount || 0,
             currency: result.currency || 'USD',
             category: result.category || 'Miscellaneous',
             date: result.date || new Date().toISOString().split('T')[0],
             isVerified: true,
             receiptUrl: event.target?.result?.toString()
           });
        } catch (err) {
           alert("AI analysis failed for this file.");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative flex gap-2">
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload}
      />
      
      <button
        onClick={onStartScan}
        disabled={isProcessing}
        className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
          isProcessing ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        Scan Document
      </button>

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
        title="Upload Image"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
      </button>
    </div>
  );
};

export default ReceiptUploader;
