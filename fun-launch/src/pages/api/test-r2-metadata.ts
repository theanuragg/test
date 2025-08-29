import { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID as string;
const R2_BUCKET = process.env.R2_BUCKET as string;
const PUBLIC_R2_URL = process.env.R2_PUBLIC_URL || 'https://pub-0047415c6eef40ddb3797845cba68874.r2.dev';

const r2 = new AWS.S3({
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing R2 metadata upload...');
    
    // Test metadata
    const testMetadata = {
      name: 'Test R2 Upload',
      symbol: 'R2TEST',
      image: 'https://example.com/test.png',
      description: 'Testing R2 metadata upload functionality',
    };

    const testMint = 'R2TEST123456789';
    const fileName = `metadata/${testMint}.json`;
    const metadataJson = JSON.stringify(testMetadata, null, 2);
    
    console.log('📄 Test metadata:', testMetadata);
    console.log('📂 File name:', fileName);
    console.log('🔗 Expected URL:', `${PUBLIC_R2_URL}/${fileName}`);
    console.log('🏗️ R2 Config:', {
      bucket: R2_BUCKET,
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      hasAccessKey: !!R2_ACCESS_KEY_ID,
      hasSecretKey: !!R2_SECRET_ACCESS_KEY,
    });

    // Upload to R2
    const uploadParams = {
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: metadataJson,
      ContentType: 'application/json',
      ACL: 'public-read',
    };

    console.log('📤 Uploading to R2 with params:', {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      ContentType: uploadParams.ContentType,
      ACL: uploadParams.ACL,
      BodySize: metadataJson.length,
    });

    const uploadResult = await r2.upload(uploadParams).promise();
    console.log('✅ R2 upload successful:', uploadResult);

    // Test if file is accessible
    const testUrl = `${PUBLIC_R2_URL}/${fileName}`;
    console.log('🔍 Testing accessibility at:', testUrl);

    // Wait a moment for R2 to propagate
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test fetch
    try {
      const response = await fetch(testUrl);
      const isAccessible = response.ok;
      const responseText = await response.text();
      
      console.log('📊 Accessibility test:', {
        url: testUrl,
        status: response.status,
        ok: response.ok,
        responseLength: responseText.length,
        isJson: responseText.startsWith('{'),
      });

      res.status(200).json({
        success: true,
        message: 'R2 metadata upload test completed',
        uploadResult,
        testUrl,
        accessible: isAccessible,
        responsePreview: responseText.substring(0, 200),
        fileSize: metadataJson.length,
      });

    } catch (fetchError) {
      console.error('❌ Failed to test accessibility:', fetchError);
      
      res.status(200).json({
        success: false,
        message: 'R2 upload succeeded but accessibility test failed',
        uploadResult,
        testUrl,
        accessible: false,
        fetchError: fetchError instanceof Error ? fetchError.message : 'Unknown error',
      });
    }

  } catch (error) {
    console.error('❌ R2 metadata test failed:', error);
    
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      config: {
        bucket: R2_BUCKET,
        hasKeys: !!(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY),
        publicUrl: PUBLIC_R2_URL,
      }
    });
  }
}
