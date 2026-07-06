from fastapi import APIRouter, File, UploadFile, HTTPException
from app.services.malware_scanner import AIMalwareScanner

router = APIRouter()
scanner = AIMalwareScanner()

@router.post("/file")
async def scan_file(file: UploadFile = File(...)):
    try:
        content = await file.read()
        result = scanner.scan_file_bytes(content, file.filename)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI scanner execution error: {str(e)}")
