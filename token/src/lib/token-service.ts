/**
 * SPL Token Service
 * 
 * This service handles all SPL token operations including:
 * - Token mint creation
 * - Authority management
 * - Supply control
 * 
 * Note: This is a demonstration implementation. In production,
 * you would need to handle proper error cases, validation,
 * and integrate with your actual Solana client.
 */

import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  burn,
  getMint,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createSetAuthorityInstruction,
  AuthorityType,
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

export interface TokenMintParams {
  connection: Connection
  payer: PublicKey // Changed from Keypair to PublicKey - user's wallet
  mintAuthority: PublicKey
  freezeAuthority?: PublicKey
  decimals: number
  tokenName: string
  tokenSymbol: string
  totalSupply: number
  teamMultisigPDA?: PublicKey
  mintKeypair: Keypair // New parameter for the mint account keypair
}

export interface TokenMintResult {
  mint: PublicKey
  mintAccount: PublicKey
  transaction: Transaction
  mintKeypair: Keypair
  mintRent: number
}

export interface BurnAuthorityParams {
  connection: Connection
  payer: PublicKey // Changed from Keypair to PublicKey - user's wallet
  mint: PublicKey
  currentAuthority: PublicKey // Changed from Keypair to PublicKey - user's wallet
}

export interface AssignTeamMultisigParams {
  connection: Connection
  payer: PublicKey // Changed from Keypair to PublicKey - user's wallet
  mint: PublicKey
  currentAuthority: PublicKey // Changed from Keypair to PublicKey - user's wallet
  teamMultisigPDA: PublicKey
}

export interface BurnAuthorityResult {
  transaction: Transaction
  currentAuthority: PublicKey
}

export interface AssignTeamMultisigResult {
  transaction: Transaction
  currentAuthority: PublicKey
}

export class TokenService {
  private static readonly MINT_FEE_LAMPORTS = 0.002 * LAMPORTS_PER_SOL // 0.002 SOL fee

  /**
   * Creates a new SPL token with proper authority management
   */
  static async createToken(params: TokenMintParams): Promise<TokenMintResult> {
    const { connection, payer, mintAuthority, freezeAuthority, decimals, totalSupply, teamMultisigPDA, mintKeypair } = params

    try {
      // Check if payer has sufficient balance for mint fee
      const payerBalance = await connection.getBalance(payer)
      if (payerBalance < this.MINT_FEE_LAMPORTS) {
        throw new Error(`Insufficient balance. Required: ${this.MINT_FEE_LAMPORTS / LAMPORTS_PER_SOL} SOL`)
      }

      // Use the provided mint keypair for the mint account
      const mint = mintKeypair
      
      // Calculate rent for mint account
      const mintRent = await connection.getMinimumBalanceForRentExemption(82) // Size of mint account
      
      // Create mint account instruction
      const createMintAccountIx = SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mint.publicKey,
        space: 82,
        lamports: mintRent,
        programId: TOKEN_PROGRAM_ID,
      })

      // Initialize mint instruction - create manually to avoid type issues
      const initializeMintIx = {
        programId: TOKEN_PROGRAM_ID,
        keys: [
          { pubkey: mint.publicKey, isSigner: false, isWritable: true },
          { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        ],
        data: Buffer.from([
          0, // InitializeMint instruction
          decimals,
          ...mintAuthority.toBytes(),
          ...(freezeAuthority ? freezeAuthority.toBytes() : new Uint8Array(32)),
        ]),
      }

      // Create transaction
      const transaction = new Transaction()
      transaction.add(createMintAccountIx, initializeMintIx)

      console.log('TokenService: Transaction created with instructions:', transaction.instructions.length)
      console.log('TokenService: First instruction:', transaction.instructions[0])
      console.log('TokenService: Second instruction:', transaction.instructions[1])

      // Get recent blockhash and set it on the transaction
      let blockhash: string
      try {
        const blockhashResult = await connection.getLatestBlockhash()
        blockhash = blockhashResult.blockhash
        console.log('TokenService: Got blockhash:', blockhash)
      } catch (error) {
        console.error('TokenService: Failed to get blockhash:', error)
        throw new Error(`Failed to get recent blockhash: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      transaction.recentBlockhash = blockhash
      transaction.feePayer = payer

      // Debug: Log transaction details
      console.log('TokenService: Transaction created with blockhash:', blockhash)
      console.log('TokenService: Transaction feePayer:', payer.toString())
      console.log('TokenService: Transaction has recentBlockhash:', !!transaction.recentBlockhash)

      // Validate transaction before returning
      if (!transaction.recentBlockhash) {
        throw new Error('Transaction missing recent blockhash after setting')
      }
      if (!transaction.feePayer) {
        throw new Error('Transaction missing fee payer after setting')
      }

      // Note: This will need to be signed by the user's wallet, not sent directly
      // The transaction should be returned for the user to sign
      return {
        mint: mint.publicKey,
        mintAccount: mint.publicKey,
        transaction,
        mintKeypair: mint,
        mintRent,
      }
    } catch (error) {
      console.error('Error creating token:', error)
      throw new Error(`Failed to create token: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets information about a token mint
   */
  static async getTokenInfo(connection: Connection, mint: PublicKey) {
    try {
      const mintInfo = await getMint(connection, mint)
      return mintInfo
    } catch (error) {
      console.error('Error getting token info:', error)
      throw new Error(`Failed to get token info: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Burns the mint authority, making the token supply fixed
   */
  static async burnMintAuthority(params: BurnAuthorityParams): Promise<BurnAuthorityResult> {
    const { connection, payer, mint, currentAuthority } = params

    try {
      // Verify current authority
      const mintInfo = await getMint(connection, mint)
      if (!mintInfo.mintAuthority?.equals(currentAuthority)) {
        throw new Error('Current wallet is not the mint authority')
      }

      // Create set authority instruction to disable mint authority
      const setAuthorityIx = createSetAuthorityInstruction(
        mint,
        currentAuthority,
        AuthorityType.MintTokens,
        null // Set to null to disable
      )

      const transaction = new Transaction()
      transaction.add(setAuthorityIx)

      // Get recent blockhash and set it on the transaction
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = payer

      // Note: This transaction will need to be signed by the user's wallet
      // Return the transaction for the user to sign
      return {
        transaction,
        currentAuthority,
      }
    } catch (error) {
      console.error('Error burning mint authority:', error)
      throw new Error(`Failed to burn mint authority: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Assigns mint authority to a team multisig PDA
   */
  static async assignTeamMultisig(params: AssignTeamMultisigParams): Promise<AssignTeamMultisigResult> {
    const { connection, payer, mint, currentAuthority, teamMultisigPDA } = params

    try {
      // Verify current authority
      const mintInfo = await getMint(connection, mint)
      if (!mintInfo.mintAuthority?.equals(currentAuthority)) {
        throw new Error('Current wallet is not the mint authority')
      }

      // Create set authority instruction to transfer to team multisig
      const setAuthorityIx = createSetAuthorityInstruction(
        mint,
        currentAuthority,
        AuthorityType.MintTokens,
        teamMultisigPDA
      )

      const transaction = new Transaction()
      transaction.add(setAuthorityIx)

      // Get recent blockhash and set it on the transaction
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash
      transaction.feePayer = payer

      // Note: This transaction will need to be signed by the user's wallet
      // Return the transaction for the user to sign
      return {
        transaction,
        currentAuthority,
      }
    } catch (error) {
      console.error('Error assigning team multisig:', error)
      throw new Error(`Failed to assign team multisig: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Gets the mint fee in SOL
   */
  static getMintFee(): number {
    return this.MINT_FEE_LAMPORTS / LAMPORTS_PER_SOL
  }
}
