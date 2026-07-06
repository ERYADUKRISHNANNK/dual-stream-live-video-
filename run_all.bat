@echo off
title Aegis Cyber Platform Orchestrator
echo ====================================================
echo 🚀 Launching Aegis Cyber Platform Services...
echo ====================================================

:: 1. Launch Hardhat Local EVM Node
echo [1/4] Starting EVM Local Node...
start "EVM Local Node" cmd /k "cd blockchain && npx hardhat node"
timeout /t 5

:: 2. Deploy Contracts
echo [2/4] Deploying Smart Contracts...
cd blockchain
call npx hardhat run scripts/deploy.ts --network localhost
cd ..
timeout /t 3

:: 3. Launch FastAPI AI Engine
echo [3/4] Starting FastAPI AI Engine...
start "FastAPI AI Engine" cmd /k "cd ai_engine && python app/main.py"

:: 4. Launch Express Gatekeeper
echo [4/4] Starting Express Zero Trust Gatekeeper...
start "Express Gatekeeper" cmd /k "cd backend && npm run dev"

:: 5. Launch React Client
echo [5/4] Starting React Cyberpunk Client...
start "Vite React Client" cmd /k "cd frontend && npm run dev"

echo ====================================================
echo 🎉 All services initiated!
echo Open http://localhost:3000 in your browser.
echo ====================================================
pause
