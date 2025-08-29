import { NextApiRequest, NextApiResponse } from 'next';

const PUBLIC_R2_URL = process.env.R2_PUBLIC_URL || 'https://pub-0047415c6eef40ddb3797845cba68874.r2.dev';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 Testing public access to your token metadata...');
    
    // Test your actual token metadata
    const yourTokenMint = 'FVPczHwzoxAf9rDVVeb8iGPcAvVUda1nRNrzcQetvntu';
    const metadataUrl = `${PUBLIC_R2_URL}/metadata/${yourTokenMint}.json`;
    
    console.log('🔗 Testing URL:', metadataUrl);

    const response = await fetch(metadataUrl);
    const responseText = await response.text();
    
    console.log('📊 Response status:', response.status);
    console.log('✅ Response OK:', response.ok);
    console.log('📄 Response preview:', responseText.substring(0, 200));

    let isValidJson = false;
    let metadata = null;

    try {
      metadata = JSON.parse(responseText);
      isValidJson = true;
      console.log('✅ Valid JSON metadata:', metadata);
    } catch (parseError) {
      console.log('❌ Invalid JSON response');
    }

    res.status(200).json({
      success: response.ok,
      url: metadataUrl,
      status: response.status,
      accessible: response.ok,
      isValidJson,
      metadata: isValidJson ? metadata : null,
      responsePreview: responseText.substring(0, 300),
      diagnosis: response.ok ? 
        '✅ Public access is working! Token names should show in Solscan now!' :
        '❌ Public access still not working. Check R2 bucket settings.',
    });

  } catch (error) {
    console.error('Test error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
