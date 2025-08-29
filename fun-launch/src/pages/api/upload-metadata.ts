import { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

// Environment variables
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID as string;
const R2_BUCKET = process.env.R2_BUCKET as string;
const PUBLIC_R2_URL = process.env.R2_PUBLIC_URL || 'https://pub-0047415c6eef40ddb3797845cba68874.r2.dev';

// Configure R2 client
const r2 = new AWS.S3({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
});

interface MetadataRequest {
  name: string;
  symbol: string;
  image: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, symbol, image }: MetadataRequest = req.body;

    // Validate required fields
    if (!name || !symbol || !image) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, symbol, image' 
      });
    }

    // Create metadata object
    const metadata = {
      name,
      symbol,
      image,
      description: `${name} (${symbol}) token`,
      attributes: [],
      properties: {
        files: [
          {
            type: 'image/png',
            uri: image,
          },
        ],
        category: 'image',
      },
    };

    // Generate unique filename
    const fileName = `metadata/${uuidv4()}.json`;

    // Upload to R2
    const uploadParams = {
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: JSON.stringify(metadata, null, 2),
      ContentType: 'application/json',
      ACL: 'public-read',
    };

    await r2.upload(uploadParams).promise();

    const metadataUrl = `${PUBLIC_R2_URL}/${fileName}`;

    res.status(200).json({
      success: true,
      metadataUrl,
      fileName,
      metadata,
    });

  } catch (error) {
    console.error('Error uploading metadata:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload metadata' 
    });
  }
}
