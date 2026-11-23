@echo off
REM ==============================================================================
REM 🗑️ GarbageGuardian — Automated Windows Faculty Setup & Launch Script
REM ==============================================================================
REM Location: scripts\run_for_faculty.bat

setlocal EnableDelayedExpansion

REM Navigate to project root (parent directory of scripts\)
cd /d "%~dp0.."

cls
echo ==============================================================================
echo      GarbageGuardian - Automated Faculty Evaluation Launcher (Windows)
echo ==============================================================================
echo.

set MISSING_STACK=0

REM ------------------------------------------------------------------------------
REM STEP 1: Check Required Tech Stack (Node.js, npm, Python, AWS CLI)
REM ------------------------------------------------------------------------------
echo [1/4] Inspecting system tech stack and dependencies...

REM 1. Check Node.js
where node >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
    echo   [OK] Node.js detected: !NODE_VER!
) else (
    echo   [MISSING] Node.js is NOT installed.
    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        echo   Attempting automatic installation via Windows Package Manager (winget)...
        winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
    ) else (
        echo   Please download and install Node.js (v18 or v20) from: https://nodejs.org/
        set MISSING_STACK=1
    )
)

REM 2. Check npm
where npm >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('npm -v') do set NPM_VER=%%i
    echo   [OK] npm detected: v!NPM_VER!
) else (
    echo   [MISSING] npm is not detected.
    set MISSING_STACK=1
)

REM 3. Check Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('python --version') do set PY_VER=%%i
    echo   [OK] Python detected: !PY_VER!
) else (
    echo   [MISSING] Python 3 is NOT installed.
    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        echo   Attempting automatic installation of Python via winget...
        winget install Python.Python.3.11 --silent --accept-source-agreements --accept-package-agreements
    ) else (
        echo   Please download and install Python 3.10+ from: https://www.python.org/downloads/
        set MISSING_STACK=1
    )
)

REM 4. Check AWS CLI
where aws >nul 2>nul
if %errorlevel% equ 0 (
    echo   [OK] AWS CLI detected.
) else (
    echo   [INFO] AWS CLI not detected. (Optional: The application connects directly to AWS DynamoDB using the IAM credentials you provide).
)

if !MISSING_STACK! equ 1 (
    echo.
    echo [ERROR] Required software is missing. Please complete the installation and restart this script.
    pause
    exit /b 1
)
echo.

REM ------------------------------------------------------------------------------
REM STEP 2: Configure AWS Credentials Interactively
REM ------------------------------------------------------------------------------
echo [2/4] Configuring AWS Database Credentials...
echo   Please enter the AWS IAM credentials provided in your Evaluation Guide / PDF.
echo.

set AWS_DEFAULT_REGION=ap-southeast-2
set /p AWS_ACCESS_KEY_ID="  Enter AWS Access Key ID (e.g. AKIA...): "
set /p AWS_SECRET_ACCESS_KEY="  Enter AWS Secret Access Key: "
set /p USER_REGION="  Enter AWS Region [press Enter for default 'ap-southeast-2']: "

if not "!USER_REGION!"=="" (
    set AWS_DEFAULT_REGION=!USER_REGION!
)
set AWS_REGION=!AWS_DEFAULT_REGION!

REM Configure AWS CLI if available
where aws >nul 2>nul
if %errorlevel% equ 0 (
    aws configure set aws_access_key_id !AWS_ACCESS_KEY_ID!
    aws configure set aws_secret_access_key !AWS_SECRET_ACCESS_KEY!
    aws configure set region !AWS_DEFAULT_REGION!
)

REM Write to apps\api\.env
if not exist "apps\api\.env" (
    copy "apps\api\.env.example" "apps\api\.env" >nul
)

>> "apps\api\.env" echo.
>> "apps\api\.env" echo AWS_REGION=!AWS_DEFAULT_REGION!
>> "apps\api\.env" echo AWS_ACCESS_KEY_ID=!AWS_ACCESS_KEY_ID!
>> "apps\api\.env" echo AWS_SECRET_ACCESS_KEY=!AWS_SECRET_ACCESS_KEY!
>> "apps\api\.env" echo DISABLE_EMAIL_OTP=true
>> "apps\api\.env" echo DEV_OTP_CODE=123456

if not exist "apps\web\.env" (
    > "apps\web\.env" echo VITE_API_URL=http://localhost:5000
)
echo   [OK] Credentials and environment files configured.
echo.

REM ------------------------------------------------------------------------------
REM STEP 3: Install Node Packages & Setup Python Virtual Environment
REM ------------------------------------------------------------------------------
echo [3/4] Installing project dependencies...
echo   -> Running npm install...
call npm install

echo   -> Setting up Python virtual environment...
if not exist "services\ml\venv\Scripts\python.exe" (
    python -m venv services\ml\venv
)

call services\ml\venv\Scripts\python.exe -m pip install --upgrade pip --quiet
call services\ml\venv\Scripts\python.exe -m pip install -r services\ml\requirements.txt --quiet
echo   [OK] Python ML environment ready.
echo.

REM ------------------------------------------------------------------------------
REM STEP 4: Start Platform & Display Guided Tour
REM ------------------------------------------------------------------------------
echo [4/4] Starting GarbageGuardian Platform...
echo ==============================================================================
echo   GarbageGuardian is running! Access the services below:
echo ==============================================================================
echo   Frontend Portal:     http://localhost:5173
echo   Backend REST API:    http://localhost:5000
echo   Python ML Service:   http://localhost:5001
echo.
echo   Evaluation Login:
echo   - Open http://localhost:5173
echo   - Enter admin credentials
echo   - OTP Email Bypass is active (enter 123456 if code prompt appears)
echo ==============================================================================
echo.

call npm run dev
