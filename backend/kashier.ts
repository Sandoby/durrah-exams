import axios from 'axios';

export interface CreateSessionParams {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerReference: string;
}

export async function createKashierSession(params: CreateSessionParams, merchantId: string, apiKey: string, secretKey: string): Promise<string> {
  const payload = {
    merchantId,
    apiKey,
    orderId: params.orderId,
    amount: params.amount,
    currency: params.currency,
    customerEmail: params.customerEmail,
    customerReference: params.customerReference,
  };

  const response = await axios.post('https://sandbox.kashier.io/api/v3/session', payload, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });

  return response.data.sessionUrl;
}
