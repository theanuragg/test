# R2 Storage Setup for Token Images

## 🚨 Current Issue
Your token images are not loading from R2 storage because the `R2_PUBLIC_URL` environment variable is not configured.

## 🔧 How to Fix

### Step 1: Create Environment File
Create a `.env.local` file in your project root (`fun-launch/` folder):

```bash
# R2 Storage Configuration
R2_PUBLIC_URL=https://your-r2-bucket.your-subdomain.r2.cloud

# Example R2 URLs:
# R2_PUBLIC_URL=https://pub-e61cbea30313478d9215c834fd091bd3.r2.dev
# R2_PUBLIC_URL=https://your-bucket.your-domain.com
# R2_PUBLIC_URL=https://your-custom-domain.com

# Solana Configuration
RPC_URL=https://api.devnet.solana.com

# Other Configuration
NODE_ENV=development
```

### Step 2: Get Your R2 Public URL
1. **Go to Cloudflare Dashboard** → R2 Object Storage
2. **Select your bucket** (e.g., `token-images`)
3. **Go to Settings** → Public Access
4. **Copy the Public URL** (e.g., `https://pub-xxx.r2.dev`)

### Step 3: Verify R2 Structure
Your R2 bucket should have this structure:
```
bucket/
├── tokens/
│   ├── CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T.png
│   ├── CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T.jpg
│   └── other-token-mint.png
└── metadata/
    └── CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T.json
```

### Step 4: Test R2 Access
Test if your R2 URL is accessible:
```bash
# Test with curl
curl -I "https://your-r2-url.r2.dev/tokens/CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T.png"

# Should return 200 OK if image exists
```

## 🎯 Expected Results

After setting up R2 correctly, you should see:
```
🔧 Configuration:
  - RPC_URL: https://api.devnet.solana.com
  - R2_PUBLIC_URL: https://your-r2-url.r2.dev
  - Environment: development

🔍 Checking R2 storage for token: CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T
🔗 R2 base URL: https://your-r2-url.r2.dev
🔍 Checking format: png at https://your-r2-url.r2.dev/tokens/CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T.png
🖼️ Found R2 image for CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T: https://your-r2-url.r2.dev/tokens/CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T.png
```

## 🚀 Alternative Solutions

### Option 1: Use Existing R2 URL
If you already have an R2 bucket, just add the URL to `.env.local`:
```bash
R2_PUBLIC_URL=https://pub-e61cbea30313478d9215c834fd091bd3.r2.dev
```

### Option 2: Create New R2 Bucket
1. **Cloudflare Dashboard** → R2 Object Storage
2. **Create Bucket** (e.g., `fun-launch-tokens`)
3. **Enable Public Access**
4. **Upload token images** with mint addresses as filenames

### Option 3: Use Different Storage
You can modify the code to use:
- **IPFS** (decentralized)
- **Arweave** (permanent storage)
- **AWS S3** (if you prefer)
- **Local storage** (for development)

## 🔍 Debugging

### Check Environment Variables
```bash
# In your terminal
echo $R2_PUBLIC_URL

# Or check in Next.js
console.log('R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL);
```

### Check R2 Bucket Access
```bash
# Test if bucket is public
curl -I "https://your-r2-url.r2.dev/"

# Test if specific image exists
curl -I "https://your-r2-url.r2.dev/tokens/CJbp2dhnaUwBxgx9BpbcyvBfPHfgzrjhAnSBGvRPS47T.png"
```

### Check Network Tab
In browser DevTools → Network tab, look for:
- Failed requests to R2 URLs
- 403/404 errors
- CORS issues

## 📝 Next Steps

1. **Set R2_PUBLIC_URL** in `.env.local`
2. **Restart your Next.js server**
3. **Test with a token that has an image in R2**
4. **Check the logs** for successful R2 image loading

## 🆘 Still Having Issues?

If R2 still doesn't work after setup:
1. **Check Cloudflare R2 permissions**
2. **Verify bucket is public**
3. **Check CORS settings**
4. **Test with a simple image first**
5. **Check network connectivity to R2**
