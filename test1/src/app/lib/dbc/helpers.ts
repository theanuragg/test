import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';

export function modifyComputeUnitPriceIx(
  transaction: Transaction | TransactionInstruction,
  computeUnitPriceMicroLamports: number
): void {
  if (transaction instanceof Transaction) {
    // For Transaction objects, modify the first instruction
    if (transaction.instructions.length > 0) {
      const firstIx = transaction.instructions[0];
      if (firstIx.programId.toString() === 'ComputeBudget111111111111111111111111111111') {
        // Already has compute budget instruction, modify it
        const data = firstIx.data;
        if (data.length >= 8) {
          const newData = Buffer.alloc(8);
          newData.writeBigUInt64LE(BigInt(computeUnitPriceMicroLamports), 0);
          firstIx.data = Buffer.concat([Buffer.from([0]), newData]);
        }
      }
    }
  }
}

export async function runSimulateTransaction(
  connection: Connection,
  signers: any[],
  feePayer: PublicKey,
  transactions: (Transaction | TransactionInstruction)[]
): Promise<void> {
  try {
    for (const tx of transactions) {
      if (tx instanceof Transaction) {
        const simulation = await connection.simulateTransaction(tx, signers);
        if (simulation.value.err) {
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
      }
    }
  } catch (error) {
    console.error('Transaction simulation failed:', error);
    throw error;
  }
}
