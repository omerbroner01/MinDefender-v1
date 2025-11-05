## Mobile HTTPS setup for camera access

Mobile browsers require a secure context for getUserMedia (camera/mic). On desktop, localhost works without HTTPS, but on phones you must use HTTPS with a trusted certificate or a public HTTPS tunnel.

Pick one of the options below to run the app on your phone without changing code.

### Option A — Use a public HTTPS tunnel (easiest)

- Start the dev server as usual (port 5000 by default).
- Use a tunnel tool to expose your local server over a trusted HTTPS URL. Any of these work:
  - Cloudflare Tunnel (free, recommended)
  - ngrok
  - LocalTunnel

If you prefer LocalTunnel, add/install it and run a tunnel to port 5000, then open the provided https:// URL on your phone. This gives you a trusted certificate instantly, so the camera will work.

Notes:
- Tunnels are great for quick tests and demos.
- Some tunnels sleep after inactivity on free tiers—just restart if needed.

### Option B — Serve HTTPS locally with a trusted dev certificate

Our server will automatically use HTTPS if it finds certificates here:

- server/dev-https/cert.pem
- server/dev-https/key.pem

Steps overview (Windows/macOS/Linux):
1) Install mkcert (https://github.com/FiloSottile/mkcert).
2) Run mkcert to create a cert for your LAN IP and/or hostname (e.g., 192.168.x.x).
3) Place the resulting cert/key into server/dev-https as cert.pem and key.pem.
4) Start the dev server and open https://<LAN-IP>:5000 on your phone.
5) Trust the mkcert root CA on your phone so Chrome/Safari treats the site as secure:
   - iOS: AirDrop/email the mkcert CA to the device, install profile, then enable full trust in Settings → General → About → Certificate Trust Settings.
   - Android: Install the CA via Settings → Security → Encryption & credentials → Install a certificate (exact path varies by OEM/Android version). Then open the HTTPS URL.

Important: Self-signed certificates without installing/trusting the CA typically won’t unlock camera access on mobile.

### Option C — Use Vite’s basic-ssl dev certs (desktop only)

@vitejs/plugin-basic-ssl generates a self-signed cert that works for desktop testing. Mobile devices generally won’t trust it by default, so prefer Option A or B for phones.

### Verify on device

- Open https://<your-domain-or-tunnel>:5000 on the phone.
- Tap Start Camera in the UI.
- If getUserMedia is available, the console logs will show that navigator.mediaDevices.getUserMedia is a function and the stream will start.

Troubleshooting tips
- If you see “navigator.mediaDevices.getUserMedia is not a function”, you’re likely not in a trusted HTTPS context. Switch to a trusted tunnel URL or install/trust the dev cert (Option A or B).
- If you see a permission prompt but the video stays black, try a different browser, ensure the front camera is available, and check other apps aren’t using the camera.

That’s it—you don’t need to change any code; just ensure the page is loaded over a trusted HTTPS origin on your phone.
