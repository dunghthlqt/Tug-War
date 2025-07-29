# 🚀 Deployment Guide

## 📋 Pre-deployment Checklist

### 1. Environment Variables
- [ ] Get Multisynq API key from https://multisynq.com
- [ ] Create `.env` file with your API key
- [ ] Test locally with `npm run dev`

### 2. Build Test
```bash
npm run check-build
npm run build
npm run preview
```

### 3. Git Preparation
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

## 🌐 Vercel Deployment

### Step 1: Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository

### Step 2: Configure Environment Variables
In Vercel dashboard, go to Settings > Environment Variables:

```
Name: VITE_MULTISYNQ_API_KEY
Value: your_multisynq_api_key_here
Environment: Production, Preview, Development
```

### Step 3: Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Test your deployed app

## 🔧 Configuration Files

### vercel.json
- Handles SPA routing for React Router
- Sets security headers
- Configures build settings

### vite.config.ts
- Optimized for production builds
- Code splitting for better performance
- Terser minification

### Environment Variables
- `VITE_MULTISYNQ_API_KEY`: Your Multisynq API key
- `VITE_MONAD_RPC_URL`: Monad RPC URL (optional)
- `VITE_CONTRACT_ADDRESS`: Contract address (optional)
- `VITE_CHAIN_ID`: Chain ID (optional)

## 🐛 Troubleshooting

### Build Failures
1. Check environment variables are set
2. Verify all dependencies are installed
3. Check TypeScript errors: `npm run type-check`

### Runtime Issues
1. Check browser console for errors
2. Verify Multisynq API key is correct
3. Test wallet connection and network switching

### Performance Issues
1. Check bundle size in Vercel analytics
2. Optimize images and assets
3. Consider code splitting for large dependencies

## 📊 Monitoring

### Vercel Analytics
- Page views and performance
- Error tracking
- User behavior

### Blockchain Monitoring
- Contract events
- Transaction success rates
- Gas usage optimization

## 🔄 Updates

### Code Updates
1. Make changes locally
2. Test with `npm run dev`
3. Build test: `npm run build`
4. Push to GitHub
5. Vercel auto-deploys

### Environment Variable Updates
1. Update in Vercel dashboard
2. Redeploy if needed
3. Test functionality

## 🛡️ Security

### Environment Variables
- Never commit `.env` files
- Use Vercel's environment variable system
- Rotate API keys regularly

### Smart Contract
- Verify contract on Monad explorer
- Test thoroughly on testnet
- Monitor for suspicious activity

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console errors
3. Test locally to isolate issues
4. Check Multisynq documentation
5. Review Monad network status 