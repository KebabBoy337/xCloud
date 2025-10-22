# 🧪 Testing xCloud Storage

## Quick Test

### 1. Start Server
```bash
cd /Documents/MyProjects/xCloud
npm start
```

### 2. Open in Browser
Go to `http://localhost:3000`

### 3. Authorization
- Enter API key from `config.js`
- Click "Login"

### 4. Test Functions
- **Upload**: Click "Upload File", select file, click "Upload"
- **Download**: Click download icon on any file
- **Delete**: Click trash icon on any file
- **Search**: Enter filename in search field

## API Testing

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Upload File
```bash
curl -X POST \
     -H "X-API-Key: YOUR_MAIN_KEY" \
     -F "file=@test.txt" \
     http://localhost:3000/api/upload
```

### File List
```bash
curl -H "X-API-Key: YOUR_MAIN_KEY" \
     http://localhost:3000/api/files
```

### Download File
```bash
curl -H "X-API-Key: YOUR_MAIN_KEY" \
     http://localhost:3000/api/download/filename.txt \
     -o downloaded.txt
```

## 🔑 API Keys for Testing

- **Main Key**: Full rights (see in `config.js`)
- **Upload Key**: Upload only (see in `config.js`)

## ✅ What Should Work

1. **Login Screen** - shown on first visit
2. **Authorization** - works with both keys
3. **File Upload** - drag & drop and file selection
4. **File List** - displayed after authorization
5. **Download** - works for all files
6. **Delete** - works with confirmation
7. **Search** - filters files in real time
8. **Statistics** - shows file count and size
9. **Logout** - clears session and returns to login screen

## 🐛 Possible Issues

1. **Files not uploading** - check size (max 100MB)
2. **Authorization error** - check API key correctness
3. **Files not displaying** - click "Refresh"
4. **Server not starting** - check that port 3000 is free
