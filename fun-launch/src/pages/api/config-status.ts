import { NextApiRequest, NextApiResponse } from 'next';
import { validateLocalConfig, getConfigTemplate } from '../../lib/studio/config-loader';

interface ConfigStatusResponse {
  success: boolean;
  isValid: boolean;
  errors: string[];
  configTemplate?: any;
  message?: string;
}

/**
 * API endpoint to check the status of the local dbc_config.jsonc
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ConfigStatusResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      isValid: false,
      errors: ['Method not allowed. Use GET.']
    });
  }

  try {
    console.log('🔍 Checking local dbc_config.jsonc status...');

    // Validate the local configuration
    const validation = validateLocalConfig();
    
    // Get configuration template for display
    const configTemplate = getConfigTemplate();

    const response: ConfigStatusResponse = {
      success: true,
      isValid: validation.isValid,
      errors: validation.errors,
      configTemplate,
      message: validation.isValid 
        ? 'Local configuration is valid and ready to use' 
        : 'Local configuration has validation errors'
    };

    console.log('📋 Configuration status:', {
      isValid: validation.isValid,
      errorCount: validation.errors.length,
      hasTemplate: !!configTemplate
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error checking config status:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      isValid: false,
      errors: [`Failed to check configuration status: ${errorMessage}`]
    });
  }
}
