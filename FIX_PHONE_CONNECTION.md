# 🔧 Fix: Cannot Connect to https://192.168.1.59:5000 on Phone

## Problem
Your phone cannot connect to the TradePause server even though both devices are on the same WiFi network.

## Solution: Open Windows Firewall Port

### Option 1: Use PowerShell (Recommended - Quick Fix)

**Run PowerShell as Administrator:**
1. Press `Win + X`
2. Click **"Windows PowerShell (Admin)"** or **"Terminal (Admin)"**
3. Copy and paste this command:

```powershell
netsh advfirewall firewall add rule name="TradePause Dev Server" dir=in action=allow protocol=TCP localport=5000
```

4. Press Enter
5. You should see: "Ok."

**Now try accessing from your phone again:**
```
https://192.168.1.59:5000
```

---

### Option 2: Use Windows Firewall GUI

1. Press `Win + R`, type `wf.msc`, press Enter
2. Click **"Inbound Rules"** on the left
3. Click **"New Rule..."** on the right
4. Select **"Port"** → Click Next
5. Select **"TCP"** → Enter **5000** in "Specific local ports" → Click Next
6. Select **"Allow the connection"** → Click Next
7. Check all three boxes (Domain, Private, Public) → Click Next
8. Name it **"TradePause Dev Server"** → Click Finish

**Now try accessing from your phone:**
```
https://192.168.1.59:5000
```

---

### Option 3: Temporarily Disable Firewall (NOT RECOMMENDED - for testing only)

1. Press `Win + R`, type `firewall.cpl`, press Enter
2. Click **"Turn Windows Defender Firewall on or off"**
3. Turn it off for Private networks (temporarily)
4. Test the connection
5. **IMPORTANT: Turn it back on after testing!**

---

## Alternative: Use Tunneling (No Firewall Changes Needed)

If you don't want to change firewall settings, use a tunnel service:

### Using LocalTunnel (Already Installed)

**Open a NEW PowerShell window (not as admin needed):**

```powershell
cd "c:\Users\omerb\Downloads\EmotionGuard-pt-main (1)\EmotionGuard-pt-main"
npm run tunnel:local
```

You'll get a URL like:
```
your url is: https://random-name.loca.lt
```

**Open that URL on your phone!**

On first visit, you'll see a password prompt - just enter your IP: `192.168.1.59`

---

## Verification Steps

After opening the firewall:

1. **On your phone**, open browser and go to:
   ```
   https://192.168.1.59:5000
   ```

2. **You should see a certificate warning** - This is normal!
   - **iOS Safari**: Tap "Show Details" → "visit this website" → "Visit Website"
   - **Android Chrome**: Tap "Advanced" → "Proceed to 192.168.1.59 (unsafe)"

3. **TradePause homepage should load!** 🎉

---

## Troubleshooting

### Still Can't Connect?

**Check WiFi Network:**
- Make sure both devices are on the **SAME** WiFi network
- Some WiFi networks block device-to-device communication (common in public WiFi, hotels, etc.)
- Try using your phone's hotspot:
  1. Enable hotspot on your phone
  2. Connect your computer to the phone's hotspot
  3. Get your computer's new IP: `ipconfig` in PowerShell
  4. Try the new IP on your phone's browser

**Check Server is Running:**
```powershell
netstat -ano | findstr :5000
```
You should see something like:
```
TCP    0.0.0.0:5000    0.0.0.0:0    LISTENING    12345
```

**Verify Firewall Rule Added:**
```powershell
netsh advfirewall firewall show rule name="TradePause Dev Server"
```

**Test from Computer First:**
Open `https://localhost:5000` on your computer - if this doesn't work, the server isn't running properly.

---

## Quick Command Summary

```powershell
# 1. Open firewall (Run PowerShell as Admin)
netsh advfirewall firewall add rule name="TradePause Dev Server" dir=in action=allow protocol=TCP localport=5000

# 2. Verify rule was added
netsh advfirewall firewall show rule name="TradePause Dev Server"

# 3. Check server is listening
netstat -ano | findstr :5000

# 4. Get your IP (if it changed)
ipconfig | findstr /i "IPv4"
```

Then on your phone: `https://192.168.1.59:5000`

---

## Which Option Should I Choose?

- **Best for testing**: Option 1 (PowerShell command) - Takes 10 seconds
- **If you can't get admin access**: Use tunneling (LocalTunnel)
- **For long-term development**: Option 2 (GUI) - More permanent

**After adding the firewall rule, your phone should connect immediately!** 🚀
