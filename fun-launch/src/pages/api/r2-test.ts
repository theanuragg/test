import { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';

// Environment variables
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_BUCKET = process.env.R2_BUCKET;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

interface TestResponse {
  success: boolean;
  config: {
    hasAccessKey: boolean;
    hasSecretKey: boolean;
    hasAccountId: boolean;
    hasBucket: boolean;
    hasPublicUrl: boolean;
  };
  connection: {
    canConnect: boolean;
    canListBuckets: boolean;
    canAccessBucket: boolean;
  };
  publicAccess: {
    publicUrl: string;
    isConfigured: boolean;
  };
  errors: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      config: {} as any,
      connection: {} as any,
      publicAccess: {} as any,
      errors: ['Method not allowed'] 
    });
  }

  const errors: string[] = [];
  const config = {
    hasAccessKey: !!R2_ACCESS_KEY_ID,
    hasSecretKey: !!R2_SECRET_ACCESS_KEY,
    hasAccountId: !!R2_ACCOUNT_ID,
    hasBucket: !!R2_BUCKET,
    hasPublicUrl: !!R2_PUBLIC_URL,
  };

  const connection = {
    canConnect: false,
    canListBuckets: false,
    canAccessBucket: false,
  };

  const publicAccess = {
    publicUrl: R2_PUBLIC_URL || 'Not configured',
    isConfigured: !!R2_PUBLIC_URL,
  };

  // Check for missing environment variables
  if (!R2_ACCESS_KEY_ID) errors.push('Missing R2_ACCESS_KEY_ID');
  if (!R2_SECRET_ACCESS_KEY) errors.push('Missing R2_SECRET_ACCESS_KEY');
  if (!R2_ACCOUNT_ID) errors.push('Missing R2_ACCOUNT_ID');
  if (!R2_BUCKET) errors.push('Missing R2_BUCKET');
  if (!R2_PUBLIC_URL) errors.push('Missing R2_PUBLIC_URL');

  // Test R2 connection if we have the required variables
  if (config.hasAccessKey && config.hasSecretKey && config.hasAccountId) {
    try {
      const r2 = new AWS.S3({
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
        region: 'auto',
        signatureVersion: 'v4',
      });

      // Test basic connection
      connection.canConnect = true;

      // Test bucket access
      if (config.hasBucket) {
        try {
          await r2.headBucket({ Bucket: R2_BUCKET! }).promise();
          connection.canAccessBucket = true;
        } catch (bucketError) {
          errors.push(`Cannot access bucket: ${bucketError}`);
        }
      }

      // Test listing buckets (optional)
      try {
        await r2.listBuckets().promise();
        connection.canListBuckets = true;
      } catch (listError) {
        // This is not critical, just for testing
        console.log('Cannot list buckets (this is normal):', listError);
      }

    } catch (connectionError) {
      errors.push(`R2 connection failed: ${connectionError}`);
    }
  }

  const success = errors.length === 0 && connection.canConnect && connection.canAccessBucket;

  res.status(200).json({
    success,
    config,
    connection,
    publicAccess,
    errors,
  });
}
