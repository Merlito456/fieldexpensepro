
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Expense } from '../types';

interface DashboardProps {
  expenses: Expense[];
  budgetLimit: number;
  receivedAmount: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const Dashboard: React.FC<DashboardProps> = ({ expenses, budgetLimit, receivedAmount }) => {
  const categoryTotals = expenses.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = receivedAmount - totalSpent;
  // Use receivedAmount as the budget cap
  const capValue = receivedAmount > 0 ? receivedAmount : 1; 
  const percentUsed = (totalSpent / capValue) * 100;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {/* Period Allocation & Balance Card */}
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">Period Liquidation Status</h3>
        
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cash Advanced</p>
              <p className="text-2xl font-black text-slate-900">₱{receivedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Spent</p>
              <p className="text-2xl font-black text-indigo-600">₱{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <div className={`p-5 rounded-2xl border-2 ${balance >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className={`text-[9px] font-black uppercase tracking-widest ${balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {balance >= 0 ? 'Surplus (to Return)' : 'Deficit (due for Refund)'}
                </span>
                <span className={`text-xl font-black ${balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  ₱{Math.abs(balance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className={`p-2 rounded-xl ${balance >= 0 ? 'bg-emerald-200/50 text-emerald-700' : 'bg-rose-200/50 text-rose-700'}`}>
                {balance >= 0 ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m19 12-7 7-7-7"/><path d="M12 5v14"/></svg>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
              <span className="text-slate-400">Advanced Cash Utilization</span>
              <span className={percentUsed > 100 ? 'text-rose-600' : 'text-indigo-600'}>{percentUsed.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${percentUsed > 100 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                style={{ width: `${Math.min(percentUsed, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col md:flex-row gap-8">
        <div className="w-full h-48 md:w-1/3">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} innerRadius={55} outerRadius={75} paddingAngle={8} dataKey="value" stroke="none">
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex-1 grid grid-cols-2 gap-4 content-center">
          {(Object.entries(categoryTotals) as [string, number][]).map(([cat, amount], idx) => (
            <div key={cat} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{cat}</span>
              </div>
              <div className="text-base font-black text-slate-800">₱{amount.toFixed(2)}</div>
            </div>
          ))}
          {pieData.length === 0 && (
            <div className="col-span-2 text-center py-4 text-slate-400 text-[10px] font-black uppercase tracking-widest italic">
              Record expenses to visualize breakdown
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
