# Solana Token & LP Pool Management Platform

A comprehensive platform for creating and managing SPL tokens and liquidity pools on Solana using Meteora DLMM/DBC Dammv2.

## Features

### 🪙 SPL Token Creation
- Create new SPL tokens with customizable parameters
- Advanced authority management (mint authority, freeze authority)
- Team multisig support
- Metadata support (name, symbol, description, logo, social links)
- Authority burning for fixed supply tokens

### 🏊‍♂️ LP Pool Creation (Meteora Integration)
- **DLMM (Dynamic Liquidity Market Maker)**: Concentrated liquidity with customizable fee tiers
- **DBC (Dynamic Bonding Curve)**: Flexible pricing with dynamic bonding curves
- **Anti-Sniper Protection**: Configurable delays to prevent price manipulation
- **Pool Configuration PDA**: Secure storage of pool parameters on-chain
- **Pool Creation Fee**: 0.2 SOL fee for pool creation

## Architecture

### Core Services

#### TokenService
- Handles SPL token creation and management
- Authority management (burn, transfer)
- Token metadata handling

#### MeteoraService
- LP Pool creation using Meteora SDK
- DLMM and DBC pool types
- Anti-sniper protection implementation
- Pool configuration storage in PDAs

### Key Components

#### useTokenMinting Hook
- Manages token creation state
- Handles wallet transactions
- Form validation and error handling

#### useLPPoolCreation Hook
- Manages LP pool creation state
- Meteora integration
- Anti-sniper configuration

#### LPPoolCreationForm
- Comprehensive form for pool creation
- Real-time validation
- Success/error handling

## Technical Implementation

### Anti-Sniper Protection
The platform implements sophisticated anti-sniper measures:

1. **Configurable Delay**: Set protection delay (60s - 3600s)
2. **Large Trade Prevention**: Block significant liquidity movements during protection period
3. **Price Stabilization**: Allow pool to establish stable price before major trades
4. **Curve Setup**: Deter sniper attacks through intelligent curve configuration

### Pool Configuration PDA
- **Seed**: `pool-config`
- **Data**: Pool parameters, anti-sniper settings, creation timestamp
- **Security**: Immutable once created

### Meteora Integration
- **DLMM Program ID**: `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`
- **DBC Program ID**: `DBCWUzVwWpooYotSioeJhU4nqM4xykstTZr6aooTs8U3`
- **SDK Integration**: Direct calls to Meteora SDK for pool creation

## Usage

### Creating Tokens
1. Navigate to `/token`
2. Fill in token details (name, symbol, decimals, supply)
3. Configure authority settings
4. Submit transaction
5. Wallet popup will appear for signing

### Creating LP Pools
1. Navigate to `/lp-pool`
2. Select pool type (DLMM or DBC)
3. Configure token pairs and amounts
4. Set fee rate and tick spacing
5. Enable anti-sniper protection
6. Submit pool creation transaction

## Configuration

### Pool Creation Parameters
- **Base/Quote Mints**: Token addresses for the trading pair
- **Decimals**: Token decimal precision (0-9)
- **Liquidity Amounts**: Initial liquidity provision
- **Fee Rate**: Trading fee in basis points (0-10000)
- **Tick Spacing**: Price precision vs. gas cost trade-off
- **Anti-Sniper**: Protection delay configuration

### Network Support
- **Devnet**: For testing and development
- **Mainnet**: Production deployment
- **Cluster Selection**: Dynamic endpoint switching

## Security Features

### Wallet Integration
- Secure transaction signing
- No private key exposure
- Multi-wallet support (Phantom, Solflare, Backpack, Brave)

### Transaction Validation
- Pre-flight checks
- Balance verification
- Parameter validation
- Error handling

### Anti-Sniper Measures
- Configurable protection delays
- Large trade restrictions
- Price manipulation prevention
- Curve-based attack deterrence

## Development

### Prerequisites
- Node.js 18+
- Solana CLI tools
- Wallet with devnet SOL

### Installation
```bash
npm install
npm run dev
```

### Environment Setup
- Configure Solana cluster endpoints
- Set up wallet adapters
- Configure Meteora program IDs

### Testing
```bash
npm run test
npm run build
```

## Dependencies

### Core
- `@solana/web3.js`: Solana blockchain interaction
- `@solana/spl-token`: SPL token operations
- `@solana/wallet-adapter-react`: Wallet integration

### UI
- `next.js`: React framework
- `tailwindcss`: Styling
- `lucide-react`: Icons

### Meteora
- Meteora DLMM SDK
- Meteora DBC SDK
- Pool creation instructions

## Roadmap

### Phase 1 ✅
- [x] SPL token creation
- [x] Basic authority management
- [x] Token metadata support

### Phase 2 ✅
- [x] LP Pool creation (DLMM/DBC)
- [x] Anti-sniper protection
- [x] Pool configuration PDAs

### Phase 3 🚧
- [ ] Pool management dashboard
- [ ] Liquidity provision interface
- [ ] Trading interface
- [ ] Analytics and charts

### Phase 4 📋
- [ ] Advanced pool strategies
- [ ] Yield farming integration
- [ ] Cross-chain bridges
- [ ] Mobile app

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: [GitHub Wiki](https://github.com/your-repo/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Community Server](https://discord.gg/your-server)

## Acknowledgments

- **Solana Labs**: Blockchain infrastructure
- **Meteora**: LP Pool protocols
- **SPL Token Program**: Token standards
- **Wallet Adapter**: Wallet integration
