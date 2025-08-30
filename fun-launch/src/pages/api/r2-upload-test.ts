import { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';

// Environment variables
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID as string;
const R2_BUCKET = process.env.R2_BUCKET as string;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL as string;

interface TestUploadResponse {
  success: boolean;
  testFile: {
    fileName: string;
    uploadedUrl: string;
    publicUrl: string;
    isAccessible: boolean;
  };
  metadata: {
    fileName: string;
    uploadedUrl: string;
    publicUrl: string;
    isAccessible: boolean;
  };
  errors: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestUploadResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      testFile: {} as any,
      metadata: {} as any,
      errors: ['Method not allowed'] 
    });
  }

  const errors: string[] = [];

  // Validate environment variables
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET || !R2_PUBLIC_URL) {
    return res.status(500).json({
      success: false,
      testFile: {} as any,
      metadata: {} as any,
      errors: ['Missing R2 environment variables'],
    });
  }

  // Setup R2 client
  const r2 = new AWS.S3({
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    region: 'auto',
    signatureVersion: 'v4',
  });

  const testResults = {
    testFile: {
      fileName: '',
      uploadedUrl: '',
      publicUrl: '',
      isAccessible: false,
    },
    metadata: {
      fileName: '',
      uploadedUrl: '',
      publicUrl: '',
      isAccessible: false,
    },
  };

  try {
    // Test 1: Upload a simple test image
    const testImageData = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );
    const testImageFileName = `test/test-image-${Date.now()}.png`;
    
    await r2.putObject({
      Bucket: R2_BUCKET,
      Key: testImageFileName,
      Body: testImageData,
      ContentType: 'image/png',
      ACL: 'public-read',
    }).promise();

    testResults.testFile.fileName = testImageFileName;
    testResults.testFile.uploadedUrl = `${R2_PUBLIC_URL}/${testImageFileName}`;
    testResults.testFile.publicUrl = `${R2_PUBLIC_URL}/${testImageFileName}`;

    // Test 2: Upload test metadata
    const testMetadata = {
      name: 'Test Token',
      symbol: 'TEST',
      description: 'Test token for R2 verification',
      image: `${R2_PUBLIC_URL}/${testImageFileName}`,
      attributes: [
        {
          trait_type: 'Test',
          value: 'R2 Upload Verification'
        }
      ]
    };

    const testMetadataFileName = `test/test-metadata-${Date.now()}.json`;
    
    await r2.putObject({
      Bucket: R2_BUCKET,
      Key: testMetadataFileName,
      Body: JSON.stringify(testMetadata, null, 2),
      ContentType: 'application/json',
      ACL: 'public-read',
    }).promise();

    testResults.metadata.fileName = testMetadataFileName;
    testResults.metadata.uploadedUrl = `${R2_PUBLIC_URL}/${testMetadataFileName}`;
    testResults.metadata.publicUrl = `${R2_PUBLIC_URL}/${testMetadataFileName}`;

    // Test 3: Verify public access
    try {
      const imageResponse = await fetch(testResults.testFile.publicUrl);
      testResults.testFile.isAccessible = imageResponse.ok;
      
      if (!imageResponse.ok) {
        errors.push(`Test image not publicly accessible: ${imageResponse.status} ${imageResponse.statusText}`);
      }
    } catch (fetchError) {
      errors.push(`Failed to fetch test image: ${fetchError}`);
    }

    try {
      const metadataResponse = await fetch(testResults.metadata.publicUrl);
      testResults.metadata.isAccessible = metadataResponse.ok;
      
      if (!metadataResponse.ok) {
        errors.push(`Test metadata not publicly accessible: ${metadataResponse.status} ${metadataResponse.statusText}`);
      }
    } catch (fetchError) {
      errors.push(`Failed to fetch test metadata: ${fetchError}`);
    }

    console.log('✅ R2 Test Upload Results:', {
      testImage: testResults.testFile.publicUrl,
      testMetadata: testResults.metadata.publicUrl,
      imageAccessible: testResults.testFile.isAccessible,
      metadataAccessible: testResults.metadata.isAccessible,
    });

  } catch (uploadError) {
    errors.push(`Upload failed: ${uploadError}`);
  }

  const success = errors.length === 0 && testResults.testFile.isAccessible && testResults.metadata.isAccessible;

  res.status(200).json({
    success,
    testFile: testResults.testFile,
    metadata: testResults.metadata,
    errors,
  });
}
