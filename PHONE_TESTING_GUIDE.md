# 📱 Running TradePause on Your Phone - Complete Guide

## ✅ Server is Running!

Your TradePause app is now running at: **https://localhost:5000**

## 🔐 Why HTTPS is Required

Mobile browsers (especially iOS Safari) **require HTTPS** to access the camera. The app is already configured with HTTPS certificates.

## 📱 Option 1: Access via Network IP (Recommended)

### Step 1: Find Your Computer's IP Address

**On Windows (PowerShell):**
```powershell
ipconfig | findstr /i "IPv4"
```

Look for something like: `192.168.1.xxx` or `10.0.0.xxx`

### Step 2: Make Sure Phone and Computer are on Same WiFi

Both devices must be connected to the **same WiFi network**.

### Step 3: Access from Phone

On your phone's browser, go to:
```
https://YOUR-IP-ADDRESS:5000
```

Example: `https://192.168.1.105:5000`

### Step 4: Accept the Security Warning

You'll see a certificate warning because we're using a self-signed certificate. This is normal for development.

**On iOS Safari:**
1. Tap "Show Details"
2. Tap "visit this website"
3. Tap "Visit Website" again

**On Android Chrome:**
1. Tap "Advanced"
2. Tap "Proceed to [address] (unsafe)"

---

## 📱 Option 2: Use Tunneling Service (If Option 1 Doesn't Work)

### Using LocalTunnel (Included in package.json)

**Step 1:** In a **NEW terminal**, run:
```powershell
cd "c:\Users\omerb\Downloads\EmotionGuard-pt-main (1)\EmotionGuard-pt-main"
npm run tunnel:local
```

**Step 2:** You'll get a URL like:
```
your url is: https://random-name-12345.loca.lt
```

**Step 3:** Open that URL on your phone

**Step 4:** On the first visit, you'll see a LocalTunnel page asking for the "Tunnel Password". Enter your IP address (the endpoint shown in the terminal).

---

## 📱 Option 3: Use ngrok (More Stable)

### Step 1: Install ngrok
Download from: https://ngrok.com/download

Or using PowerShell:
```powershell
choco install ngrok
```

### Step 2: Run ngrok
```powershell
ngrok http https://localhost:5000
```

### Step 3: Use the https URL provided
Look for the line that says:
```
Forwarding    https://abc123.ngrok.io -> https://localhost:5000
```

Open `https://abc123.ngrok.io` on your phone.

---

## 🎥 Testing Camera on Phone

### What Should Happen:

1. **Homepage loads** - You see the TradePause dashboard
2. **Click BUY or SELL** - Assessment gate opens
3. **Camera scan starts** - You see "Allow camera access" prompt
4. **Grant permission** - Camera activates and starts scanning
5. **Metrics update** - Stress levels and facial metrics appear
6. **Complete tests** - Go through impulse control, Stroop, and reaction tests
7. **See decision** - AI makes allow/block decision

### If Camera Doesn't Work:

1. **Check HTTPS** - URL must start with `https://`
2. **Check permissions** - Go to browser settings and allow camera
3. **Reload page** - Sometimes needed after granting permission
4. **Try different browser** - Safari on iOS, Chrome on Android work best
5. **Check logs** - Open browser dev tools (if possible) to see errors

---

## 🔍 Troubleshooting

### "Cannot connect" or "Connection refused"

- **Firewall**: Windows Firewall may be blocking port 5000
  - Run: `netsh advfirewall firewall add rule name="TradePause Dev" dir=in action=allow protocol=TCP localport=5000`
- **WiFi network**: Make sure both devices are on same network
- **IP address**: Double-check you're using the correct IP

### "Camera permission denied"

- **iOS**: Settings → Safari → Camera → Allow
- **Android**: Settings → Apps → Chrome → Permissions → Camera → Allow
- **Reload** the page after changing permissions

### "Certificate error" won't go away

- This is normal for development with self-signed certificates
- You must click "Advanced" or "Details" and proceed anyway
- Alternatively, use ngrok (Option 3) which provides valid certificates

### Camera works but video is black

- Check phone's camera isn't being used by another app
- Try closing and reopening the browser
- Restart the phone if needed

---

## 🎯 Quick Test Checklist

Once on your phone:

- [ ] Page loads and displays TradePause branding
- [ ] Can tap BUY or SELL button (minimum 44px tap target)
- [ ] Camera permission prompt appears
- [ ] Camera starts and shows live video
- [ ] Facial metrics update in real-time
- [ ] Can complete cognitive tests
- [ ] Decision screen appears with allow/block verdict
- [ ] All buttons are tappable (not too small)
- [ ] Text is readable (minimum 16px font size)
- [ ] No UI elements are cut off
- [ ] Rotation works (portrait/landscape)

---

## 📊 Getting Your IP Address (Detailed)

### Windows PowerShell:
```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*"} | Select-Object IPAddress
```

### Command Prompt:
```cmd
ipconfig
```
Look for "Wireless LAN adapter Wi-Fi" section, find "IPv4 Address"

### From Server Logs:
The server may log available network addresses when it starts. Check the terminal output.

---

## 🚀 Current Status

✅ **Server running**: https://localhost:5000  
✅ **HTTPS enabled**: Self-signed certificate in place  
✅ **Mobile optimized**: Viewport, tap targets, responsive design  
✅ **Camera ready**: Permissions system implemented  

**Next Steps:**
1. Find your computer's IP address
2. Access `https://YOUR-IP:5000` from your phone
3. Accept the certificate warning
4. Test the camera functionality
5. Report any issues you encounter

---

## 📞 Need Help?

If you encounter issues:
1. Check the server terminal for error messages
2. Check browser console on phone (if possible)
3. Try all three connection options above
4. Make sure you're using HTTPS (not HTTP)
5. Verify both devices are on the same WiFi network

Good luck testing! 🎉
