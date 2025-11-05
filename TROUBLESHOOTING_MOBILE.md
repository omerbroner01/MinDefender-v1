# 🔍 Mobile Camera Troubleshooting Checklist

Use this checklist to diagnose and fix mobile camera issues.

## ✅ Pre-Flight Checks

### Server Status
- [ ] Server is running (`npm run dev`)
- [ ] Server console shows either:
  - ✅ `🔐 Using HTTPS (dev) with certs...` (HTTPS enabled)
  - ⚠️ `⚠️  Running without HTTPS...` (HTTP mode - mobile won't work)

### Network
- [ ] Phone is on the same WiFi network as your computer
- [ ] You can ping your computer's IP from phone (optional)

---

## 🔒 HTTPS Setup Verification

### If Using LocalTunnel:
- [ ] Ran `npm run tunnel:local`
- [ ] Terminal shows URL like `https://your-app.loca.lt`
- [ ] URL starts with `https://` (not `http://`)
- [ ] Tunnel is active (terminal shows connection)

### If Using mkcert:
- [ ] Ran setup script (`.\setup-https.ps1` or `./setup-https.sh`)
- [ ] Files exist: `server/dev-https/cert.pem` and `server/dev-https/key.pem`
- [ ] Server console shows `🔐 Using HTTPS (dev) with certs...`
- [ ] CA certificate installed on phone:
  - **iOS:** Settings → Profile Installed → mkcert
  - **iOS:** Certificate Trust Settings → mkcert enabled
  - **Android:** Settings → Security → Trusted credentials → User → mkcert

---

## 📱 Browser Checks (On Phone)

### Security Indicators
- [ ] URL starts with `https://` (not `http://`)
- [ ] Browser shows lock icon 🔒 (not warning ⚠️)
- [ ] No "Not Secure" or "Connection is not private" warning
- [ ] Page loads completely without errors

### Camera Permission
- [ ] Camera permission prompt appeared when clicking "Start Camera"
- [ ] You clicked "Allow" (not "Block")
- [ ] No "Permission Denied" error in console

---

## 🎥 Camera Functionality

### Video Stream
- [ ] Video preview appears (not blank/black)
- [ ] Preview shows your face
- [ ] Video is not frozen
- [ ] Frame rate is smooth (not choppy)

### Detection
- [ ] Face detection markers appear
- [ ] Stress metrics update in real-time
- [ ] Progress bar advances
- [ ] No console errors about camera

---

## ❌ Common Issues & Fixes

### Issue: "Cannot provide a secure connection"

**Cause:** HTTPS not configured or certificate not trusted

**Fix:**
1. **Quick:** Use LocalTunnel instead
   ```bash
   npm run tunnel:local
   ```

2. **Proper:** Re-run setup and verify CA installation
   ```bash
   # Windows
   .\setup-https.ps1
   
   # macOS/Linux
   ./setup-https.sh
   ```

3. Ensure CA is installed and **trusted** on phone (iOS requires extra step)

---

### Issue: "getUserMedia is not a function"

**Cause:** Not in secure context (HTTPS missing)

**Fix:**
1. Verify URL shows `https://` (not `http://`)
2. Check for lock icon 🔒 in browser
3. If missing, HTTPS is not working - see Issue #1 above

---

### Issue: Camera permission denied

**Cause:** User blocked permission or camera in use

**Fix:**
1. **Reset permissions:**
   - **iOS Safari:** Settings → Safari → Camera → Allow
   - **Android Chrome:** Site settings → Permissions → Camera → Allow

2. **Close other apps** using camera (Zoom, Skype, etc.)

3. **Try different browser** (Chrome vs Safari)

4. **Restart browser** completely

---

### Issue: Video preview is black/blank

**Cause:** Camera blocked by another app or hardware issue

**Fix:**
1. Check if camera works in other apps (native camera app)
2. Close all other apps using camera
3. Restart phone
4. Try front vs back camera (if code supports switching)
5. Check browser console for specific errors

---

### Issue: "Network error" or can't reach server

**Cause:** Phone not on same network or firewall blocking

**Fix:**
1. **Verify same WiFi:**
   - Computer WiFi: Check settings
   - Phone WiFi: Check settings
   - Must be exact same network (not "Guest WiFi" vs "Main WiFi")

2. **Check IP address:**
   - Find computer IP: `ipconfig` (Windows) or `ifconfig` (macOS/Linux)
   - Use that IP in URL: `https://192.168.1.50:5000`

3. **Windows Firewall:**
   - Allow Node.js or port 5000 in firewall
   - Or temporarily disable firewall for testing

4. **Use LocalTunnel instead** (bypasses network issues)
   ```bash
   npm run tunnel:local
   ```

---

### Issue: Server shows HTTP not HTTPS

**Cause:** Certificates not found or not in correct location

**Fix:**
1. **Verify files exist:**
   ```bash
   # Windows
   dir server\dev-https
   
   # macOS/Linux
   ls -la server/dev-https
   ```
   
   Should show:
   - `cert.pem`
   - `key.pem`

2. **If missing, regenerate:**
   ```bash
   # Windows
   .\setup-https.ps1
   
   # macOS/Linux
   ./setup-https.sh
   ```

3. **Restart server** after adding certificates

---

### Issue: iOS - "Profile cannot be installed"

**Cause:** File is corrupted or wrong file type

**Fix:**
1. **Verify correct file:** Should be `rootCA.pem` (not `cert.pem`)
   - Location: Run `mkcert -CAROOT` to find it

2. **Transfer method:**
   - **Best:** AirDrop to iPhone
   - **Alternative:** Email to yourself, open on phone
   - **Alternative:** iCloud Drive

3. **File extension:** Must be `.pem` or `.crt`

4. **After install:**
   - Settings → General → VPN & Device Management → Install profile
   - Settings → General → About → Certificate Trust Settings → Enable mkcert

---

### Issue: Android - "Can't install certificate"

**Cause:** Incorrect install method or security settings

**Fix:**
1. **Find correct setting path** (varies by manufacturer):
   - **Samsung:** Settings → Biometrics → Other Security → Install from storage
   - **Google Pixel:** Settings → Security → Encryption → Install certificate → CA certificate
   - **OnePlus:** Settings → Password & Security → Install from storage

2. **Select "CA certificate"** (not "User certificate")

3. **Browse to downloaded** `rootCA.pem` file

4. **Enter PIN/Password** when prompted

5. **Verify installation:**
   - Settings → Security → Trusted credentials → User tab
   - Should see "mkcert"

---

## 🆘 Still Not Working?

### Debug Mode

Enable verbose logging to see what's failing:

1. **Browser Console** (if accessible on mobile):
   - Look for red errors
   - Check for `getUserMedia` errors
   - Note any HTTPS/security warnings

2. **Desktop Console** (for server):
   - Should show requests from phone
   - Check for certificate errors
   - Verify WebSocket connections

3. **Test on Desktop First:**
   - Does camera work on desktop at `https://localhost:5000`?
   - If desktop fails, issue is not mobile-specific
   - Fix desktop first, then retry mobile

### Alternative Approaches

If all else fails:

1. **Use LocalTunnel** (most reliable):
   ```bash
   npm run tunnel:local
   ```
   This bypasses all local network/certificate issues.

2. **Test on Different Phone:**
   - Try different device
   - Try different browser (Chrome, Safari, Firefox)

3. **Update Everything:**
   - Update phone OS to latest version
   - Update browser to latest version
   - Update Node.js on computer

---

## 📊 Diagnostic Information to Collect

If you need help, gather this info:

```
Phone:
  - Device: [iPhone 12 / Samsung Galaxy S21 / etc.]
  - OS Version: [iOS 17.2 / Android 13 / etc.]
  - Browser: [Safari / Chrome / Firefox]
  - Browser Version: [117.0.5938.89]

Computer:
  - OS: [Windows 11 / macOS 14.2 / Ubuntu 22.04]
  - Node Version: [v20.11.0]
  - Server Mode: [HTTP / HTTPS with mkcert / HTTPS with LocalTunnel]

URL Accessed:
  - [https://192.168.1.50:5000 / https://xxx.loca.lt / etc.]

Server Console Output:
  - [Copy relevant logs]

Browser Console Errors:
  - [Copy any red errors]

What Happens:
  - [Describe exact behavior - where it fails]
```

---

## ✅ Success Criteria

You'll know it's working when:

- [ ] URL shows `https://` with lock icon 🔒
- [ ] No security warnings in browser
- [ ] Camera permission prompt appears
- [ ] Video preview shows your face
- [ ] Face detection landmarks appear
- [ ] Stress metrics update in real-time
- [ ] Assessment completes successfully

---

## 📚 Additional Resources

- **Setup Guide:** [MOBILE_HTTPS_SETUP_GUIDE.md](./MOBILE_HTTPS_SETUP_GUIDE.md)
- **Technical Summary:** [MOBILE_CAMERA_FIX_SUMMARY.md](./MOBILE_CAMERA_FIX_SUMMARY.md)
- **Quick Start:** [QUICK_START_MOBILE.md](./QUICK_START_MOBILE.md)
- **mkcert Docs:** https://github.com/FiloSottile/mkcert
- **LocalTunnel Docs:** https://theboroer.github.io/localtunnel-www/

---

**Remember:** 99% of mobile camera issues are HTTPS-related. Fix HTTPS first, then troubleshoot camera. 🔒📹
