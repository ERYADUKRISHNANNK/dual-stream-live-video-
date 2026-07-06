from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import scan, ueba, copilot, feeds

app = FastAPI(
    title="AI-Powered Cyber Defense Security Engine",
    description="Microservice providing AI Malware scanning, Phishing analysis, OCR PII identification, and User Behavior Analytics (UEBA).",
    version="1.0.0"
)

# Enable CORS for communication from backend gateway
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routes
app.include_router(scan.router, prefix="/api/v1/scan", tags=["AI File Scanning"])
app.include_router(ueba.router, prefix="/api/v1/ueba", tags=["User Behavior Analytics"])
app.include_router(copilot.router, prefix="/api/v1/copilot", tags=["AI Security Copilot"])
app.include_router(feeds.router, prefix="/api/v1/feeds", tags=["Threat Intelligence Feeds"])

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "AI-Powered Cyber Defense Engine",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
