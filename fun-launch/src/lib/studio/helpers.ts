import { Transaction, ComputeBudgetProgram } from '@solana/web3.js';

/**
 * Local Helper Functions for Fun-Launch Studio Integration
 * 
 * These functions mirror the studio's helper functions but are defined locally
 * to avoid external dependencies.
 */

export const DEFAULT_SEND_TX_MAX_RETRIES = 3;

/**
 * Modify compute unit price instruction
 */
export function modifyComputeUnitPriceIx(transaction: Transaction, computeUnitPriceMicroLamports: number): void {
  const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: computeUnitPriceMicroLamports,
  });
  
  transaction.instructions.unshift(modifyComputeUnits);
}

/**
 * Run transaction simulation
 */
export async function runSimulateTransaction(
  connection: any,
  signers: any[],
  feePayer: any,
  transactions: Transaction[]
): Promise<void> {
  try {
    for (const transaction of transactions) {
      const simulation = await connection.simulateTransaction(transaction, signers);
      
      if (simulation.value.err) {
        throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
      }
    }
  } catch (error) {
    console.error('Transaction simulation error:', error);
    throw error;
  }
}
