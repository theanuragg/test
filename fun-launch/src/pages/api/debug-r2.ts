import type { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID as string;
const R2_BUCKET = process.env.R2_BUCKET as string;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL as string;

const PRIVATE_R2_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const debug: any = {
    env: {
      hasAccessKey: !!R2_ACCESS_KEY_ID,
      hasSecretKey: !!R2_SECRET_ACCESS_KEY,
      hasAccountId: !!R2_ACCOUNT_ID,
      hasBucket: !!R2_BUCKET,
      hasPublicUrl: !!R2_PUBLIC_URL,
      bucket: R2_BUCKET,
      publicUrl: R2_PUBLIC_URL,
      privateUrl: PRIVATE_R2_URL,
    },
    tests: {}
  };

  try {
    // Test R2 connection
    const r2 = new AWS.S3({
      endpoint: PRIVATE_R2_URL,
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      region: 'auto',
      signatureVersion: 'v4',
    });

    // Test 1: List bucket contents in tokens/ folder
    try {
      const listResult = await new Promise<AWS.S3.ListObjectsV2Output>((resolve, reject) => {
        r2.listObjectsV2({
          Bucket: R2_BUCKET,
          Prefix: 'tokens/',
          MaxKeys: 10
        }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      debug.tests.listTokens = {
        status: 'success',
        count: listResult.Contents?.length || 0,
        files: listResult.Contents?.map(obj => ({
          key: obj.Key,
          size: obj.Size,
          lastModified: obj.LastModified
        })) || []
      };
    } catch (e) {
      debug.tests.listTokens = {
        status: 'error',
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Test 2: Upload a test image
    try {
      const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      const testBuffer = Buffer.from(testImageBase64, 'base64');
      const testKey = 'tokens/test-image.png';

      await new Promise((resolve, reject) => {
        r2.putObject({
          Bucket: R2_BUCKET,
          Key: testKey,
          Body: testBuffer,
          ContentType: 'image/png',
          ACL: 'public-read',
        }, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      debug.tests.uploadTest = {
        status: 'success',
        url: `${R2_PUBLIC_URL}/${testKey}`
      };
    } catch (e) {
      debug.tests.uploadTest = {
        status: 'error',
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    return res.status(200).json(debug);
  } catch (e) {
    debug.error = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json(debug);
  }
}
