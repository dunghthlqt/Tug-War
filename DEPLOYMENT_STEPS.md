# 🚀 Quick Deployment Steps

## ✅ Đã chuẩn bị xong:

1. **Environment Variables**: Đã cấu hình `VITE_MULTISYNQ_API_KEY` trong `src/App.tsx`
2. **Vite Config**: Đã tối ưu cho production build
3. **Vercel Config**: Đã tạo `vercel.json` cho routing
4. **Package Scripts**: Đã thêm scripts cần thiết
5. **Documentation**: Đã cập nhật README và tạo hướng dẫn

## 📋 Các bước tiếp theo:

### 1. Kiểm tra build
```bash
npm run check-build
npm run build
npm run preview
```

### 2. Push lên GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 3. Deploy lên Vercel
1. Vào [vercel.com](https://vercel.com)
2. Sign in với GitHub
3. Import repository
4. **QUAN TRỌNG**: Set environment variable:
   - Name: `VITE_MULTISYNQ_API_KEY`
   - Value: API key mới từ Multisynq
5. Deploy

### 4. Test sau khi deploy
- Kiểm tra wallet connection
- Test tạo/join game
- Test stake và gameplay
- Kiểm tra real-time sync

## 🔑 Lưu ý quan trọng:

- **API Key**: Phải thay đổi API key của Multisynq trong Vercel environment variables
- **Contract**: Đã sử dụng contract address thật: `0x482fA97B7D81f30135BE10CBAE0d9176Beb87C7c`
- **Network**: Vẫn sử dụng Monad Testnet
- **Stake**: Vẫn là 0.01 MON

## 🐛 Nếu có lỗi:

1. Kiểm tra Vercel build logs
2. Kiểm tra browser console
3. Verify environment variables
4. Test locally trước

## 📞 Hỗ trợ:

- Xem file `DEPLOYMENT.md` để biết chi tiết
- Kiểm tra `README.md` để biết thông tin dự án
- Review logs trong Vercel dashboard 