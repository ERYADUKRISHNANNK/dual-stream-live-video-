from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.services.copilot_service import AICopilotService

router = APIRouter()
copilot_service = AICopilotService()

class ChatQuery(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = None

@router.post("/chat")
def chat_copilot(payload: ChatQuery):
    try:
        response = copilot_service.answer_query(payload.query, payload.context)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot model inference error: {str(e)}")
