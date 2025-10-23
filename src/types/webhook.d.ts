// src/types/webhook.d.ts

export type WebhookEvent =
  | 'budget_request.created'
  | 'budget_request.submitted'
  | 'budget_request.approved'
  | 'budget_request.rejected'
  | 'budget_request.cancelled'
  | 'item_allocation.approved'
  | 'item_allocation.modified'
  | 'reservation.expired';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: {
    budgetRequestId: number;
    requestCode: string;
    department: string;
    [key: string]: any;
  };
}

export interface WebhookSubscription {
  url: string;
  secret?: string;
  events: WebhookEvent[];
  isActive: boolean;
}
