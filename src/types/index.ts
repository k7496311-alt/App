import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  id: string;
  phone: string;
  password?: string;
  balance: number;
  referralCode: string;
  referredBy?: string;
  createdAt: Timestamp;
  role: 'user' | 'admin';
}

export interface Investment {
  id: string;
  userId: string;
  amount: number;
  planId: string;
  planName: string;
  roi: number;
  profit: number;
  startTime: Timestamp;
  endTime: Timestamp;
  status: 'active' | 'completed';
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'profit' | 'referral';
  amount: number;
  time: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  description?: string;
  method?: string;
  trxId?: string;
}

export interface SystemConfig {
  depositNumber: string;
}

export interface Plan {
  id: string;
  name: string;
  durationLabel: string;
  durationMs: number;
  roi: number;
  minAmount: number;
  maxAmount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export type AuthState = {
  user: UserProfile | null;
  loading: boolean;
};
