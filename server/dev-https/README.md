Dev HTTPS Certificates

The dev server can run over HTTPS if certs are present here:

- cert.pem
- key.pem

Recommended: generate a trusted local CA and certs using mkcert so mobile devices will accept the connection and unlock camera access.

Quick overview
1) Install mkcert (https://github.com/FiloSottile/mkcert)
2) Create a cert for your LAN IP and/or hostname, e.g. 192.168.1.50
3) Save the files in this folder as cert.pem and key.pem
4) Start the dev server and open https://<LAN-IP>:5000 on your phone
5) Install/trust the mkcert root CA on your phone (iOS: enable full trust; Android: install user CA)

Note: Without trusting the CA on the phone, Chrome/Safari will not consider the origin secure, and getUserMedia (camera) may not be exposed.
