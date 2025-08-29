import { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs';

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

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Handle multipart form data
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = formidable();
      
      form.parse(req, (err: any, fields: any, files: any) => {
        if (err) reject(err);
        resolve({ fields, files });
      });
    });

    const imageFile = files.image;
    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(imageFile.mimetype)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' 
      });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 5MB.' 
      });
    }

    // Generate unique filename
    const fileExtension = imageFile.originalFilename.split('.').pop();
    const fileName = `images/${uuidv4()}.${fileExtension}`;

    // Upload to R2
    const uploadParams = {
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: fs.createReadStream(imageFile.filepath),
      ContentType: imageFile.mimetype,
      ACL: 'public-read',
    };

    await r2.upload(uploadParams).promise();

    // Clean up temporary file
    fs.unlinkSync(imageFile.filepath);

    const imageUrl = `${PUBLIC_R2_URL}/${fileName}`;

    res.status(200).json({
      success: true,
      imageUrl,
      fileName,
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to upload image' 
    });
  }
}
