#!/usr/bin/env bash

# ==============================================================================
# 🗑️ GarbageGuardian — Automated Faculty Setup & Launch Script
# ==============================================================================
# Location: scripts/run_for_faculty.sh
# 1. Checks all required tech stack (Node.js, npm, Python 3, venv, AWS CLI, Git)
# 2. Offers automated download/install if any required dependency is missing
# 3. Interactively requests AWS IAM credentials (provided in evaluation PDF)
# 4. Sets up Python virtual environment & Node.js monorepo dependencies
# 5. Launches all 3 services (Web Portal, API, ML) with one command
# ==============================================================================

# Styling
BOLD='\033[1m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear 2>/dev/null || true
echo -e "${BLUE}${BOLD}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}     🗑️  GarbageGuardian — Automated Faculty Evaluation Launcher              ${NC}"
echo -e "${BLUE}${BOLD}==============================================================================${NC}"
echo ""

# Resolve project root (parent directory of scripts/)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

# Detect Operating System & Package Manager
OS_TYPE="$(uname -s)"
PKG_MANAGER=""
if [[ "$OS_TYPE" == "Darwin" ]]; then
    if command -v brew &> /dev/null; then
        PKG_MANAGER="brew"
    fi
elif [[ "$OS_TYPE" == "Linux" ]]; then
    if command -v apt-get &> /dev/null; then
        PKG_MANAGER="apt"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
    elif command -v pacman &> /dev/null; then
        PKG_MANAGER="pacman"
    fi
fi

# Helper function to ask faculty before installing
prompt_install() {
    local package_name="$1"
    local install_cmd="$2"
    echo -e "${YELLOW}  -> Missing: ${BOLD}$package_name${NC}"
    
    if [ -n "$PKG_MANAGER" ]; then
        echo -e "${CYAN}  Would you like this script to attempt installing ${BOLD}$package_name${NC}${CYAN} automatically? [Y/n]${NC}"
        read -r -p "  Selection (defaults to Y): " choice
        choice=${choice:-Y}
        if [[ "$choice" =~ ^[Yy]$ ]]; then
            echo -e "${BLUE}  Running: $install_cmd ...${NC}"
            eval "$install_cmd"
            return $?
        fi
    fi
    return 1
}

# ------------------------------------------------------------------------------
# STEP 1: Check Required Tech Stack (Node.js, npm, Python 3, venv, AWS CLI, Git)
# ------------------------------------------------------------------------------
echo -e "${YELLOW}${BOLD}[1/4] Inspecting system tech stack & dependencies...${NC}"

MISSING_CRITICAL=0

# 1. Check Git
if command -v git &> /dev/null; then
    echo -e "${GREEN}  ✓ Git detected:${NC} $(git --version)"
else
    echo -e "${YELLOW}  ⚠️ Git not detected.${NC}"
fi

# 2. Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}  ✓ Node.js detected:${NC} $NODE_VERSION"
else
    echo -e "${RED}  ❌ Node.js is NOT installed.${NC}"
    if [[ "$PKG_MANAGER" == "brew" ]]; then
        prompt_install "Node.js (LTS)" "brew install node"
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        prompt_install "Node.js (LTS)" "curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    fi
    
    # Recheck
    if command -v node &> /dev/null; then
        echo -e "${GREEN}  ✓ Node.js successfully installed:${NC} $(node -v)"
    else
        echo -e "${RED}  Please download and install Node.js v18 or v20 from: https://nodejs.org/${NC}"
        MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
    fi
fi

# 3. Check npm
if command -v npm &> /dev/null; then
    echo -e "${GREEN}  ✓ npm detected:${NC} v$(npm -v)"
else
    echo -e "${RED}  ❌ npm is NOT installed.${NC}"
    MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
fi

# 4. Check Python 3
PYTHON_BIN=""
if command -v python3 &> /dev/null; then
    PYTHON_BIN="python3"
elif command -v python &> /dev/null; then
    PYTHON_BIN="python"
fi

if [ -n "$PYTHON_BIN" ]; then
    echo -e "${GREEN}  ✓ Python detected:${NC} $($PYTHON_BIN --version 2>&1)"
else
    echo -e "${RED}  ❌ Python 3 is NOT installed.${NC}"
    if [[ "$PKG_MANAGER" == "brew" ]]; then
        prompt_install "Python 3.11" "brew install python@3.11"
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        prompt_install "Python 3" "sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv"
    fi
    
    # Recheck
    if command -v python3 &> /dev/null; then
        PYTHON_BIN="python3"
        echo -e "${GREEN}  ✓ Python successfully installed:${NC} $(python3 --version 2>&1)"
    else
        echo -e "${RED}  Please download and install Python 3.10+ from: https://www.python.org/downloads/${NC}"
        MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
    fi
fi

# 5. Check Python venv module
if [ -n "$PYTHON_BIN" ]; then
    if $PYTHON_BIN -c "import venv" &> /dev/null; then
        echo -e "${GREEN}  ✓ Python venv module available${NC}"
    else
        echo -e "${YELLOW}  ⚠️ Python 'venv' module missing.${NC}"
        if [[ "$PKG_MANAGER" == "apt" ]]; then
            prompt_install "python3-venv" "sudo apt-get install -y python3-venv python3-pip"
        fi
        
        # Recheck
        if $PYTHON_BIN -c "import venv" &> /dev/null; then
            echo -e "${GREEN}  ✓ Python venv module successfully installed${NC}"
        else
            echo -e "${RED}  Please install python3-venv (e.g. sudo apt-get install python3-venv)${NC}"
            MISSING_CRITICAL=$((MISSING_CRITICAL + 1))
        fi
    fi
fi

# 6. Check AWS CLI
if command -v aws &> /dev/null; then
    echo -e "${GREEN}  ✓ AWS CLI detected:${NC} $(aws --version 2>&1 | cut -d' ' -f1)"
    HAS_AWS_CLI=true
else
    echo -e "${YELLOW}  ℹ AWS CLI not detected.${NC}"
    if [[ "$PKG_MANAGER" == "brew" ]]; then
        prompt_install "AWS CLI v2" "brew install awscli"
    elif [[ "$PKG_MANAGER" == "apt" ]]; then
        prompt_install "AWS CLI" "sudo apt-get install -y awscli"
    fi

    # Recheck
    if command -v aws &> /dev/null; then
        echo -e "${GREEN}  ✓ AWS CLI successfully installed:${NC} $(aws --version 2>&1 | cut -d' ' -f1)"
        HAS_AWS_CLI=true
    else
        echo -e "${CYAN}  ℹ Notice: AWS CLI is optional. The application connects directly to AWS DynamoDB using the credentials you enter below.${NC}"
        HAS_AWS_CLI=false
    fi
fi

if [ $MISSING_CRITICAL -gt 0 ]; then
    echo ""
    echo -e "${RED}${BOLD}❌ Some required tech stack components are missing.${NC}"
    echo -e "${RED}Please install the missing tools above and re-run this script.${NC}"
    exit 1
fi

echo ""

# ------------------------------------------------------------------------------
# STEP 2: Configure AWS Credentials Interactively
# ------------------------------------------------------------------------------
echo -e "${YELLOW}${BOLD}[2/4] Configuring AWS Database Credentials...${NC}"

API_ENV_FILE="$ROOT_DIR/apps/api/.env"
if [ ! -f "$API_ENV_FILE" ]; then
    cp "$ROOT_DIR/apps/api/.env.example" "$API_ENV_FILE" 2>/dev/null || true
fi

# Detect existing credentials in apps/api/.env if present
EXISTING_KEY_ID=""
EXISTING_SECRET=""
if [ -f "$API_ENV_FILE" ]; then
    EXISTING_KEY_ID=$(grep '^AWS_ACCESS_KEY_ID=' "$API_ENV_FILE" | cut -d'=' -f2- | tr -d ' "\r\n')
    EXISTING_SECRET=$(grep '^AWS_SECRET_ACCESS_KEY=' "$API_ENV_FILE" | cut -d'=' -f2- | tr -d ' "\r\n')
fi

USE_EXISTING=false
if [ -n "$EXISTING_KEY_ID" ] && [ -n "$EXISTING_SECRET" ] && [ "$EXISTING_KEY_ID" != "YOUR_AWS_ACCESS_KEY_ID_HERE" ]; then
    MASKED_KEY="${EXISTING_KEY_ID:0:4}...${EXISTING_KEY_ID: -4}"
    echo -e "${CYAN}  Existing AWS credentials found in apps/api/.env (${BOLD}$MASKED_KEY${NC}${CYAN}).${NC}"
    read -r -p "  Press [Enter] to use existing credentials, or type 'new' to enter different keys: " CRED_CHOICE
    if [[ "$CRED_CHOICE" != "new" && "$CRED_CHOICE" != "n" ]]; then
        AWS_ACCESS_KEY_ID="$EXISTING_KEY_ID"
        AWS_SECRET_ACCESS_KEY="$EXISTING_SECRET"
        AWS_DEFAULT_REGION="ap-southeast-2"
        USE_EXISTING=true
        echo -e "${GREEN}  ✓ Using saved AWS credentials.${NC}"
    fi
fi

if [ "$USE_EXISTING" = false ]; then
    echo -e "${CYAN}  Please enter the AWS credentials provided in your Evaluation Guide / PDF:${NC}"
    
    # Prompt for Key ID
    while [ -z "$AWS_ACCESS_KEY_ID" ]; do
        read -r -p "  Enter AWS Access Key ID (e.g., AKIA...): " AWS_ACCESS_KEY_ID
        AWS_ACCESS_KEY_ID=$(echo "$AWS_ACCESS_KEY_ID" | tr -d ' \r\n')
        if [ -z "$AWS_ACCESS_KEY_ID" ]; then
            echo -e "${RED}  AWS Access Key ID cannot be empty.${NC}"
        fi
    done

    # Prompt for Secret Key
    while [ -z "$AWS_SECRET_ACCESS_KEY" ]; do
        read -r -p "  Enter AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
        AWS_SECRET_ACCESS_KEY=$(echo "$AWS_SECRET_ACCESS_KEY" | tr -d ' \r\n')
        if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
            echo -e "${RED}  AWS Secret Access Key cannot be empty.${NC}"
        fi
    done

    read -r -p "  Enter AWS Region [default: ap-southeast-2]: " AWS_DEFAULT_REGION
    AWS_DEFAULT_REGION=$(echo "$AWS_DEFAULT_REGION" | tr -d ' \r\n')
    AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-ap-southeast-2}
    
    echo -e "${GREEN}  ✓ Credentials received.${NC}"
fi

# Export credentials into process environment
export AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"
export AWS_REGION="$AWS_DEFAULT_REGION"
export AWS_DEFAULT_REGION="$AWS_DEFAULT_REGION"

# Configure AWS CLI profile if installed
if [ "$HAS_AWS_CLI" = true ]; then
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID" 2>/dev/null || true
    aws configure set aws_secret_access_key "$AWS_SECRET_ACCESS_KEY" 2>/dev/null || true
    aws configure set region "$AWS_DEFAULT_REGION" 2>/dev/null || true
    echo -e "${GREEN}  ✓ AWS CLI profile credentials updated.${NC}"
fi

# Save to ~/.aws/credentials
mkdir -p "$HOME/.aws" 2>/dev/null || true
if [ -d "$HOME/.aws" ]; then
    cat <<EOF > "$HOME/.aws/credentials"
[default]
aws_access_key_id = $AWS_ACCESS_KEY_ID
aws_secret_access_key = $AWS_SECRET_ACCESS_KEY
EOF
    cat <<EOF > "$HOME/.aws/config"
[default]
region = $AWS_DEFAULT_REGION
output = json
EOF
fi

# Update apps/api/.env safely
touch "$API_ENV_FILE"
sed -i '/^AWS_REGION=/d' "$API_ENV_FILE" 2>/dev/null || true
sed -i '/^AWS_ACCESS_KEY_ID=/d' "$API_ENV_FILE" 2>/dev/null || true
sed -i '/^AWS_SECRET_ACCESS_KEY=/d' "$API_ENV_FILE" 2>/dev/null || true
sed -i '/^DISABLE_EMAIL_OTP=/d' "$API_ENV_FILE" 2>/dev/null || true
sed -i '/^DEV_OTP_CODE=/d' "$API_ENV_FILE" 2>/dev/null || true

cat <<EOF >> "$API_ENV_FILE"
AWS_REGION=$AWS_DEFAULT_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
DISABLE_EMAIL_OTP=true
DEV_OTP_CODE=123456
EOF
echo -e "${GREEN}  ✓ apps/api/.env securely configured with credentials and evaluation OTP bypass.${NC}"

# Ensure apps/web/.env exists
WEB_ENV_FILE="$ROOT_DIR/apps/web/.env"
if [ ! -f "$WEB_ENV_FILE" ]; then
    cat <<EOF > "$WEB_ENV_FILE"
VITE_API_URL=http://localhost:5000
EOF
    echo -e "${GREEN}  ✓ apps/web/.env configured (VITE_API_URL=http://localhost:5000)${NC}"
fi

echo ""

# ------------------------------------------------------------------------------
# STEP 3: Install Node Packages & Setup Python Virtual Environment
# ------------------------------------------------------------------------------
echo -e "${YELLOW}${BOLD}[3/4] Installing dependencies...${NC}"

# 1. Monorepo Node dependencies
echo -e "${BLUE}  -> Running npm install for monorepo workspaces...${NC}"
npm install

# 2. Python ML Virtual Environment
ML_DIR="$ROOT_DIR/services/ml"
ML_VENV="$ML_DIR/venv"

echo -e "${BLUE}  -> Checking Python virtual environment for ML microservice...${NC}"
if [ ! -d "$ML_VENV" ] || [ ! -f "$ML_VENV/bin/python" ]; then
    echo "  Creating fresh Python virtual environment in services/ml/venv..."
    $PYTHON_BIN -m venv "$ML_VENV"
fi

echo -e "${BLUE}  -> Installing Python requirements (Flask, scikit-learn, numpy)...${NC}"
"$ML_VENV/bin/python" -m pip install --upgrade pip --quiet
"$ML_VENV/bin/python" -m pip install -r "$ML_DIR/requirements.txt" --quiet
echo -e "${GREEN}  ✓ Python ML microservice environment ready.${NC}"

echo ""

# ------------------------------------------------------------------------------
# STEP 4: Start Platform & Display Guided Tour
# ------------------------------------------------------------------------------
echo -e "${YELLOW}${BOLD}[4/4] Starting GarbageGuardian Platform...${NC}"
echo ""
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo -e "${GREEN}${BOLD}  🚀 GarbageGuardian is running! Access the services below:                  ${NC}"
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo -e "  🌐 ${BOLD}Frontend Portal:${NC}     ${BLUE}http://localhost:5173${NC}"
echo -e "  📡 ${BOLD}Backend REST API:${NC}    ${BLUE}http://localhost:5000${NC} (Health: http://localhost:5000/health)"
echo -e "  🧠 ${BOLD}Python ML Service:${NC}   ${BLUE}http://localhost:5001${NC} (Health: http://localhost:5001/health)"
echo ""
echo -e "${YELLOW}${BOLD}  🔑 Evaluation Login Guide:${NC}"
echo -e "  • Open ${BLUE}http://localhost:5173${NC} in your browser."
echo -e "  • Enter your admin credentials to log in."
echo -e "  • ${GREEN}OTP Email Bypass is active${NC}: No email code required, or enter ${BOLD}123456${NC} if prompted."
echo -e "${GREEN}${BOLD}==============================================================================${NC}"
echo -e "  Press ${RED}${BOLD}Ctrl + C${NC} anytime to stop all services."
echo ""

# Launch all 3 services concurrently
npm run dev
