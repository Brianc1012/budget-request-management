// src/webhooks/dispatcher.ts
import axios from 'axios';
import { prisma } from '../config/database';
import { WebhookEvent, WebhookPayload } from '../types/webhook';
import { createWebhookSignature } from '../utils/hash.util';

class WebhookDispatcher {
  async dispatch(event: WebhookEvent, data: any) {
    // Get subscribed endpoints from SystemConfig
    const webhooks = await this.getWebhookSubscriptions(event);

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data
    };

    // Dispatch to all subscribers
    const promises = webhooks.map(webhook =>
      this.sendWebhook(webhook.url, payload, webhook.secret)
    );

    await Promise.allSettled(promises);
  }

  private async sendWebhook(url: string, payload: WebhookPayload, secret?: string) {
    try {
      const payloadString = JSON.stringify(payload);
      const headers: any = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': payload.event
      };

      // Add signature if secret is provided
      if (secret) {
        const signature = createWebhookSignature(payloadString, secret);
        headers['X-Webhook-Signature'] = signature;
      }

      await axios.post(url, payload, { headers, timeout: 5000 });
      console.log(`Webhook sent to ${url} for event ${payload.event}`);
    } catch (error: any) {
      console.error(`Webhook failed for ${url}:`, error.message);
    }
  }

  private async getWebhookSubscriptions(event: WebhookEvent) {
    try {
      // Retrieve from SystemConfig
      const config = await prisma.systemConfig.findUnique({
        where: { configKey: `webhook_subscriptions_${event}` }
      });

      if (!config) return [];

      const subscriptions = JSON.parse(config.configValue);
      return Array.isArray(subscriptions) ? subscriptions : [];
    } catch (error) {
      console.error('Failed to get webhook subscriptions:', error);
      return [];
    }
  }
}

export default new WebhookDispatcher();
