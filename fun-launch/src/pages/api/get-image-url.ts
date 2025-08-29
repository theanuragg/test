import type { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID as string;
const R2_BUCKET = process.env.R2_BUCKET as string;
const PRIVATE_R2_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const r2 = new AWS.S3({
  endpoint: PRIVATE_R2_URL,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { tokenMint } = req.query;
  
  if (!tokenMint || typeof tokenMint !== 'string') {
    return res.status(400).json({ error: 'tokenMint parameter required' });
  }

  try {
    // Try different image extensions
    const extensions = ['jpeg', 'jpg', 'png', 'webp'];
    
    for (const ext of extensions) {
      const key = `tokens/${tokenMint}.${ext}`;
      
      try {
        // Check if file exists
        await new Promise((resolve, reject) => {
          r2.headObject({ Bucket: R2_BUCKET, Key: key }, (err, data) => {
            if (err) reject(err);
            else resolve(data);
          });
        });
        
        // Generate signed URL (valid for 1 hour)
        const signedUrl = r2.getSignedUrl('getObject', {
          Bucket: R2_BUCKET,
          Key: key,
          Expires: 3600 // 1 hour
        });
        
        return res.status(200).json({
          tokenMint,
          imageUrl: signedUrl,
          extension: ext,
          key: key
        });
      } catch (e) {
        // File doesn't exist with this extension, try next
        continue;
      }
    }
    
    // No image found with any extension
    return res.status(404).json({
      tokenMint,
      error: 'No image found',
      imageUrl: null
    });
    
  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Unknown error'
    });
  }
}
