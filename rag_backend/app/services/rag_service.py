import re
import json
import math
from typing import List, Dict, Any, Tuple, Optional
from ..config import settings
from ..database import get_db_connection

# Safety Risk Assessment Logic

# Imminent risk — specific statements of immediate intent (checked first, highest priority)
IMMINENT_RISK_PATTERNS = [
    re.compile(r"\bi am going to kill myself\b", re.IGNORECASE),
    re.compile(r"\bi'm going to kill myself\b", re.IGNORECASE),
    re.compile(r"\bi will kill myself\b", re.IGNORECASE),
    re.compile(r"\bi have a plan\b", re.IGNORECASE),
    re.compile(r"\btonight is the night\b", re.IGNORECASE),
    re.compile(r"\bgoodbye forever\b", re.IGNORECASE),
]

# Possible risk — broader indicators of distress or self-harm ideation
POSSIBLE_RISK_PATTERNS = [
    re.compile(r"\bsuicid(e|al)\b", re.IGNORECASE),
    re.compile(r"\bself[-\s]?harm\b", re.IGNORECASE),
    re.compile(r"\bhurt myself\b", re.IGNORECASE),
    re.compile(r"\bkill myself\b", re.IGNORECASE),
    re.compile(r"\bend my life\b", re.IGNORECASE),
    re.compile(r"\bi do not want to live\b", re.IGNORECASE),
    re.compile(r"\bcan't go on\b", re.IGNORECASE),
    re.compile(r"\bno reason to live\b", re.IGNORECASE),
    re.compile(r"\bhopeless\b", re.IGNORECASE),
    re.compile(r"\bharm others\b", re.IGNORECASE),
    re.compile(r"\bhurt someone\b", re.IGNORECASE),
]



SAFETY_INSTRUCTIONS = """
Safety rules:
- Detect possible self-harm, suicide risk, hopelessness about being alive, intent to harm others, or imminent danger from the user's message.
- If there is possible imminent risk, respond calmly and encourage the user to contact emergency services, local crisis support, or a trusted person immediately.
- Encourage seeking human support when appropriate, including trusted friends, family, clinicians, or emergency care.
- Do not diagnose the user or say they definitely have any mental health condition.
- Make clear that MindAnchor is a support tool and not a replacement for professional care.
- Validate emotions without reinforcing harmful beliefs, delusions, paranoia, hopelessness, or self-blame.
- Do not provide instructions that could enable self-harm, suicide, violence, or unsafe behavior.
""".strip()

RAG_INSTRUCTIONS = f"""
You are MindAnchor, a supportive wellness companion inside a mental health journaling app.
You are NOT a therapist, doctor, or crisis service. You provide gentle, evidence-informed reflections based on the user's mood label, journal/general entries, recent history, and relevant excerpts retrieved from trusted psychoeducational material.

Inputs you will receive:
1. USER_MOOD_LABEL: the plain-language mood label saved by the app. Always use this label to reason about mood; do not try to interpret the raw emoji yourself.
2. USER_JOURNAL_ENTRY: free-text reflection the user wrote about their day or feelings.
3. RECENT_HISTORY: the user's recent mood labels, and journal/general snippets, when available.
4. RETRIEVED_CONTEXT: passages retrieved via RAG from vetted resources.

How to respond:
- Treat USER_MOOD_LABEL as the emotional headline and USER_JOURNAL_ENTRY as the context behind it. 
- Start by briefly acknowledging what the user shared in your own words. Reflect the feeling and situation.
- If USER_MOOD_LABEL and USER_JOURNAL_ENTRY seem to conflict, then also you have  to follow  both signals.
- Ground feedback in RETRIEVED_CONTEXT where relevant. Paraphrase naturally; never quote source text directly or cite it like a research paper.
- If RETRIEVED_CONTEXT does not clearly apply, do not force it. Rely on general supportive principles instead.
- Offer two- three small, concrete, doable suggestion, not a list. Tie it to something specific from the journal if possible.
- If RECENT_HISTORY shows a negative trend or recurring theme, gently name the pattern without alarming the user, and suggest professional support if it continues.
- Keep the tone warm, plain-spoken, and non-clinical. Avoid therapy-speak and jargon.
- Never diagnose or label the user's experience with a clinical term unless they used that term first.
- Keep responses short: 3 to 5 sentences for a normal entry. Do not over-explain.

Safety rules:
- If the journal entry or mood label choice indicates self-harm, suicidal thoughts, hopelessness about being alive, or intent to harm others, do not proceed with normal feedback. Respond warmly, directly provide local emergency/crisis support, and encourage the user to reach out to someone now. Do not attempt to coach them through this yourself.
- Do not give specific medical, diagnostic, or medication advice.
- Do not tell the user their feelings are wrong; validate first, then gently support.
- If the entry is ambiguous but concerning, err on the side of checking in supportively rather than assuming.

Output format:
Return a short, natural paragraph only. No headers, no bullet lists, no markdown, and no JSON.

{SAFETY_INSTRUCTIONS}
""".strip()

def assess_safety_risk(message: str) -> Dict[str, Any]:
    # Check imminent risk first — most urgent, most specific
    for pattern in IMMINENT_RISK_PATTERNS:
        if pattern.search(message):
            return {
                "hasCrisisRisk": True,
                "riskLevel": "imminent",
                "response": (
                    "I'm really sorry you're feeling this much pain. Your safety matters right now. "
                    "Please contact local emergency services immediately, contact local crisis support, "
                    "or reach out to a trusted person who can stay with you. If you can, move away from "
                    "anything you could use to hurt yourself or someone else while you get help. "
                    "MindAnchor is a support tool, not a replacement for emergency or professional care."
                )
            }

    # Then check possible risk — broader distress signals
    for pattern in POSSIBLE_RISK_PATTERNS:
        if pattern.search(message):
            return {
                "hasCrisisRisk": True,
                "riskLevel": "possible",
                "response": (
                    "I'm really sorry you're carrying this. You do not have to handle it alone. "
                    "If you might hurt yourself, hurt someone else, or feel unable to stay safe, please contact "
                    "local emergency services now, reach out to a trusted "
                    "person nearby. MindAnchor can support you, but it is not a replacement for crisis or "
                    "professional care."
                )
            }

    return {"hasCrisisRisk": False, "riskLevel": "none"}




# Fallback message when Gemini's own safety filter blocks the response
GEMINI_SAFETY_RESPONSE = (
    "I'm really sorry you're carrying this. You do not have to handle it alone. "
    "If you might hurt yourself, hurt someone else, or feel unable to stay safe, "
    "please contact local emergency services or reach out to a trusted person nearby. "
    "MindAnchor can support you, but it is not a replacement for crisis or professional care."
)


def _safe_get_text(response) -> str:
    """
    Safely extract text from a Gemini response.
    If Gemini's own safety filter blocked the response (BlockedPromptException
    or StopCandidateException), return the standard safety message instead of crashing.
    """
    try:
        return response.text.strip()
    except Exception:
        # Gemini raised an exception — likely a safety block on its end
        return GEMINI_SAFETY_RESPONSE


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    dot_product = sum(a * b for a, b in zip(v1, v2))
    magnitude_v1 = math.sqrt(sum(a * a for a in v1))
    magnitude_v2 = math.sqrt(sum(b * b for b in v2))
    if magnitude_v1 == 0 or magnitude_v2 == 0:
        return 0.0
    return dot_product / (magnitude_v1 * magnitude_v2)


def create_embedding(text: str) -> List[float]:
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    response = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text,
         output_dimensionality=settings.EMBEDDING_DIMENSIONS
    )
    return response['embedding']


def get_personalization_context(user_id: int) -> str:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # Get latest mood for immediate emotional state
            cur.execute(
                """
                SELECT mood
                FROM moods
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,)
            )
            latest_mood_row = cur.fetchone()
            latest_mood = latest_mood_row[0] if latest_mood_row else ""

            # Get moods (last 14 days) for mood pattern
            cur.execute(
                """
                SELECT mood, COUNT(*) AS count
                FROM moods
                WHERE user_id = %s
                  AND created_at >= NOW() - INTERVAL '14 days'
                GROUP BY mood
                ORDER BY count DESC, mood ASC
                LIMIT 8
                """,
                (user_id,)
            )
            moods = ", ".join(f"{r[0]}: {r[1]}" for r in cur.fetchall())

            # Get journals (last 5)
            cur.execute(
                """
                SELECT title, content
                FROM journals
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 5
                """,
                (user_id,)
            )
            journals = "\n".join(f"{r[0]}: {r[1]}" for r in cur.fetchall())

    return f"""
Latest mood:
{latest_mood if latest_mood else "No mood logged yet."}

Recent mood history:
{moods if moods else "No recent mood entries."}

Recent journal/general entries:
{journals if journals else "No recent journal entries."}
""".strip()


def get_latest_mood_label(user_id: int) -> str:
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT mood
                    FROM moods
                    WHERE user_id = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                    """,
                    (user_id,)
                )
                row = cur.fetchone()
                return row[0] if row else ""
    except Exception:
        return ""


def semantic_search(user_id: int, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    query_embedding = create_embedding(query)
    query_embedding_str = json.dumps(query_embedding)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id,
                       user_id,
                       category,
                       title,
                       content,
                       source,
                       tags,
                       is_curated,
                       created_at,
                       updated_at,
                       1 - (embedding::vector <=> %s::vector) as similarity
                FROM knowledge_base
                WHERE user_id = %s OR user_id IS NULL
                ORDER BY embedding::vector <=> %s::vector
                LIMIT %s
                """,
                (query_embedding_str, user_id, query_embedding_str, limit)
            )
            
            results = []
            for row in cur.fetchall():
                results.append({
                    "id": row[0],
                    "user_id": row[1],
                    "category": row[2],
                    "title": row[3],
                    "content": row[4],
                    "source": row[5],
                    "tags": row[6],
                    "is_curated": row[7],
                    "created_at": row[8].isoformat() if row[8] else None,
                    "updated_at": row[9].isoformat() if row[9] else None,
                    "similarity": float(row[10]) if row[10] is not None else 0.0
                })
            
            return results
def insert_knowledge_document(
    user_id: Optional[int],
    title: str,
    content: str,
    source: Optional[str],
    category: str = "User Wellness Notes",
    tags: List[str] = None
) -> Dict[str, Any]:
    if tags is None:
        tags = []

    text_to_embed = f"{title}\n\n{content}"
    embedding = create_embedding(text_to_embed)
    embedding_str = json.dumps(embedding)

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO knowledge_base
                  (user_id, category, title, content, source, tags, is_curated, embedding)
                VALUES (%s, %s, %s, %s, %s, %s, false, %s)
                RETURNING id, user_id, category, title, content, source, tags,
                          is_curated, created_at, updated_at
                """,
                (user_id, category, title, content, source, tags, embedding_str)
            )
            row = cur.fetchone()
            conn.commit()

            return {
                "id": row[0],
                "user_id": row[1],
                "category": row[2],
                "title": row[3],
                "content": row[4],
                "source": row[5],
                "tags": row[6],
                "is_curated": row[7],
                "created_at": row[8].isoformat() if row[8] else None,
                "updated_at": row[9].isoformat() if row[9] else None,
            }


def get_knowledge_documents(user_id: int) -> List[Dict[str, Any]]: #It simply retrieves all knowledge available to a particular user: and prioritizes curated material:
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, category, title, content, source, tags,
                       is_curated, created_at, updated_at
                FROM knowledge_base
                WHERE user_id = %s OR user_id IS NULL
                ORDER BY is_curated DESC, created_at DESC
                """,
                (user_id,)
            )
            results = []
            for row in cur.fetchall():
                results.append({
                    "id": row[0],
                    "user_id": row[1],
                    "category": row[2],
                    "title": row[3],
                    "content": row[4],
                    "source": row[5],
                    "tags": row[6],
                    "is_curated": row[7],
                    "created_at": row[8].isoformat() if row[8] else None,
                    "updated_at": row[9].isoformat() if row[9] else None,
                })
            return results


def parse_structured_response(raw_text: str) -> Tuple[str, List[Dict[str, Any]]]:
    try:
        # Find JSON boundaries if the model accidentally prepended markdown formatting
        text = raw_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        data = json.loads(text)
        answer = data.get("answer", "")
        recommendations = data.get("recommendations", [])
        return answer, recommendations
    except Exception:
        # Current prompts ask for plain text; JSON parsing is kept for legacy responses.
        return raw_text, []


def generate_response(
    user_id: int,
    question: str,
    depth: str = "light"     # "light" (old /answer) or "deep" (old /wellness-guide)
) -> Dict[str, Any]:
    """
    Shared pipeline for both /answer and /wellness-guide.

    depth="light": reacts to a single entry, using the user's latest
                   mood label to nudge retrieval. Retrieves 5 sources.
    depth="deep":  looks at broader patterns — folds full mood/journal/
                   assessment history into the retrieval query itself.
                   Retrieves 7 sources.
    """
    safety = assess_safety_risk(question)
    if safety["hasCrisisRisk"]:
        return {
            "answer": safety["response"],
            "recommendations": [],
            "sources": [],
            "safety": safety
        }

    latest_mood = get_latest_mood_label(user_id)
    personalization = get_personalization_context(user_id)

    if depth == "deep":
        retrieval_query = f"{question}\n\n{personalization}"
        limit = 7
    else:  # "light" — and the safe default for any unrecognized value
        retrieval_query = f"{question}\n\nMood label: {latest_mood}\n\n{personalization}"
        limit = 5

    sources = semantic_search(user_id, retrieval_query, limit=limit)
    if not sources:
        return {
            "answer": "No wellness knowledge base content found.",
            "recommendations": [],
            "sources": [],
            "safety": safety
        }

    context = "\n\n".join(
        f"Source {i+1} ({doc.get('category', '')}): {doc['title']}\n{doc['content']}"
        for i, doc in enumerate(sources)
    )

    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="models/gemini-3.6-flash",
        system_instruction=RAG_INSTRUCTIONS
    )
    response = model.generate_content(
        f"USER_MOOD_EMOJI: Not provided\n"
        f"USER_MOOD_LABEL: {latest_mood if latest_mood else 'Not provided'}\n"
        f"USER_JOURNAL_ENTRY: {question}\n"
        f"RECENT_HISTORY: {personalization}\n"
        f"RETRIEVED_CONTEXT: {context}"
    )
    raw_answer = _safe_get_text(response)
    answer, recommendations = parse_structured_response(raw_answer)

    return {
        "answer": answer,
        "recommendations": recommendations,
        "sources": sources,
        "safety": safety
    }


def answer_with_retrieval(user_id: int, question: str) -> Dict[str, Any]:
    return generate_response(user_id, question, depth="light")


def generate_wellness_guide(user_id: int, question: str) -> Dict[str, Any]:
    return generate_response(user_id, question, depth="deep")



def chat_completion(user_id: int, messages: List[Dict[str, str]]) -> str:
    latest_mood = get_latest_mood_label(user_id)
    personalization = get_personalization_context(user_id)
    system_instruction = f"""
{RAG_INSTRUCTIONS}

User personalization context:
USER_MOOD_LABEL: {latest_mood if latest_mood else 'Not provided'}
RECENT_HISTORY:
{personalization}
""".strip()

    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured.")
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name="models/gemini-3.6-flash",
        system_instruction=system_instruction
    )

    #So it doesn't drop every assistant message — only ones sitting right at the very front, before any user message has appeared, because those are the ones that would violate Gemini's "must start with user
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        
        # Gemini must start with a 'user' message. Skip leading model messages.
        if not contents and role == "model":
            continue
            
        # If the current message has the same role as the previous one, merge their texts.
        if contents and contents[-1]["role"] == role:
            contents[-1]["parts"][0]["text"] += "\n" + msg["content"]
        else:
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
            
    # If after filtering we have no messages, fallback to a dummy user message to avoid empty input
    if not contents:
        contents.append({
            "role": "user",
            "parts": [{"text": "Hello"}]
        })
        
    response = model.generate_content(contents)
    return _safe_get_text(response)