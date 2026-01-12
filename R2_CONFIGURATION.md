# R2 Storage Configuration Guide

## Required Environment Variables

For QR codes and file uploads to work properly in production, you MUST configure the following R2 environment variables:

### Required Variables:
```env
R2_BUCKET_NAME=your-bucket-name
R2_ACCESS_KEY_ID=your-access-key-id
R2_SECRET_ACCESS_KEY=your-secret-access-key
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_REGION=auto
```

### Optional (but recommended):
```env
NEXT_PUBLIC_R2_PUBLIC_URL=https://your-public-domain.com
```

## How to Get `NEXT_PUBLIC_R2_PUBLIC_URL`

This is **OPTIONAL** but recommended for better performance. You have 3 options:

### Option 1: Custom Domain (Recommended for Production)
If you've set up a custom domain for your R2 bucket:
1. Go to Cloudflare Dashboard → R2 → Your Bucket → Settings → Public Access
2. If you have a custom domain configured, use that URL
3. Example: `https://cdn.yourdomain.com` or `https://assets.yourdomain.com`

**To set up a custom domain:**
1. Go to R2 → Your Bucket → Settings → Public Access
2. Click "Connect Domain"
3. Follow the instructions to connect your domain
4. Use the connected domain URL as `NEXT_PUBLIC_R2_PUBLIC_URL`

### Option 2: R2 Public URL (If Public Access Enabled)
If your bucket has public access enabled:
1. Go to Cloudflare Dashboard → R2 → Your Bucket → Settings → Public Access
2. If public access is enabled, you'll see a public URL like:
   `https://pub-xxxxx.r2.dev` or `https://your-bucket-name.r2.dev`
3. Use this URL as `NEXT_PUBLIC_R2_PUBLIC_URL`

**Note:** Public access means anyone with the URL can access files. Only enable if you want public access.

### Option 3: Leave It Empty (Uses Signed URLs)
**You can leave this empty!** If you don't set `NEXT_PUBLIC_R2_PUBLIC_URL`:
- The system will automatically use **signed URLs** (more secure)
- Signed URLs expire after 1 hour and are generated on-demand
- This is the default behavior and works perfectly fine

**Recommendation:**
- **Production with custom domain**: Use Option 1 (best performance)
- **Production without custom domain**: Use Option 3 (leave empty, uses signed URLs - more secure)
- **Development**: Leave empty or use Option 2 if you enable public access

## CORS Configuration

**IMPORTANT**: You MUST configure CORS on your R2 bucket to allow image downloads and display.

### Steps to Configure CORS:

1. Go to Cloudflare Dashboard → R2 → Your Bucket → Settings → CORS Policy
2. Add the following CORS configuration:

```json
[
  {
    "AllowedOrigins": [
      "https://your-production-domain.com",
      "https://*.devtunnels.ms",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

**Replace `your-production-domain.com` with your actual production domain.**

## Current Behavior

### Production:
- ✅ **QR codes are ONLY saved to R2** (no local saves)
- ✅ Fails with clear error if R2 is not configured
- ✅ Uses signed URLs for secure access

### Development:
- ✅ Tries R2 first if configured
- ⚠️ Falls back to local storage (`public/qr-codes/`) only if R2 is NOT configured
- ⚠️ If R2 is configured but fails, it will error (no local fallback)

## Troubleshooting

### Issue: "Failed to download QR code: Failed to fetch"
**Solution**: Configure CORS on your R2 bucket (see above)

### Issue: "R2 storage unavailable"
**Solution**: Check that all R2 environment variables are set correctly

### Issue: "CORS policy error"
**Solution**: Add your domain to the CORS policy in R2 bucket settings

### Issue: Images not displaying
**Solution**: 
1. Check CORS configuration
2. Verify `NEXT_PUBLIC_R2_PUBLIC_URL` is set (optional but recommended)
3. Check browser console for specific errors

## Testing R2 Configuration

To verify R2 is working:
1. Check that `isStorageConfigured()` returns `true`
2. Try generating a QR code
3. Check that it's saved to R2 (not local)
4. Verify images display correctly
5. Test downloads work

## Notes

- In production, **NO files are saved locally** - everything goes to R2
- Signed URLs are used for secure access (expire after 1 hour)
- If `NEXT_PUBLIC_R2_PUBLIC_URL` is set, public URLs are constructed
- Otherwise, signed URLs are fetched on-demand

