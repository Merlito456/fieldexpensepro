
export type ExpenseCategory = 'Transport' | 'Food' | 'Lodging' | 'Equipment' | 'Miscellaneous';
export type PeriodType = 'Weekly' | 'Monthly' | 'Yearly' | 'Project/Site';

export interface Expense {
  id: string;
  title: string;
  date: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  isVerified: boolean;
  receiptUrl?: string;
  notes?: string;
  issuerAddress?: string;
}

export interface ReportMetadata {
  approverName: string;
  purpose: string;
  claimant: string;
  periodType: PeriodType;
  periodLabel: string; 
  startDate: string;
  endDate: string;
  receivedAmount: number;
  signatureUrl?: string;
}

export interface ParsedReceiptData {
  title: string;
  date: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  explanation?: string;
  issuerAddress?: string;
}
