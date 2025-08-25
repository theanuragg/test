// src/lib/dbc/index.ts
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
  buildCurve,
  buildCurveWithLiquidityWeights,
  buildCurveWithMarketCap,
  buildCurveWithTwoSegments,
  ConfigParameters,
  DAMM_V1_MIGRATION_FEE_ADDRESS,
  DAMM_V2_MIGRATION_FEE_ADDRESS,
  deriveBaseKeyForLocker,
  deriveDammV1MigrationMetadataAddress,
  deriveDammV2MigrationMetadataAddress,
  deriveEscrow,
  DynamicBondingCurveClient,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { DbcConfig, PoolState, PoolConfig, FeeMetrics } from '../../types/dbc';
import { modifyComputeUnitPriceIx, runSimulateTransaction } from './helpers';
import { getQuoteDecimals } from '../solana/connection';

export const DEFAULT_SEND_TX_MAX_RETRIES = 3;

/**
 * Create a DBC config
 */
export async function createDbcConfig(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet,
  quoteMint: PublicKey
): Promise<PublicKey> {
  if (!config.dbcConfig) {
    throw new Error('Missing dbc configuration');
  }

  console.log('\\n> Initializing DBC config...');

  // Check if using existing config
  if (config.dbcConfigAddress) {
    console.log(`> Using existing config: ${config.dbcConfigAddress}`);
    return new PublicKey(config.dbcConfigAddress);
  }

  let curveConfig: ConfigParameters | null = null;

  // Build curve based on mode - pass config directly to SDK
  if (config.dbcConfig.buildCurveMode === 0) {
    curveConfig = buildCurve(config.dbcConfig);
  } else if (config.dbcConfig.buildCurveMode === 1) {
    curveConfig = buildCurveWithMarketCap(config.dbcConfig);
  } else if (config.dbcConfig.buildCurveMode === 2) {
    curveConfig = buildCurveWithTwoSegments(config.dbcConfig);
  } else if (config.dbcConfig.buildCurveMode === 3) {
    curveConfig = buildCurveWithLiquidityWeights(config.dbcConfig);
  } else {
    throw new Error(`Unsupported curve mode`);
  }

  if (!curveConfig) {
    throw new Error('Failed to build curve config');
  }

  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');
  const configKeypair = Keypair.generate();

  console.log(`> Generated config keypair: ${configKeypair.publicKey.toString()}`);

  const createConfigTx = await dbcInstance.partner.createConfig({
    config: configKeypair.publicKey,
    quoteMint,
    feeClaimer: new PublicKey(config.dbcConfig.feeClaimer),
    leftoverReceiver: new PublicKey(config.dbcConfig.leftoverReceiver),
    payer: wallet.publicKey,
    ...curveConfig,
  });

  modifyComputeUnitPriceIx(createConfigTx as any, config.computeUnitPriceMicroLamports);

  if (config.dryRun) {
    console.log(`> Simulating create config tx...`);
    await runSimulateTransaction(connection, [wallet.payer, configKeypair], wallet.publicKey, [
      createConfigTx,
    ]);
    console.log(`> Config simulation successful`);
  } else {
    console.log(`>> Sending create config transaction...`);
    const createConfigTxHash = await sendAndConfirmTransaction(
      connection,
      createConfigTx,
      [wallet.payer, configKeypair],
      {
        commitment: connection.commitment,
        maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
      }
    ).catch((err : unknown) => {
      console.error('Failed to create config:', err);
      throw err;
    });

    console.log(`>>> Config created successfully: ${createConfigTxHash}`);
    console.log(`>>> Config public key: ${configKeypair.publicKey.toString()}`);

    await connection.confirmTransaction(createConfigTxHash, 'finalized');
    console.log(`>>> Config transaction finalized`);
  }

  return configKeypair.publicKey;
}

/**
 * Create a DBC pool
 */
export async function createDbcPool(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet,
  quoteMint: PublicKey,
  baseMint: Keypair
) {
  if (!config.dbcConfig || !config.dbcPool) {
    throw new Error('Missing DBC configuration or pool settings');
  }

  const configPublicKey = await createDbcConfig(config, connection, wallet, quoteMint);
  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');

  if (config.dryRun) {
    console.log(`> Simulating create pool tx...`);
    try {
      const createPoolTx = await dbcInstance.pool.createPool({
        baseMint: baseMint.publicKey,
        config: configPublicKey,
        name: config.dbcPool.name,
        symbol: config.dbcPool.symbol,
        uri: config.dbcPool.uri,
        payer: wallet.publicKey,
        poolCreator: wallet.publicKey,
      });

      modifyComputeUnitPriceIx(createPoolTx as any, config.computeUnitPriceMicroLamports);

      await runSimulateTransaction(connection, [wallet.payer, baseMint], wallet.publicKey, [
        createPoolTx,
      ]);
      console.log(`> Pool simulation successful`);
    } catch (error) {
      console.log(`> Pool simulation failed (expected in dry-run): ${error}`);
    }
  } else {
    console.log(`>> Creating pool transaction...`);
    const createPoolTx = await dbcInstance.pool.createPool({
      baseMint: baseMint.publicKey,
      config: configPublicKey,
      name: config.dbcPool.name,
      symbol: config.dbcPool.symbol,
      uri: config.dbcPool.uri,
      payer: wallet.publicKey,
      poolCreator: wallet.publicKey,
    });

    modifyComputeUnitPriceIx(createPoolTx as any, config.computeUnitPriceMicroLamports);

    console.log(`>> Sending create pool transaction...`);
    const createPoolTxHash = await sendAndConfirmTransaction(
      connection,
      createPoolTx,
      [wallet.payer, baseMint],
      {
        commitment: connection.commitment,
        maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
      }
    ).catch((err : unknown) => {
      console.error('Failed to create pool:', err);
      throw err;
    });

    console.log(`>>> Pool created successfully: ${createPoolTxHash}`);
  }
}

/**
 * Swap on DBC pools (Buy or Sell)
 */
export async function swap(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet
) {
  if (!config.dbcSwap) {
    throw new Error('Missing dbc swap parameters');
  }

  if (!config.baseMint) {
    throw new Error('Missing baseMint configuration');
  }

  console.log('\\n> Initializing DBC swap...');

  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');

  const baseMint = new PublicKey(config.baseMint);
  const poolState = await dbcInstance.state.getPoolByBaseMint(new PublicKey(baseMint));
  if (!poolState) {
    throw new Error(`DBC Pool not found for ${config.baseMint}`);
  }

  const poolAddress = poolState.publicKey;

  const dbcConfigAddress = poolState.account.config;
  const poolConfig = await dbcInstance.state.getPoolConfig(dbcConfigAddress);
  if (!poolConfig) {
    throw new Error(`DBC Pool config not found for ${dbcConfigAddress.toString()}`);
  }

  const quoteMintDecimals = await getQuoteDecimals(connection, poolConfig.quoteMint.toString());
  const amountIn = new BN(config.dbcSwap.amountIn * 10 ** quoteMintDecimals);

  let currentPoint;
  if (poolConfig.activationType === 0) {
    currentPoint = await connection.getSlot();
  } else {
    const currentSlot = await connection.getSlot();
    currentPoint = await connection.getBlockTime(currentSlot);
  }

  if (currentPoint === null) {
    throw new Error('Failed to get current point (block time)');
  }

  const quote = await dbcInstance.pool.swapQuote({
    virtualPool: poolState.account,
    config: poolConfig,
    swapBaseForQuote: config.dbcSwap.swapBaseForQuote,
    amountIn,
    hasReferral: config.dbcSwap.referralTokenAccount !== '',
    currentPoint: new BN(currentPoint),
  });

  const swapTx = await dbcInstance.pool.swap({
    amountIn,
    minimumAmountOut: quote.minimumAmountOut,
    owner: wallet.publicKey,
    pool: poolAddress,
    swapBaseForQuote: config.dbcSwap.swapBaseForQuote,
    referralTokenAccount: config.dbcSwap.referralTokenAccount
      ? new PublicKey(config.dbcSwap.referralTokenAccount)
      : null,
  });

  modifyComputeUnitPriceIx(swapTx, config.computeUnitPriceMicroLamports);

  if (config.dryRun) {
    console.log('> Simulating swap tx...');
    await runSimulateTransaction(connection, [wallet.payer], wallet.publicKey, [swapTx]);
    console.log('> Swap tx simulation successful');
    return;
  }

  try {
    const txHash = await sendAndConfirmTransaction(connection, swapTx, [wallet.payer], {
      commitment: connection.commitment,
      maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
    });

    console.log(`> Swap tx successful with tx hash: ${txHash}`);
  } catch (error) {
    console.error('Failed to swap:', error);
    throw error;
  }
}

/**
 * Claim trading fee from a DBC pool
 */
export async function claimTradingFee(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet
) {
  if (!config.baseMint) {
    throw new Error('Missing baseMint configuration');
  }

  console.log('\\n> Initializing DBC claim trading fee...');

  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');

  const baseMint = new PublicKey(config.baseMint);
  const poolState = await dbcInstance.state.getPoolByBaseMint(baseMint);
  if (!poolState) {
    throw new Error(`DBC Pool not found for ${baseMint.toString()}`);
  }

  const dbcConfigAddress = poolState.account.config;
  const poolConfig = await dbcInstance.state.getPoolConfig(dbcConfigAddress);
  if (!poolConfig) {
    throw new Error(`DBC Pool config not found for ${dbcConfigAddress.toString()}`);
  }

  const poolAddress = poolState.publicKey;
  const creator = poolState.account.creator;
  const partner = poolConfig.feeClaimer;
  const feeMetrics = await dbcInstance.state.getPoolFeeMetrics(poolAddress);

  const isCreator = creator.toString() === wallet.publicKey.toString();
  console.log(`> Is creator: ${isCreator}`);
  const isPartner = partner.toString() === wallet.publicKey.toString();
  console.log(`> Is partner: ${isPartner}`);

  if (!isCreator && !isPartner) {
    console.log('> User is neither the creator nor the launchpad fee claimer');
    return;
  }

  const transactions: Transaction[] = [];

  if (isCreator) {
    const claimCreatorTradingFeeTx = await dbcInstance.creator.claimCreatorTradingFee({
      creator: wallet.publicKey,
      pool: poolAddress,
      maxBaseAmount: feeMetrics.current.creatorBaseFee,
      maxQuoteAmount: feeMetrics.current.creatorQuoteFee,
      payer: wallet.publicKey,
    });
    modifyComputeUnitPriceIx(claimCreatorTradingFeeTx, config.computeUnitPriceMicroLamports);
    transactions.push(claimCreatorTradingFeeTx);
  } else {
    console.log('> This is not the creator of the pool');
  }

  if (isPartner) {
    const claimPartnerTradingFeeTx = await dbcInstance.partner.claimPartnerTradingFee({
      feeClaimer: wallet.publicKey,
      pool: poolAddress,
      maxBaseAmount: feeMetrics.current.partnerBaseFee,
      maxQuoteAmount: feeMetrics.current.partnerQuoteFee,
      payer: wallet.publicKey,
    });
    modifyComputeUnitPriceIx(claimPartnerTradingFeeTx, config.computeUnitPriceMicroLamports);
    transactions.push(claimPartnerTradingFeeTx);
  } else {
    console.log('> This is not the launchpad fee claimer');
  }

  if (transactions.length === 0) {
    console.log('> No trading fees to claim');
    return;
  }

  if (config.dryRun) {
    console.log('> Simulating claim trading fee tx...');
    await runSimulateTransaction(connection, [wallet.payer], wallet.publicKey, transactions);
    console.log('> Claim trading fee simulation successful');
    return;
  }

  try {
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      if (!transaction) {
        throw new Error(`Transaction at index ${i} is undefined`);
      }
      const txType = i === 0 && isCreator ? 'creator' : 'partner';

      console.log(`> Sending ${txType} trading fee claim transaction...`);

      const txHash = await sendAndConfirmTransaction(connection, transaction, [wallet.payer], {
        commitment: connection.commitment,
        maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
      });

      console.log(`> ${txType} trading fee claimed successfully with tx hash: ${txHash}`);
    }
  } catch (error) {
    console.error('Failed to claim trading fee:', error);
    throw error;
  }
}
