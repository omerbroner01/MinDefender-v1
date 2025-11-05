# 🔐 Mobile HTTPS Setup Guide for EmotionGuard

## Problem Summary

Your EmotionGuard app is blocking on mobile because:
1. **HTTPS is failing** - The site shows "cannot provide a secure connection" on mobile
2. **Camera won't work** - Even if the page loads, mobile browsers require valid HTTPS for camera access
3. **Self-signed certificates don't work on mobile** - The browser doesn't trust them

## Quick Fix Solution (Recommended)

Use **Cloudflare Tunnel** or **ngrok** - these provide instant trusted HTTPS certificates.

### Option 1: LocalTunnel (Fastest - Already Installed!)

```powershell
# Terminal 1 - Start your dev server
npm run dev

# Terminal 2 - Start tunnel (automatically uses trusted HTTPS)
npm run tunnel:local
```

This will give you a URL like: `https://your-app-loca.lt`

**Open that HTTPS URL on your phone** - camera will work instantly!

---

## Option 2: mkcert (Best for Repeated Testing)

This creates trusted certificates that work on your phone permanently.

### Step 1: Install mkcert

**Windows (PowerShell as Administrator):**
```powershell
# Install via Chocolatey
choco install mkcert

# OR download from https://github.com/FiloSottile/mkcert/releases
# and add to PATH
```

**macOS:**
```bash
brew install mkcert
```

**Linux:**
```bash
# Debian/Ubuntu
sudo apt install libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-v*-linux-amd64
sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert

# Fedora
sudo dnf install nss-tools
sudo dnf install mkcert
```

### Step 2: Create Local Certificate Authority

```powershell
# Create local CA
mkcert -install
```

This creates a trusted root certificate on your computer.

### Step 3: Find Your Local IP Address

**Windows:**
```powershell
# Find your local network IP (look for 192.168.x.x or 10.x.x.x)
ipconfig
```

**macOS/Linux:**
```bash
ifconfig | grep "inet "
# or
ip addr show
```

Example: `192.168.1.50`

### Step 4: Generate Certificates for Your Local IP

```powershell
# Replace 192.168.1.50 with YOUR IP from Step 3
cd server/dev-https
mkcert localhost 127.0.0.1 ::1 192.168.1.50

# This creates two files:
# - localhost+3.pem (certificate)
# - localhost+3-key.pem (private key)

# Rename them:
mv localhost+3.pem cert.pem
mv localhost+3-key.pem key.pem
```

### Step 5: Trust Certificate on Your Phone

**iOS (iPhone/iPad):**

1. **Share the CA certificate to your phone:**
   ```powershell
   # Find the mkcert root CA certificate
   mkcert -CAROOT
   # This shows the path, e.g., C:\Users\YourName\AppData\Local\mkcert
   ```

2. **Copy `rootCA.pem` to your phone** via:
   - AirDrop (easiest)
   - Email it to yourself
   - Put it in iCloud Drive

3. **Install the profile:**
   - Open the file on your iPhone
   - Go to **Settings → Profile Downloaded**
   - Tap **Install**
   - Enter your passcode

4. **Enable full trust:**
   - Go to **Settings → General → About → Certificate Trust Settings**
   - Enable **mkcert** under "ENABLE FULL TRUST FOR ROOT CERTIFICATES"

**Android:**

1. **Share the CA certificate** (same as iOS step 1)

2. **Install the CA:**
   - Go to **Settings → Security → Encryption & credentials**
   - Tap **Install a certificate** (or "Install from storage")
   - Select **CA certificate**
   - Browse to the `rootCA.pem` file
   - Tap to install

   *Note: Exact path varies by Android version and manufacturer (Samsung, Google, etc.)*

### Step 6: Start the Server with HTTPS

```powershell
# The server automatically detects cert.pem and key.pem
npm run dev
```

You'll see:
```
🔐 Using HTTPS (dev) with certs from server\dev-https
serving on port 5000
```

### Step 7: Access from Your Phone

Open your browser on your phone and go to:
```
https://192.168.1.50:5000
```
(Replace with YOUR IP from Step 3)

The page should load **without any security warnings** and camera access will work!

---

## Option 3: Cloudflare Tunnel (Alternative to LocalTunnel)

```powershell
# Install cloudflared
# Windows: Download from https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation

# Start tunnel
cloudflared tunnel --url http://localhost:5000
```

Opens a trusted HTTPS URL you can access from your phone.

---

## Troubleshooting

### "Cannot provide a secure connection" still shows

**Cause:** Certificate not trusted or wrong IP

**Fix:**
1. Verify you installed the CA on your phone (Step 5)
2. Verify you're using the correct local IP address
3. Verify cert.pem and key.pem exist in `server/dev-https/`
4. Try clearing browser cache on phone
5. Try opening in **private/incognito mode** first

### Camera still doesn't work

**Cause:** Not a secure context or permission denied

**Fix:**
1. Verify the URL in browser shows 🔒 (lock icon)
2. Check browser console for errors
3. Ensure you granted camera permission when prompted
4. Try a different browser (Chrome, Safari)

### Server shows "HTTP" not "HTTPS"

**Cause:** Certificates not found

**Fix:**
```powershell
# Verify files exist
dir server\dev-https
# You should see cert.pem and key.pem

# If not, regenerate (Step 4)
cd server\dev-https
mkcert localhost 127.0.0.1 ::1 YOUR_LOCAL_IP
mv localhost+*.pem cert.pem
mv localhost+*-key.pem key.pem
```

### iOS: "Profile Downloaded" doesn't appear

**Fix:**
1. Make sure you transferred `rootCA.pem` (not `cert.pem`)
2. Location: Run `mkcert -CAROOT` to find it
3. Try emailing the file to yourself and opening on phone

### Android: Can't find "Install certificate"

**Fix:**
- **Samsung:** Settings → Biometrics and security → Other security settings → Install from device storage
- **Google Pixel:** Settings → Security → Encryption & credentials → Install a certificate → CA certificate
- **OnePlus/Oppo:** Settings → Password & security → Privacy → Install from storage

---

## Verification Checklist

Before testing on your phone:

- [ ] Server shows `🔐 Using HTTPS (dev) with certs...`
- [ ] Desktop browser shows lock icon at `https://localhost:5000`
- [ ] Local IP found with `ipconfig` or `ifconfig`
- [ ] Certificates generated for that IP
- [ ] CA certificate installed on phone
- [ ] Full trust enabled (iOS only)
- [ ] Phone connected to same WiFi network
- [ ] Firewall allows port 5000 (usually automatic on Windows)

---

## For Production Deployment

**Do NOT use dev certificates in production!**

For production, use:
- Let's Encrypt (free, automatic with Certbot)
- Your domain registrar's SSL certificate
- Cloudflare SSL (free tier available)
- AWS Certificate Manager (if deploying to AWS)

---

## Quick Reference Commands

```powershell
# Check if mkcert is installed
mkcert -version

# Find CA location
mkcert -CAROOT

# Find your local IP
ipconfig  # Windows
ifconfig  # macOS/Linux

# Generate cert for IP 192.168.1.50
cd server/dev-https
mkcert localhost 127.0.0.1 ::1 192.168.1.50
mv localhost+*.pem cert.pem
mv localhost+*-key.pem key.pem

# Start dev server with HTTPS
npm run dev

# Alternative: Use tunnel
npm run tunnel:local
```

---

## Summary

**Fastest path to working camera on mobile:**

1. **Use LocalTunnel** (already installed): `npm run tunnel:local`
2. Open the `https://` URL on your phone
3. Done! Camera works immediately.

**For permanent local development:**

1. Install mkcert
2. Generate certificates with your local IP
3. Install CA on your phone
4. Access via `https://YOUR_LOCAL_IP:5000`

The camera will now work because:
- ✅ Page loads over trusted HTTPS
- ✅ Browser treats it as a secure context
- ✅ `getUserMedia` API is available
- ✅ No security warnings
