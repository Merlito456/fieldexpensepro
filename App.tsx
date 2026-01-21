
import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, ExpenseCategory, ReportMetadata } from './types';
import Dashboard from './components/Dashboard';
import ReceiptUploader from './components/ReceiptUploader';
import ExpenseForm from './components/ExpenseForm';
import DocumentScanner from './components/DocumentScanner';
import SignaturePad from './components/SignaturePad';
import { analyzeReceipt } from './services/geminiService';
import { saveImage, getImage, deleteImage, clearAllImages } from './services/dbService';

const STORAGE_KEY_DATA = 'comworks_field_v1_meta';
const STORAGE_KEY_META = 'comworks_field_v1_config';

const COMPANY_INFO = {
  name: "ComWorks Inc.",
  address: "2/F CWI Corporate Center 1050 Quezon Ave., Quezon City",
  tin: "007-665-198-000"
};

const INITIAL_METADATA: ReportMetadata = {
  approverName: 'FINANCE AUTHORIZER',
  purpose: 'Site Visitation',
  claimant: 'Field Personnel',
  periodType: 'Project/Site',
  periodLabel: 'Quezon Ave Project',
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
  receivedAmount: 0,
  signatureUrl: undefined
};

const App: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [metadata, setMetadata] = useState<ReportMetadata>(INITIAL_METADATA);
  const [filter, setFilter] = useState<ExpenseCategory | 'All'>('All');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [pendingOCRData, setPendingOCRData] = useState<Partial<Expense> | null>(null);
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const loadSavedData = async () => {
      const savedData = localStorage.getItem(STORAGE_KEY_DATA);
      const savedMeta = localStorage.getItem(STORAGE_KEY_META);
      if (savedData) setExpenses(JSON.parse(savedData));
      if (savedMeta) setMetadata(JSON.parse(savedMeta));
      setIsLoaded(true);
    };
    loadSavedData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      const metadataOnly = expenses.map(({ receiptUrl, ...rest }) => rest);
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(metadataOnly));
      localStorage.setItem(STORAGE_KEY_META, JSON.stringify(metadata));
    }
  }, [expenses, metadata, isLoaded]);

  const filtered = useMemo(() => {
    return expenses.filter(e => filter === 'All' || e.category === filter);
  }, [expenses, filter]);

  const addExpense = async (data: Omit<Expense, 'id'>) => {
    const id = `CWX-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    if (data.receiptUrl && data.receiptUrl.startsWith('data:')) {
      await saveImage(id, data.receiptUrl);
    }
    const newRecord: Expense = { ...data, id };
    setExpenses(prev => [newRecord, ...prev]);
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    if (updates.receiptUrl && updates.receiptUrl.startsWith('data:')) {
      await saveImage(id, updates.receiptUrl);
    }
  };

  const deleteExpense = async (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await deleteImage(id);
  };

  const handleClearData = async () => {
    const confirmed = window.confirm("Are you sure you want to clear all current project data? This will delete all expenses, receipts, and signatures permanently.");
    if (confirmed) {
      setExpenses([]);
      setMetadata(INITIAL_METADATA);
      localStorage.removeItem(STORAGE_KEY_DATA);
      localStorage.removeItem(STORAGE_KEY_META);
      await clearAllImages();
      setIsEditingMeta(false);
      alert("Current project data cleared.");
    }
  };

  const handleSignatureSave = (signatureBase64: string) => {
    setMetadata(prev => ({ ...prev, signatureUrl: signatureBase64 }));
    setShowSignPad(false);
  };

  const handleCapture = async (base64: string, mimeType: string) => {
    setShowScanner(false);
    setIsProcessing(true);
    try {
      const result = await analyzeReceipt(base64, mimeType);
      setPendingOCRData({
        title: result.title,
        amount: result.amount,
        category: result.category,
        date: result.date,
        issuerAddress: result.issuerAddress,
        receiptUrl: `data:${mimeType};base64,${base64}`,
        isVerified: true,
        notes: result.explanation,
        currency: result.currency || 'PHP'
      });
    } catch (err) {
      alert("Local scan inconclusive. Please enter details manually.");
      setShowManualForm(true);
    } finally {
      setIsProcessing(false);
    }
  };

  // Improved format detection for jsPDF compatibility
  const getFormat = (dataUri: string): "JPEG" | "PNG" | "WEBP" => {
    if (dataUri.includes('image/png')) return 'PNG';
    if (dataUri.includes('image/webp')) return 'WEBP';
    return 'JPEG';
  };

  const generatePDF = async () => {
    if (!metadata.signatureUrl) {
      setShowSignPad(true);
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
      const balance = metadata.receivedAmount - totalSpent;

      // Report Header Branding (No Logo, Text Only)
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 297, 45, 'F');

      // Header Text Elements
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(COMPANY_INFO.name, 15, 18);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(COMPANY_INFO.address, 15, 23);
      doc.text(`TIN: ${COMPANY_INFO.tin}`, 15, 27);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text('EXPENSE LIQUIDATION REPORT', 180, 18);
      doc.setFontSize(8);
      doc.text(`System Generated: ${new Date().toLocaleString()}`, 180, 23);

      // Metadata Section
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(9);
      doc.text('PERSONNEL DATA', 15, 55);
      doc.setFont("helvetica", "normal");
      doc.text(`Claimant Name: ${metadata.claimant}`, 15, 60);
      doc.text(`Purpose: ${metadata.purpose}`, 15, 64);
      doc.text(`Project Location: ${metadata.periodLabel}`, 15, 68);

      doc.setFont("helvetica", "bold");
      doc.text('LIQUIDATION SUMMARY', 200, 55);
      doc.setFont("helvetica", "normal");
      doc.text(`Audit Window: ${metadata.startDate} to ${metadata.endDate}`, 200, 60);
      doc.text(`Cash Advanced: PHP ${metadata.receivedAmount.toLocaleString()}`, 200, 64);
      doc.text(`Total Liquidated: PHP ${totalSpent.toLocaleString()}`, 200, 68);
      
      if (balance >= 0) {
        doc.setTextColor(16, 185, 129);
        doc.text(`Surplus (To Return): PHP ${balance.toLocaleString()}`, 200, 74);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.text(`Shortage (Reimburse): PHP ${Math.abs(balance).toLocaleString()}`, 200, 74);
      }

      // Expense Table
      const body = expenses.map(e => [
        e.date,
        e.title,
        e.issuerAddress || 'Verified Branch',
        e.category,
        `PHP ${e.amount.toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: 82,
        head: [['Date', 'Merchant / Establishment', 'Verified Address', 'Category', 'Amount']],
        body: body,
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
        margin: { left: 15, right: 15 }
      });

      // Signatures
      const finalY = (doc as any).lastAutoTable.finalY + 25;
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text('Claimant Signature:', 15, finalY);
      
      if (metadata.signatureUrl) {
        try {
          const sigFormat = getFormat(metadata.signatureUrl);
          doc.addImage(metadata.signatureUrl, sigFormat, 15, finalY + 5, 40, 15, undefined, 'FAST');
        } catch (sigErr) {
          console.error("Could not render signature in PDF", sigErr);
        }
      }
      
      doc.line(15, finalY + 20, 75, finalY + 20);
      doc.text(metadata.claimant, 15, finalY + 25);

      doc.text('Finance Approver:', 200, finalY);
      doc.line(200, finalY + 20, 275, finalY + 20);
      doc.text(metadata.approverName, 200, finalY + 25);

      // Appendix Page for Proofs
      if (expenses.length > 0) {
        doc.addPage('p', 'a4');
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text('Audit Attachments (Proofs of Expense)', 15, 20);
        
        let currentY = 35;
        for (const exp of expenses) {
          try {
            const img = await getImage(exp.id);
            if (!img || !img.startsWith('data:')) continue;

            if (currentY > 230) {
              doc.addPage();
              currentY = 20;
            }

            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`Ref ID: ${exp.id} | ${exp.title} | ${exp.date} | PHP ${exp.amount.toFixed(2)}`, 15, currentY);
            currentY += 4;
            
            const format = getFormat(img);
            doc.addImage(img, format, 15, currentY, 120, 75, undefined, 'FAST');
            currentY += 85;
          } catch (imageErr) {
            console.error(`Skipping image attachment for ${exp.id}`, imageErr);
            doc.setFontSize(7);
            doc.text(`[Image attachment failed or corrupted for record ${exp.id}]`, 15, currentY);
            currentY += 10;
          }
        }
      }

      doc.save(`Liquidation_${metadata.claimant.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (pdfErr) {
      console.error("PDF Export Process Failed:", pdfErr);
      alert("Export failed. Please ensure all receipt images and signatures are valid.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-32">
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
             <span className="text-white font-black">CW</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800 leading-none">FieldExpense Pro</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secure Environment Active</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowManualForm(true)} className="hidden md:flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase text-slate-600 border border-slate-200 hover:bg-slate-100 transition-all">Manual Entry</button>
          <ReceiptUploader onAddExpense={addExpense} onStartScan={() => setShowScanner(true)} isProcessing={isProcessing} />
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 pt-10">
        <section className="bg-white rounded-[2.5rem] p-8 mb-8 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start mb-6">
             <div className="flex items-center gap-3">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Report Metadata</span>
               <button onClick={() => setIsEditingMeta(!isEditingMeta)} className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold underline uppercase">
                 {isEditingMeta ? 'Save Changes' : 'Edit Personnel / Project'}
               </button>
             </div>
             <div className="flex gap-3">
               <button onClick={handleClearData} className="text-rose-600 font-black text-xs uppercase flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all border border-rose-100">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  Clear Current Data
               </button>
               <button onClick={() => setShowSignPad(true)} className="text-slate-900 font-black text-xs uppercase flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">
                  {metadata.signatureUrl ? 'Update Signature' : 'Add E-Signature'}
               </button>
             </div>
          </div>

          {isEditingMeta ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-4 duration-300">
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Claimant Personnel</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={metadata.claimant} onChange={e => setMetadata({...metadata, claimant: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Finance Approver</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={metadata.approverName} onChange={e => setMetadata({...metadata, approverName: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Site</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={metadata.periodLabel} onChange={e => setMetadata({...metadata, periodLabel: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cash Advanced (₱)</label>
                <input className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" type="number" value={metadata.receivedAmount} onChange={e => setMetadata({...metadata, receivedAmount: parseFloat(e.target.value) || 0})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit Start</label>
                <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={metadata.startDate} onChange={e => setMetadata({...metadata, startDate: e.target.value})} /></div>
              <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Audit End</label>
                <input type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm" value={metadata.endDate} onChange={e => setMetadata({...metadata, endDate: e.target.value})} /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Establishment</h4><p className="text-sm font-black text-slate-800">{COMPANY_INFO.name}</p></div>
              <div><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Liquidator</h4><p className="text-sm font-black text-indigo-600">{metadata.claimant}</p></div>
              <div><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Site/Project</h4><p className="text-sm font-black text-slate-800">{metadata.periodLabel}</p></div>
              <div><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Security Mode</h4><p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> AI Vision Active</p></div>
            </div>
          )}
        </section>

        <Dashboard expenses={expenses} budgetLimit={metadata.receivedAmount} receivedAmount={metadata.receivedAmount} />

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden mt-8">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50 text-[9px] uppercase font-black text-slate-400 bg-slate-50/50">
                  <th className="px-8 py-5">Expense Details</th>
                  <th className="px-8 py-5">Branch Address</th>
                  <th className="px-8 py-5">Category</th>
                  <th className="px-8 py-5 text-right">Amount</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-900 text-sm truncate max-w-[200px]">{expense.title}</div>
                      <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{expense.date}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs text-slate-500 font-medium truncate max-w-[150px] italic">{expense.issuerAddress || 'N/A'}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black uppercase text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">{expense.category}</span>
                    </td>
                    <td className="px-8 py-6 text-right font-mono font-black text-sm text-slate-900">₱{expense.amount.toFixed(2)}</td>
                    <td className="px-8 py-6 text-right space-x-2">
                      <button onClick={() => setEditingExpense(expense)} className="p-2.5 text-slate-400 hover:text-indigo-600 bg-white border border-slate-100 rounded-xl transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg></button>
                      <button onClick={() => deleteExpense(expense.id)} className="p-2.5 text-rose-300 hover:text-rose-500 bg-white border border-slate-100 rounded-xl transition-all shadow-sm"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {expenses.length > 0 && (
          <button onClick={generatePDF} className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 px-12 py-6 bg-slate-900 text-white rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-indigo-600 transition-all hover:-translate-y-1 active:scale-95 z-50">
             <span className="font-black text-sm uppercase tracking-[0.2em]">Export Liquidation PDF</span>
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </button>
        )}
      </main>

      {showManualForm && <ExpenseForm onAdd={addExpense} onClose={() => setShowManualForm(false)} />}
      
      {(editingExpense || pendingOCRData) && (
        <ExpenseForm 
          isEdit 
          initialData={editingExpense || pendingOCRData || {}} 
          onUpdate={editingExpense ? updateExpense : undefined} 
          onAdd={pendingOCRData ? addExpense : () => {}}
          onClose={() => { setEditingExpense(null); setPendingOCRData(null); }} 
        />
      )}

      {showScanner && <DocumentScanner onCapture={handleCapture} onClose={() => setShowScanner(false)} />}
      {showSignPad && <SignaturePad onSave={handleSignatureSave} onClose={() => setShowSignPad(false)} />}

      {isProcessing && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-10 text-center">
          <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 animate-spin rounded-full mb-8"></div>
          <h2 className="text-xl font-black mb-2 uppercase tracking-widest italic">AI Vision Engine</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Analyzing Document • Verified Secure</p>
        </div>
      )}
    </div>
  );
};

export default App;
