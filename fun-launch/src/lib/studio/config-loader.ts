import fs from 'fs';
import path from 'path';
import type { DbcConfig, BuildCurveWithMarketCap } from './types';

/**
 * Configuration Loader for Fun-Launch
 * 
 * This module loads and manages the local dbc_config.jsonc file
 * within the fun-launch project, allowing for local configuration
 * management without depending on the studio folder.
 */

/**
 * Load the local dbc_config.jsonc file
 */
export function loadLocalDbcConfig(): DbcConfig {
  try {
    const configPath = path.join(process.cwd(), 'config', 'dbc_config.jsonc');
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Parse the JSONC content (remove comments)
    const cleanContent = configContent
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
      .replace(/\/\/.*$/gm, '') // Remove // comments
      .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas
    
    const config = JSON.parse(cleanContent);
    
    console.log('📋 Loaded local dbc_config.jsonc successfully');
    return config;
  } catch (error) {
    console.error('❌ Error loading local dbc_config.jsonc:', error);
    throw new Error('Failed to load local dbc_config.jsonc file');
  }
}

/**
 * Get the DBC configuration section from the local config
 */
export function getLocalDbcConfigSection(): BuildCurveWithMarketCap {
  const config = loadLocalDbcConfig();
  
  if (!config.dbcConfig) {
    throw new Error('Missing dbcConfig section in local dbc_config.jsonc');
  }
  
  return config.dbcConfig as BuildCurveWithMarketCap;
}

/**
 * Update the local dbc_config.jsonc file
 */
export function updateLocalDbcConfig(updates: Partial<DbcConfig>): void {
  try {
    const configPath = path.join(process.cwd(), 'config', 'dbc_config.jsonc');
    const currentConfig = loadLocalDbcConfig();
    
    // Merge updates with current config
    const updatedConfig = { ...currentConfig, ...updates };
    
    // Write back to file with proper formatting
    const formattedConfig = JSON.stringify(updatedConfig, null, 2);
    fs.writeFileSync(configPath, formattedConfig, 'utf8');
    
    console.log('✅ Updated local dbc_config.jsonc successfully');
  } catch (error) {
    console.error('❌ Error updating local dbc_config.jsonc:', error);
    throw new Error('Failed to update local dbc_config.jsonc file');
  }
}

/**
 * Get network-specific configuration
 */
export function getNetworkConfig(network: 'mainnet' | 'devnet'): {
  rpcUrl: string;
  quoteMint: string;
  tokenQuoteDecimal: number;
} {
  const config = loadLocalDbcConfig();
  
  const networkConfigs = {
    mainnet: {
      rpcUrl: 'https://api.mainnet-beta.solana.com',
      quoteMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC Mainnet
      tokenQuoteDecimal: 6
    },
    devnet: {
      rpcUrl: 'https://api.devnet.solana.com',
      quoteMint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr', // USDC Devnet
      tokenQuoteDecimal: 6
    }
  };
  
  return networkConfigs[network];
}

/**
 * Validate the local configuration
 */
export function validateLocalConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const config = loadLocalDbcConfig();
    
    // Validate required fields
    if (!config.rpcUrl) {
      errors.push('Missing rpcUrl in configuration');
    }
    
    if (!config.quoteMint) {
      errors.push('Missing quoteMint in configuration');
    }
    
    if (!config.dbcConfig) {
      errors.push('Missing dbcConfig section in configuration');
    } else {
      const dbcConfig = config.dbcConfig as BuildCurveWithMarketCap;
      
      // Validate buildCurveMode
      if (dbcConfig.buildCurveMode < 0 || dbcConfig.buildCurveMode > 3) {
        errors.push('buildCurveMode must be between 0 and 3');
      }
      
      // Validate market caps for buildCurveMode 1
      if (dbcConfig.buildCurveMode === 1) {
        if (dbcConfig.initialMarketCap <= 0) {
          errors.push('initialMarketCap must be greater than 0');
        }
        if (dbcConfig.migrationMarketCap <= dbcConfig.initialMarketCap) {
          errors.push('migrationMarketCap must be greater than initialMarketCap');
        }
      }
      
      // Validate token supply
      if (dbcConfig.totalTokenSupply <= 0) {
        errors.push('totalTokenSupply must be greater than 0');
      }
      
      // Validate fee percentages
      if (dbcConfig.creatorTradingFeePercentage < 0 || dbcConfig.creatorTradingFeePercentage > 100) {
        errors.push('creatorTradingFeePercentage must be between 0 and 100');
      }
      
      // Validate LP percentages
      const totalLpPercentage = dbcConfig.partnerLpPercentage + 
                               dbcConfig.creatorLpPercentage + 
                               dbcConfig.partnerLockedLpPercentage + 
                               dbcConfig.creatorLockedLpPercentage;
      
      if (totalLpPercentage !== 100) {
        errors.push('Total LP percentages must equal 100%');
      }
      
      // Validate vesting parameters
      if (dbcConfig.lockedVestingParam.totalLockedVestingAmount > dbcConfig.totalTokenSupply) {
        errors.push('Total locked vesting amount cannot exceed total token supply');
      }
    }
    
  } catch (error) {
    errors.push(`Configuration loading error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get configuration template for display
 */
export function getConfigTemplate(): any {
  try {
    const config = loadLocalDbcConfig();
    
    return {
      // Basic settings
      basic: {
        rpcUrl: config.rpcUrl,
        dryRun: config.dryRun,
        computeUnitPriceMicroLamports: config.computeUnitPriceMicroLamports,
        quoteMint: config.quoteMint,
      },
      
      // DBC configuration
      dbc: config.dbcConfig ? {
        buildCurveMode: config.dbcConfig.buildCurveMode,
        initialMarketCap: (config.dbcConfig as BuildCurveWithMarketCap).initialMarketCap,
        migrationMarketCap: (config.dbcConfig as BuildCurveWithMarketCap).migrationMarketCap,
        totalTokenSupply: config.dbcConfig.totalTokenSupply,
        migrationOption: config.dbcConfig.migrationOption === 1 ? 'DAMM V2' : 'DAMM V1',
        tokenBaseDecimal: config.dbcConfig.tokenBaseDecimal,
        tokenQuoteDecimal: config.dbcConfig.tokenQuoteDecimal,
        creatorTradingFeePercentage: config.dbcConfig.creatorTradingFeePercentage,
        dynamicFeeEnabled: config.dbcConfig.dynamicFeeEnabled,
        migrationFeeOption: config.dbcConfig.migrationFeeOption,
      } : null,
      
      // Pool configuration
      pool: config.dbcPool ? {
        name: config.dbcPool.name,
        symbol: config.dbcPool.symbol,
        uri: config.dbcPool.uri,
      } : null,
    };
  } catch (error) {
    console.error('❌ Error getting config template:', error);
    return null;
  }
}
