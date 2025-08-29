/**
 * Helius Webhook Setup API
 * 
 * Manages real-time webhook subscriptions using Helius indexing services
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { initializeHelius } from '@/lib/helius/indexing';

interface WebhookSetupRequest {
  webhookUrl: string;
  transactionTypes: string[];
  accountFilters?: string[];
  accountExcludeFilters?: string[];
  webhookName?: string;
}

interface WebhookSetupResponse {
  success: boolean;
  data?: {
    webhookID: string;
    webhookUrl: string;
    status: string;
  };
  error?: string;
}

interface WebhookListResponse {
  success: boolean;
  data?: {
    webhooks: any[];
    total: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<WebhookSetupResponse | WebhookListResponse>
) {
  // Get Helius API key from environment
  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    return res.status(500).json({
      success: false,
      error: 'Helius API key not configured'
    });
  }

  // Initialize Helius instance
  const helius = initializeHelius(heliusApiKey);

  if (req.method === 'GET') {
    // List all webhooks
    try {
      console.log('📋 Fetching webhook list...');
      
      const webhooks = await helius.webhooks.getWebhooks();
      
      const response: WebhookListResponse = {
        success: true,
        data: {
          webhooks,
          total: webhooks.length,
        }
      };

      console.log(`✅ Found ${webhooks.length} webhooks`);
      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Error fetching webhooks:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        success: false,
        error: `Failed to fetch webhooks: ${errorMessage}`
      });
    }
  } else if (req.method === 'POST') {
    // Create new webhook
    try {
      const { 
        webhookUrl, 
        transactionTypes, 
        accountFilters, 
        accountExcludeFilters,
        webhookName 
      }: WebhookSetupRequest = req.body;

      // Validate required fields
      if (!webhookUrl || !transactionTypes || transactionTypes.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: webhookUrl and transactionTypes'
        });
      }

      console.log(`🔗 Setting up webhook: ${webhookName || 'Unnamed'}`);

      // Create webhook configuration
      const webhookConfig = {
        webhookURL: webhookUrl,
        transactionTypes,
        accountIncludeFilters: accountFilters,
        accountExcludeFilters,
      };

      // Create webhook
      const result = await helius.webhooks.createWebhook(webhookConfig);

      if (!result) {
        return res.status(500).json({
          success: false,
          error: 'Failed to create webhook'
        });
      }

      const response: WebhookSetupResponse = {
        success: true,
        data: {
          webhookID: result.webhookID,
          webhookUrl,
          status: 'active',
        }
      };

      console.log(`✅ Webhook created successfully: ${result.webhookID}`);
      res.status(200).json(response);

    } catch (error) {
      console.error('❌ Error creating webhook:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        success: false,
        error: `Failed to create webhook: ${errorMessage}`
      });
    }
  } else if (req.method === 'DELETE') {
    // Delete webhook
    try {
      const { webhookID } = req.body;

      if (!webhookID) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field: webhookID'
        });
      }

      console.log(`🗑️ Deleting webhook: ${webhookID}`);

      const success = await helius.webhooks.deleteWebhook(webhookID);

      if (!success) {
        return res.status(500).json({
          success: false,
          error: 'Failed to delete webhook'
        });
      }

      console.log(`✅ Webhook deleted successfully: ${webhookID}`);
      res.status(200).json({
        success: true,
        data: {
          webhookID,
          webhookUrl: '',
          status: 'deleted',
        }
      });

    } catch (error) {
      console.error('❌ Error deleting webhook:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      res.status(500).json({
        success: false,
        error: `Failed to delete webhook: ${errorMessage}`
      });
    }
  } else {
    res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use GET, POST, or DELETE.' 
    });
  }
}
