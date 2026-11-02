import { httpClient } from '../../../shared/api';
import type { Plan } from './plansApi';

export interface Subscription {
  id: number;
  planId: number;
  plan: Plan;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
}

export interface CreateSubscriptionInput {
  planId: number;
  autoRenew: boolean;
  paymentMethod: 'CARD' | 'PAYPAL' | 'BANK_TRANSFER';
  paymentToken?: string;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const response = await httpClient.post<Subscription>('/subscriptions', input);
  return response.data;
}
