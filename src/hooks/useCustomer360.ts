import { useQuery } from '@tanstack/react-query';
import {
  customer360Service,
  ListCustomersParams,
  TransactionsParams,
  Customer360Summary,
  Customer360Profile,
  TransactionsResponse,
} from '@/services/customer360.service';

export function useCustomerList(params: ListCustomersParams) {
  return useQuery<Customer360Summary[]>({
    queryKey: ['customer360-list', params],
    queryFn: () => customer360Service.listCustomers(params),
  });
}

export function useCustomer360(customerId: string | null) {
  return useQuery<Customer360Profile>({
    queryKey: ['customer360-profile', customerId],
    queryFn: () => customer360Service.getCustomer360(customerId!),
    enabled: !!customerId,
  });
}

export function useCustomerTransactions(customerId: string | null, params: TransactionsParams) {
  return useQuery<TransactionsResponse>({
    queryKey: ['customer360-transactions', customerId, params],
    queryFn: () => customer360Service.getTransactions(customerId!, params),
    enabled: !!customerId,
  });
}

export function useCustomerAlerts(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-alerts', customerId],
    queryFn: () => customer360Service.getAlertHistory(customerId!),
    enabled: !!customerId,
  });
}
