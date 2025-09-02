// Mock RPC Connection for Development
// Used when all real RPC endpoints are unavailable

import { Connection, PublicKey, AccountInfo, Context, Commitment } from '@solana/web3.js';

class MockConnection extends Connection {
  private mockSlot = 250000000;
  private mockBlockTime = Math.floor(Date.now() / 1000);
  
  constructor() {
    super('mock://localhost');
    console.log('🔧 Using Mock RPC Connection for development');
  }

  async getSlot(commitment?: Commitment): Promise<number> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    this.mockSlot += 1;
    return this.mockSlot;
  }

  async getBlockTime(slot: number): Promise<number | null> {
    await new Promise(resolve => setTimeout(resolve, 30));
    this.mockBlockTime += 1;
    return this.mockBlockTime;
  }

  async getAccountInfo(
    publicKey: PublicKey,
    commitment?: Commitment,
    encoding?: any
  ): Promise<AccountInfo<Buffer> | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return mock account data
    return {
      lamports: 1000000000, // 1 SOL
      owner: new PublicKey('11111111111111111111111111111111'),
      executable: false,
      rentEpoch: 0,
      data: Buffer.from('mock data'),
    };
  }

  async getBalance(
    publicKey: PublicKey,
    commitment?: Commitment
  ): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 80));
    return 1000000000; // 1 SOL
  }

  async getRecentBlockhash(commitment?: Commitment): Promise<{
    blockhash: string;
    feeCalculator: any;
  }> {
    await new Promise(resolve => setTimeout(resolve, 60));
    return {
      blockhash: 'mock-blockhash-' + Date.now(),
      feeCalculator: { lamportsPerSignature: 5000 }
    };
  }

  async getVersion(): Promise<{ 'solana-core': string }> {
    await new Promise(resolve => setTimeout(resolve, 40));
    return { 'solana-core': '1.17.0-mock' };
  }

  // Mock subscription methods
  onAccountChange(
    publicKey: PublicKey,
    callback: (accountInfo: AccountInfo<Buffer>, context: Context) => void,
    commitment?: Commitment
  ): number {
    console.log('🔧 Mock account subscription created');
    
    // Simulate periodic updates
    const interval = setInterval(() => {
      callback({
        lamports: 1000000000 + Math.floor(Math.random() * 1000000),
        owner: new PublicKey('11111111111111111111111111111111'),
        executable: false,
        rentEpoch: 0,
        data: Buffer.from('mock data ' + Date.now()),
      }, { slot: this.mockSlot });
    }, 5000);
    
    return interval as any;
  }

  removeAccountChangeListener(subscriptionId: number): void {
    console.log('🔧 Mock account subscription removed');
    clearInterval(subscriptionId as any);
  }
}

export function createMockConnection(): Connection {
  return new MockConnection();
}

export function isMockConnection(connection: Connection): boolean {
  return connection instanceof MockConnection;
}
