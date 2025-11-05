#!/bin/bash
# EmotionGuard HTTPS Setup Script for macOS/Linux
# This script automates the creation of trusted HTTPS certificates for mobile development

echo "====================================================="
echo "  EmotionGuard - Mobile HTTPS Certificate Setup"
echo "====================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

# Step 1: Check if mkcert is installed
echo -e "${GREEN}Step 1: Checking for mkcert...${NC}"

if ! command -v mkcert &> /dev/null; then
    echo -e "${RED}❌ mkcert is not installed${NC}"
    echo ""
    echo -e "${YELLOW}Please install mkcert first:${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo -e "${CYAN}  macOS (using Homebrew):${NC}"
        echo "    brew install mkcert"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo -e "${CYAN}  Ubuntu/Debian:${NC}"
        echo "    sudo apt install libnss3-tools"
        echo "    curl -JLO \"https://dl.filippo.io/mkcert/latest?for=linux/amd64\""
        echo "    chmod +x mkcert-v*-linux-amd64"
        echo "    sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert"
        echo ""
        echo -e "${CYAN}  Fedora:${NC}"
        echo "    sudo dnf install nss-tools"
        echo "    sudo dnf install mkcert"
    fi
    
    echo ""
    echo -e "${YELLOW}After installing, run this script again.${NC}"
    exit 1
fi

MKCERT_PATH=$(which mkcert)
echo -e "${GREEN}✅ mkcert found: $MKCERT_PATH${NC}"
echo ""

# Step 2: Install local CA
echo -e "${GREEN}Step 2: Installing local Certificate Authority...${NC}"

if mkcert -install; then
    echo -e "${GREEN}✅ Local CA is installed${NC}"
    
    CA_ROOT=$(mkcert -CAROOT)
    echo -e "${CYAN}📁 CA Root location: $CA_ROOT${NC}"
    echo ""
else
    echo -e "${RED}❌ Failed to install CA${NC}"
    echo -e "${YELLOW}You may need to run this script with sudo${NC}"
    exit 1
fi

# Step 3: Get local IP address
echo -e "${GREEN}Step 3: Detecting local IP address...${NC}"

if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    LOCAL_IP=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1)
fi

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}❌ Could not detect local IP address${NC}"
    echo -e "${YELLOW}Please run 'ifconfig' or 'ip addr' manually to find your local IP${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Local IP detected: $LOCAL_IP${NC}"
echo ""

# Step 4: Create certificates
echo -e "${GREEN}Step 4: Generating HTTPS certificates...${NC}"

CERT_DIR="$(dirname "$0")/server/dev-https"

# Create directory if it doesn't exist
mkdir -p "$CERT_DIR"
echo -e "${CYAN}📁 Using directory: $CERT_DIR${NC}"

# Change to cert directory
cd "$CERT_DIR" || exit 1

# Generate certificate
echo -e "${CYAN}🔐 Generating certificate for: localhost, 127.0.0.1, ::1, $LOCAL_IP${NC}"

if mkcert localhost 127.0.0.1 ::1 "$LOCAL_IP"; then
    # Find generated files
    CERT_FILE=$(ls localhost+*.pem 2>/dev/null | grep -v 'key' | head -n 1)
    KEY_FILE=$(ls localhost+*-key.pem 2>/dev/null | head -n 1)
    
    if [ -z "$CERT_FILE" ] || [ -z "$KEY_FILE" ]; then
        echo -e "${RED}❌ Generated certificate files not found${NC}"
        exit 1
    fi
    
    # Rename to expected names
    rm -f cert.pem key.pem
    mv "$CERT_FILE" cert.pem
    mv "$KEY_FILE" key.pem
    
    echo -e "${GREEN}✅ Certificates generated successfully!${NC}"
    echo -e "${CYAN}   📄 cert.pem${NC}"
    echo -e "${CYAN}   🔑 key.pem${NC}"
    echo ""
else
    echo -e "${RED}❌ Failed to generate certificates${NC}"
    exit 1
fi

# Step 5: Instructions
echo "====================================================="
echo -e "${GREEN}  ✅ HTTPS Certificates Ready!${NC}"
echo "====================================================="
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "${NC}1️⃣  Start your dev server:${NC}"
echo -e "${CYAN}   npm run dev${NC}"
echo ""
echo -e "${GRAY}   You should see: 🔐 Using HTTPS (dev) with certs...${NC}"
echo ""

echo -e "${NC}2️⃣  Trust the certificate on your phone:${NC}"
echo ""
echo -e "${CYAN}   📱 iOS (iPhone/iPad):${NC}"
echo -e "${NC}      a) Transfer the CA certificate to your phone${NC}"
echo -e "${GRAY}         Location: $CA_ROOT/rootCA.pem${NC}"
echo -e "${GRAY}         Methods: AirDrop (easiest), Email, or iCloud Drive${NC}"
echo ""
echo -e "${NC}      b) Install the profile:${NC}"
echo -e "${GRAY}         - Open rootCA.pem on your iPhone${NC}"
echo -e "${GRAY}         - Settings → Profile Downloaded → Install${NC}"
echo ""
echo -e "${NC}      c) Enable full trust:${NC}"
echo -e "${GRAY}         - Settings → General → About → Certificate Trust Settings${NC}"
echo -e "${GRAY}         - Toggle ON for 'mkcert'${NC}"
echo ""

echo -e "${CYAN}   📱 Android:${NC}"
echo -e "${NC}      a) Transfer rootCA.pem to your phone${NC}"
echo -e "${GRAY}         Location: $CA_ROOT/rootCA.pem${NC}"
echo ""
echo -e "${NC}      b) Install:${NC}"
echo -e "${GRAY}         - Settings → Security → Install from storage${NC}"
echo -e "${GRAY}         - Select 'CA certificate'${NC}"
echo -e "${GRAY}         - Browse and select rootCA.pem${NC}"
echo ""

echo -e "${NC}3️⃣  Access from your phone:${NC}"
echo -e "${CYAN}   https://$LOCAL_IP:5000${NC}"
echo ""
echo -e "${YELLOW}   ⚠️  Make sure your phone is on the same WiFi network!${NC}"
echo ""

echo "====================================================="
echo -e "${YELLOW}  Alternative: Use a Tunnel (No phone setup needed)${NC}"
echo "====================================================="
echo ""
echo -e "${NC}If you don't want to install CA on your phone, use LocalTunnel:${NC}"
echo -e "${CYAN}   npm run tunnel:local${NC}"
echo ""
echo -e "${GREEN}This gives you a trusted HTTPS URL instantly!${NC}"
echo ""

echo -e "${GRAY}For detailed instructions, see: MOBILE_HTTPS_SETUP_GUIDE.md${NC}"
echo ""
