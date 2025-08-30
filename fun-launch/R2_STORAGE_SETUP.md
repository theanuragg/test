# 🗄️ **R2 Storage Setup Guide**

## 📋 **Overview**

This guide will help you set up and configure Cloudflare R2 storage for your Meteora DBC launchpad. R2 is used to store:
- **Token Images**: Logo files for tokens
- **Token Metadata**: JSON metadata files for on-chain metadata
- **Public Access**: Files accessible via public URLs for blockchain metadata

## 🔧 **Step 1: Cloudflare R2 Setup**

### **1.1 Create R2 Bucket**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Click **Create bucket**
4. Name your bucket (e.g., `fun-launch-storage`)
5. Choose your preferred region
6. Click **Create bucket**

### **1.2 Create API Token**
1. In Cloudflare Dashboard, go to **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use **Custom token** template
4. Set permissions:
   - **Account** → **Cloudflare R2** → **Edit**
   - **Zone** → **Zone** → **Edit** (if using custom domain)
5. Set **Account Resources** to your account
6. Set **Zone Resources** to your domain (if applicable)
7. Click **Continue to summary** → **Create Token**

### **1.3 Enable Public Access**
1. Go to your R2 bucket
2. Click **Settings** → **Public URL**
3. Enable **Public URL**
4. Note the public URL (e.g., `https://pub-xxxxxxxx.r2.dev`)

## 🔑 **Step 2: Environment Variables**

Add these environment variables to your `.env.local` file:

```bash
# R2 Storage Configuration
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_BUCKET=your_bucket_name
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev

# Other required variables
RPC_URL=https://api.devnet.solana.com
POOL_CONFIG_KEY=your_pool_config_key
```

### **How to Find These Values:**

#### **R2_ACCESS_KEY_ID & R2_SECRET_ACCESS_KEY**
1. Go to **R2 Object Storage** → **Manage R2 API tokens**
2. Click **Create API token**
3. Choose **Custom token**
4. Set permissions for your bucket
5. Copy the **Access Key ID** and **Secret Access Key**

#### **R2_ACCOUNT_ID**
1. In Cloudflare Dashboard, look at the URL
2. It will be: `https://dash.cloudflare.com/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. The long string is your Account ID

#### **R2_BUCKET**
- The name you gave your bucket (e.g., `fun-launch-storage`)

#### **R2_PUBLIC_URL**
- The public URL from step 1.3 (e.g., `https://pub-xxxxxxxx.r2.dev`)

## 🧪 **Step 3: Test R2 Configuration**

### **3.1 Test Configuration**
```bash
# Test your R2 configuration
curl http://localhost:3000/api/r2-test
```

**Expected Response:**
```json
{
  "success": true,
  "config": {
    "hasAccessKey": true,
    "hasSecretKey": true,
    "hasAccountId": true,
    "hasBucket": true,
    "hasPublicUrl": true
  },
  "connection": {
    "canConnect": true,
    "canListBuckets": true,
    "canAccessBucket": true
  },
  "publicAccess": {
    "publicUrl": "https://pub-xxxxxxxx.r2.dev",
    "isConfigured": true
  },
  "errors": []
}
```

### **3.2 Test Upload & Public Access**
```bash
# Test uploading files and public access
curl -X POST http://localhost:3000/api/r2-upload-test
```

**Expected Response:**
```json
{
  "success": true,
  "testFile": {
    "fileName": "test/test-image-1234567890.png",
    "uploadedUrl": "https://pub-xxxxxxxx.r2.dev/test/test-image-1234567890.png",
    "publicUrl": "https://pub-xxxxxxxx.r2.dev/test/test-image-1234567890.png",
    "isAccessible": true
  },
  "metadata": {
    "fileName": "test/test-metadata-1234567890.json",
    "uploadedUrl": "https://pub-xxxxxxxx.r2.dev/test/test-metadata-1234567890.json",
    "publicUrl": "https://pub-xxxxxxxx.r2.dev/test/test-metadata-1234567890.json",
    "isAccessible": true
  },
  "errors": []
}
```

## 📁 **Step 4: File Structure**

Your R2 bucket will have this structure:

```
your-bucket/
├── tokens/
│   ├── [mint-address].png
│   ├── [mint-address].jpg
│   └── [mint-address].svg
├── metadata/
│   ├── [mint-address].json
│   └── [mint-address].json
└── test/
    ├── test-image-[timestamp].png
    └── test-metadata-[timestamp].json
```

### **File Types:**
- **Images**: PNG, JPG, SVG (max 2MB)
- **Metadata**: JSON files with token metadata
- **Public Access**: All files are publicly readable

## 🚀 **Step 5: Integration with Token Creation**

### **5.1 Token Creation Flow**
When you create a token, the system will:

1. **Upload Image**: Convert base64 to file and upload to `tokens/[mint].png`
2. **Create Metadata**: Generate JSON metadata and upload to `metadata/[mint].json`
3. **Create Pool**: Use the metadata URL in the DBC pool creation
4. **Verify Access**: Ensure files are publicly accessible

### **5.2 Example Metadata Structure**
```json
{
  "name": "My Token",
  "symbol": "MTK",
  "description": "A token created on Meteora DBC",
  "image": "https://pub-xxxxxxxx.r2.dev/tokens/ABC123.png",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "DBC Token"
    },
    {
      "trait_type": "Launchpad",
      "value": "Meteora DBC"
    }
  ]
}
```

## 🔍 **Step 6: Troubleshooting**

### **Common Issues:**

#### **1. "Missing R2 environment variables"**
- Check that all environment variables are set in `.env.local`
- Restart your development server after adding variables

#### **2. "Cannot access bucket"**
- Verify your API token has the correct permissions
- Check that the bucket name is correct
- Ensure the bucket exists in your account

#### **3. "Files not publicly accessible"**
- Verify public access is enabled in R2 bucket settings
- Check that the public URL is correct
- Ensure files are uploaded with `ACL: 'public-read'`

#### **4. "Upload failed"**
- Check file size (max 2MB for images)
- Verify file format (PNG, JPG, SVG for images)
- Check network connectivity

### **Debug Commands:**
```bash
# Check environment variables
echo $R2_ACCESS_KEY_ID
echo $R2_BUCKET
echo $R2_PUBLIC_URL

# Test R2 connection
curl http://localhost:3000/api/r2-test

# Test upload functionality
curl -X POST http://localhost:3000/api/r2-upload-test

# Check specific file access
curl https://pub-xxxxxxxx.r2.dev/test/test-image-1234567890.png
```

## ✅ **Step 7: Verification Checklist**

- [ ] R2 bucket created and accessible
- [ ] API token created with correct permissions
- [ ] Public access enabled
- [ ] Environment variables configured
- [ ] Configuration test passes
- [ ] Upload test passes
- [ ] Public access test passes
- [ ] Token creation works with R2 integration

## 🎉 **Success!**

Once all tests pass, your R2 storage is properly configured and ready for:
- ✅ **Token image uploads**
- ✅ **Metadata file storage**
- ✅ **Public access for blockchain metadata**
- ✅ **Automatic integration with token creation**

Your launchpad will now store all token assets in R2 with proper public access for blockchain metadata! 🚀
