from fastapi import FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from .services import rag_service

app = FastAPI(
    title="MindAnchor RAG Service",
    description="Python microservice for Retrieval-Augmented Generation, Semantic Search and Embeddings",
    version="1.0.0"
)

# Request / Response Schemas
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
    return {"status": "ok", "service": "mindanchor-rag"}



@app.post("/knowledge", status_code=status.HTTP_201_CREATED)
def create_knowledge(req: KnowledgeCreateRequest):
    try:
        doc = rag_service.insert_knowledge_document(
            user_id=req.user_id,
            title=req.title,
            content=req.content,
            source=req.source,
            category=req.category,
            tags=req.tags
        )
        return {"success": True, "document": doc}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create knowledge document: {str(e)}"
        )


@app.get("/knowledge")
def get_knowledge(user_id: int = Query(...)):
    try:
        docs = rag_service.get_knowledge_documents(user_id)
        return {"success": True, "documents": docs}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch knowledge documents: {str(e)}"
        )


@app.get("/search")
def search(
    user_id: int = Query(...),
    query: str = Query(..., max_length=4000),
    limit: int = Query(5, ge=1, le=10)
):
    try:
        results = rag_service.semantic_search(user_id, query, limit)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run semantic search: {str(e)}"
        )


@app.post("/answer")
def answer_question(req: AnswerRequest):
    try:
        res = rag_service.answer_with_retrieval(req.user_id, req.question)
        return {"success": True, **res}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate RAG answer: {str(e)}"
        )


@app.post("/wellness-guide")
def generate_wellness_guide_recommendation(req: WellnessGuideRequest):
    try:
        res = rag_service.generate_wellness_guide(req.user_id, req.question)
        return {"success": True, **res}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate wellness guide: {str(e)}"
        )
        
@app.post("/embed")
def embed_text(req: EmbedRequest):
    try:
        embedding = rag_service.create_embedding(req.text)
        return {"success": True, "embedding": embedding}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create embedding: {str(e)}"
        )

@app.post("/chat")
def chat_completion(req: ChatRequest):
    try:
        res = rag_service.chat_completion(req.user_id, req.messages)
        return {"success": True, "answer": res}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate chat completion: {str(e)}"
        )
