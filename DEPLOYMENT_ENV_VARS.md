# Required Environment Variables for Deployment

## Critical (Required for Build)

These environment variables **must** be set in your deployment platform (Vercel, etc.) for the build to succeed:

### 1. `BETTER_AUTH_SECRET`
- **Purpose**: Secret key for Better Auth session encryption
- **Generate**: `openssl rand -base64 32`
- **Required**: ✅ Yes (build will fail without it)

### 2. `ENCRYPTION_KEY`
- **Purpose**: Secret key for encrypting sensitive data (credentials, API keys)
- **Generate**: `openssl rand -base64 32`
- **Required**: ✅ Yes (build will fail without it)

### 3. `DATABASE_URL`
- **Purpose**: PostgreSQL connection string
- **Format**: `postgresql://user:password@host:port/database?sslmode=require`
- **Required**: ✅ Yes (app won't work without it)

## Optional (Warnings Only)

These will cause warnings but won't break the build:

### `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`
- **Purpose**: Google OAuth authentication
- **Required**: ❌ No (only if you want Google sign-in)
- **Note**: If not set, Google OAuth will be disabled

### `SENTRY_AUTH_TOKEN`
- **Purpose**: Sentry source map upload
- **Required**: ❌ No (only if you want Sentry monitoring)

## How to Set in Vercel

1. Go to your project settings
2. Navigate to **Environment Variables**
3. Add each variable:
   - `BETTER_AUTH_SECRET` = (generate with `openssl rand -base64 32`)
   - `ENCRYPTION_KEY` = (generate with `openssl rand -base64 32`)
   - `DATABASE_URL` = (your PostgreSQL connection string)
   - `BETTER_AUTH_URL` = `https://yourdomain.com` (or your Vercel URL)
   - `NEXT_PUBLIC_APP_URL` = `https://yourdomain.com` (or your Vercel URL)

4. **Important**: After adding variables, redeploy your application

## Generate Secrets

```bash
# Generate BETTER_AUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -base64 32
```

**Note**: Use different values for each secret! Never reuse the same secret for multiple purposes.

