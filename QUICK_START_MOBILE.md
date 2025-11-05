# 🚀 Quick Start - Fix Mobile Camera in 60 Seconds

## The Problem
Your mobile browser shows **"cannot provide a secure connection"** and the camera won't work.

## The Cause
Mobile browsers require **HTTPS** (not HTTP) for camera access. Your dev server is running HTTP.

## The Fix (Choose One)

### ⚡ FASTEST - LocalTunnel (No setup needed!)

```bash
npm run tunnel:local
```

**That's it!** Open the `https://` URL on your phone and the camera will work.

---

### 🔧 BEST FOR DEVELOPMENT - mkcert

**Windows:**
```powershell
# Run the automated setup script
.\setup-https.ps1
```

**macOS/Linux:**
```bash
# Make executable and run
chmod +x setup-https.sh
./setup-https.sh
```

**Then follow the on-screen instructions to:**
1. Install the CA certificate on your phone (one-time)
2. Access `https://YOUR_LOCAL_IP:5000` from your phone

---

## Verify It Works

1. Open the HTTPS URL on your phone
2. Look for the 🔒 lock icon in the browser
3. Allow camera permission when prompted
4. Camera preview should appear

---

## Still Having Issues?

See the complete guide: **[MOBILE_HTTPS_SETUP_GUIDE.md](./MOBILE_HTTPS_SETUP_GUIDE.md)**

Or the technical summary: **[MOBILE_CAMERA_FIX_SUMMARY.md](./MOBILE_CAMERA_FIX_SUMMARY.md)**

---

**TL;DR:** Run `npm run tunnel:local` and open the HTTPS URL on your phone. Camera works instantly. ✅
