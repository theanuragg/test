import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';
import { DynamicBondingCurveClient, PoolConfig } from '@meteora-ag/dynamic-bonding-curve-sdk';
import * as fs from 'fs';
import * as path from 'path';

// Load configuration
const configPath = path.join(__dirname, '../config/dbc_config.jsonc');
const configContent = fs.readFileSync(configPath, 'utf8');

// Remove comments and parse JSON
const cleanConfig = configContent
  .replace(/\/\*[\s\S]*?\*\//g, '') // Remove /* */ comments
  .replace(/\/\/.*$/gm, '') // Remove // comments
  .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
  .replace(/\n/g, ' ') // Replace newlines with spaces
  .replace(/\r/g, '') // Remove carriage returns
  .replace(/\t/g, ' ') // Replace tabs with spaces
  .replace(/\s+/g, ' ') // Replace multiple spaces with single space
  .trim(); // Trim whitespace

console.log('🔍 Cleaned config:', cleanConfig);

const config = JSON.parse(cleanConfig);

async function generateDbcConfig() {
  try {
    console.log('🚀 Starting DBC Config Generation...');
    console.log('📋 Configuration loaded:', JSON.stringify(config, null, 2));

    // Connect to Solana
    const connection = new Connection(config.rpcUrl, 'confirmed');
    console.log('🔗 Connected to Solana:', config.rpcUrl);

    // Load keypair
    const keypairPath = path.resolve(config.keypairFilePath);
    console.log('🔑 Loading keypair from:', keypairPath);
    
    if (!fs.existsSync(keypairPath)) {
      throw new Error(`Keypair file not found: ${keypairPath}`);
    }

    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log('✅ Keypair loaded:', keypair.publicKey.toString());

    // Check SOL balance
    const balance = await connection.getBalance(keypair.publicKey);
    const balanceSol = balance / Math.pow(10, 9);
    console.log('💰 SOL Balance:', balanceSol, 'SOL');

    if (balanceSol < 0.01) {
      throw new Error(`Insufficient SOL balance. Need at least 0.01 SOL, have ${balanceSol} SOL`);
    }

    // Create DBC client
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    console.log('🔧 DBC Client created');

    // Prepare pool config
    const poolConfig: PoolConfig = {
      buildCurveMode: config.dbcConfig.buildCurveMode,
      totalTokenSupply: new (require('bn.js'))(config.dbcConfig.totalTokenSupply),
      migrationOption: config.dbcConfig.migrationOption,
      tokenBaseDecimal: config.dbcConfig.tokenBaseDecimal,
      tokenQuoteDecimal: config.dbcConfig.tokenQuoteDecimal,
      lockedVestingParam: {
        totalLockedVestingAmount: new (require('bn.js'))(config.dbcConfig.lockedVestingParam.totalLockedVestingAmount),
        numberOfVestingPeriod: config.dbcConfig.lockedVestingParam.numberOfVestingPeriod,
        cliffUnlockAmount: new (require('bn.js'))(config.dbcConfig.lockedVestingParam.cliffUnlockAmount),
        totalVestingDuration: new (require('bn.js'))(config.dbcConfig.lockedVestingParam.totalVestingDuration),
        cliffDurationFromMigrationTime: new (require('bn.js'))(config.dbcConfig.lockedVestingParam.cliffDurationFromMigrationTime)
      },
      baseFeeParams: {
        baseFeeMode: config.dbcConfig.baseFeeParams.baseFeeMode,
        feeSchedulerParam: {
          startingFeeBps: config.dbcConfig.baseFeeParams.feeSchedulerParam.startingFeeBps,
          endingFeeBps: config.dbcConfig.baseFeeParams.feeSchedulerParam.endingFeeBps,
          numberOfPeriod: config.dbcConfig.baseFeeParams.feeSchedulerParam.numberOfPeriod,
          totalDuration: new (require('bn.js'))(config.dbcConfig.baseFeeParams.feeSchedulerParam.totalDuration)
        }
      }
    };

    // Add buildCurveMode specific parameters
    if (config.dbcConfig.buildCurveMode === 1) {
      poolConfig.initialMarketCap = new (require('bn.js'))(config.dbcConfig.initialMarketCap);
      poolConfig.migrationMarketCap = new (require('bn.js'))(config.dbcConfig.migrationMarketCap);
    }

    console.log('📊 Pool Config prepared:', {
      buildCurveMode: poolConfig.buildCurveMode,
      totalTokenSupply: poolConfig.totalTokenSupply.toString(),
      initialMarketCap: poolConfig.initialMarketCap?.toString(),
      migrationMarketCap: poolConfig.migrationMarketCap?.toString()
    });

    // Create DBC config
    console.log('🏗️ Creating DBC config...');
    const configTx = await dbcClient.config.createConfig(
      poolConfig,
      new PublicKey(config.quoteMint),
      keypair
    );

    console.log('📝 Config transaction created');
    
    // Sign and send transaction
    console.log('🚀 Sending config transaction...');
    const signature = await sendAndConfirmTransaction(connection, configTx, [keypair]);
    
    console.log('✅ DBC Config created successfully!');
    console.log('🔗 Transaction signature:', signature);
    console.log('🔍 View on Solana Explorer:', `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    // Get the config address
    const configAddress = await dbcClient.config.getConfigAddress(poolConfig, new PublicKey(config.quoteMint));
    console.log('🏷️ DBC Config Address:', configAddress.toString());
    
    // Save the config address to a file
    const outputPath = path.join(__dirname, '../config/dbc_config_address.json');
    const outputData = {
      configAddress: configAddress.toString(),
      transactionSignature: signature,
      createdAt: new Date().toISOString(),
      network: config.rpcUrl.includes('devnet') ? 'devnet' : 'mainnet'
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log('💾 Config address saved to:', outputPath);
    
    return configAddress;
    
  } catch (error) {
    console.error('❌ Error generating DBC config:', error);
    throw error;
  }
}

// Run the script
if (require.main === module) {
  generateDbcConfig()
    .then((configAddress) => {
      console.log('\n🎉 DBC Config generation completed successfully!');
      console.log('🏷️ Config Address:', configAddress.toString());
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 DBC Config generation failed:', error);
      process.exit(1);
    });
}

export { generateDbcConfig };
