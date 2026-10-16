import logging
import secrets
from typing import NoReturn

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from .config import settings
from .services import rag_service

logger = logging.getLogger(__name__)


def _raise_internal_error(message: str) -> NoReturn:
    logger.exception("RAG request failed: %s", message)
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=message,
    ) from None


def require_internal_api_key(
    x_internal_api_key: Optional[str] = Header(default=None, alias="X-Internal-API-Key"),
) -> None:
    if not settings.RAG_SERVICE_API_KEY:
        logger.error("RAG_SERVICE_API_KEY is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="RAG service authentication is not configured.",
        )

    if not x_internal_api_key or not secrets.compare_digest(
        x_internal_api_key, settings.RAG_SERVICE_API_KEY
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

app = FastAPI(
    title="MindAnchor RAG Service",
    description="Python microservice for Retrieval-Augmented Generation, Semantic Search and Embeddings",
    version="1.0.0"
)

# Request / Response Schemas
# These Pydantic classes describe what each endpoint expects in req.body.
# FastAPI automatically validates incoming JSON against these classes.
class KnowledgeCreateRequest(BaseModel):
    user_id: Optional[int] = None
    title: str = Field(..., max_length=160)
    content: str = Field(..., max_length=20000)
    source: Optional[str] = None
    category: str = "User Wellness Notes"
    tags: List[str] = []

class AnswerRequest(BaseModel):
    user_id: int
    question: str = Field(..., max_length=4000)

class WellnessGuideRequest(BaseModel):
    user_id: int
    question: str = Field(..., max_length=4000)

class ChatRequest(BaseModel):
    user_id: int
    chat_type: str
    messages: List[Dict[str, str]]
class EmbedRequest(BaseModel):
    text: str = Field(..., max_length=20000)


@app.get("/health")
def health_check():
    # Simple endpoint used to check whether the Python service is running.
    return {"status": "ok", "service": "mindanchor-rag"}



@app.post("/knowledge", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_internal_api_key)])
def create_knowledge(req: KnowledgeCreateRequest):
    try:
        # Save a knowledge document and create its embedding for future search.
        doc = rag_service.insert_knowledge_document(
            user_id=req.user_id,
            title=req.title,
            content=req.content,
            source=req.source,
            category=req.category,
            tags=req.tags
        )
        return {"success": True, "document": doc}
    except HTTPException:
        raise
    except Exception:
        _raise_internal_error("Failed to create knowledge document.")


@app.get("/knowledge", dependencies=[Depends(require_internal_api_key)])
def get_knowledge(user_id: int = Query(...)):
    try:
        docs = rag_service.get_knowledge_documents(user_id)
        return {"success": True, "documents": docs}
    except HTTPException:
        raise
    except Exception:
        _raise_internal_error("Failed to fetch knowledge documents.")


@app.get("/search")
def search(
    user_id: int = Query(...),
    query: str = Query(..., max_length=4000),
    limit: int = Query(5, ge=1, le=10),
    _: None = Depends(require_internal_api_key),
):
    try:
        # Search the knowledge base by meaning using vector embeddings.
        results = rag_service.semantic_search(user_id, query, limit)
        return {"success": True, "results": results}
    except HTTPException:
        raise
    except Exception:
        _raise_internal_error("Failed to run semantic search.")


@app.post("/answer", dependencies=[Depends(require_internal_api_key)])
def answer_question(req: AnswerRequest):
    try:
        # Generate an answer using both Gemini and retrieved knowledge-base content.
        res = rag_service.answer_with_retrieval(req.user_id, req.question)
        return {"success": True, **res}
    except HTTPException:
        raise
    except Exception:
        _raise_internal_error("Failed to generate RAG answer.")


@app.post("/wellness-guide", dependencies=[Depends(require_internal_api_key)])
def generate_wellness_guide_recommendation(req: WellnessGuideRequest):
    try:
        res = rag_service.generate_wellness_guide(req.user_id, req.question)
        return {"success": True, **res}
    except HTTPException:
        raise
    except Exception:
        _raise_internal_error("Failed to generate wellness guide.")
        
@app.post("/embed", dependencies=[Depends(require_internal_api_key)])
def embed_text(req: EmbedRequest):
    try:
        embedding = rag_service.create_embedding(req.text)
        return {"success": True, "embedding": embedding}
    except HTTPException:
        raise
    except Exception:
        _raise_internal_error("Failed to create embedding.")

@app.post("/chat", dependencies=[Depends(require_internal_api_key)])
def chat_completion(req: ChatRequest):
    try:
        # Generate a chat reply using Gemini plus user personalization context.
        res = rag_service.chat_completion(req.user_id, req.messages)
        return {"success": True, "answer": res}
    except HTTPException:
        raise
    except Exception:
        _raise_internal_error("Failed to generate chat completion.")
