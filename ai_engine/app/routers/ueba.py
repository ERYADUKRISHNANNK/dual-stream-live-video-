from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.ueba_service import UEBAService

router = APIRouter()
ueba_service = UEBAService()

class TelemetryPayload(BaseModel):
    username: str
    ip: str
    location: Dict[str, Any] # e.g. {"lat": float, "lon": float, "country": str}
    device_trust_metrics: Dict[str, bool] # {"is_known_device": bool, ...}
    previous_login: Optional[Dict[str, Any]] = None
    session_concurrent: int
    downloads_last_hour: int
    biometrics: Dict[str, float] # {"keystroke_average_hold_ms": float, "mouse_jitter_index": float}
    timestamp: int

@router.post("/evaluate")
def evaluate_telemetry(payload: TelemetryPayload):
    try:
        result = ueba_service.evaluate_behavior(payload.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"UEBA model evaluation failure: {str(e)}")
