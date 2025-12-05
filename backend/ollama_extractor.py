"""
Backend service for AI question extraction using Ollama (local, free)
Ollama runs locally on the server - no API keys, completely free
"""

import os
import json
import logging
from typing import Optional, List, Dict, Any
import httpx
import asyncio
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Ollama configuration
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'mistral')  # Free model alternatives: mistral, llama2, neural-chat
REQUEST_TIMEOUT = 120  # Ollama can be slow on first run

# System prompt for question extraction
EXTRACTION_PROMPT = """You are an expert at extracting educational questions from text.
Extract ALL questions from the provided text and return ONLY valid JSON array.

For each question, include:
- type: "multiple_choice", "true_false", "fill_blank", or "short_answer"
- question_text: the full question (must be valid text)
- options: array of options (empty for non-MCQ)
- correct_answer: the correct answer (can be null)
- points: number (1-100)
- difficulty: "easy", "medium", or "hard"

Return ONLY valid JSON array, no markdown, no explanations.
Example: [{"type":"multiple_choice","question_text":"What is 2+2?","options":["3","4","5"],"correct_answer":"4","points":1,"difficulty":"easy"}]"""


class ExtractedQuestion(BaseModel):
    type: str
    question_text: str
    options: List[str] = []
    correct_answer: Optional[str] = None
    points: int = 1
    difficulty: Optional[str] = None


async def check_ollama_available() -> bool:
    """Check if Ollama is running and accessible"""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            return response.status_code == 200
    except Exception as e:
        logger.warning(f"Ollama not available: {e}")
        return False


async def get_available_models() -> List[str]:
    """Get list of available Ollama models"""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [model["name"] for model in data.get("models", [])]
                logger.info(f"Available Ollama models: {models}")
                return models
            return []
    except Exception as e:
        logger.error(f"Error fetching Ollama models: {e}")
        return []


async def extract_questions_with_ollama(text: str, max_questions: int = 50) -> Optional[List[ExtractedQuestion]]:
    """
    Extract questions using local Ollama model
    
    This is completely free and runs locally on the server.
    No API keys, no rate limits, no costs.
    """
    if not text or len(text.strip()) == 0:
        logger.warning("Empty text provided to Ollama extraction")
        return None

    try:
        # Check if Ollama is available
        available = await check_ollama_available()
        if not available:
            logger.error("Ollama is not running. Start it with: ollama serve")
            return None

        # Limit text to prevent memory issues
        limited_text = text[:4000]

        # Clean text: remove null bytes and control characters
        clean_text = (
            limited_text
            .replace('\0', '')
            .replace('\x00', '')
            .encode('utf-8', errors='ignore')
            .decode('utf-8')
        )

        if not clean_text.strip():
            logger.warning("Text became empty after cleaning")
            return None

        prompt = f"""{EXTRACTION_PROMPT}

TEXT TO EXTRACT FROM:
{clean_text}

Extract {max_questions} questions maximum. Return ONLY valid JSON."""

        logger.info(f"🤖 Calling Ollama ({OLLAMA_MODEL}) for question extraction...")

        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.2,  # Lower temperature for consistency
                    "top_p": 0.9,
                    "top_k": 40,
                },
            )

            if response.status_code != 200:
                logger.error(f"❌ Ollama error ({response.status_code}): {response.text}")
                return None

            result = response.json()
            generated_text = result.get("response", "")

            if not generated_text:
                logger.warning("No response from Ollama")
                return None

            logger.info(f"📥 Ollama response received ({len(generated_text)} chars)")

            # Clean response: extract JSON if wrapped in markdown
            json_text = generated_text
            if "```json" in json_text:
                json_text = json_text.split("```json")[1].split("```")[0]
            elif "```" in json_text:
                json_text = json_text.split("```")[1].split("```")[0]

            json_text = json_text.strip()

            try:
                questions_data = json.loads(json_text)
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Ollama JSON response: {e}")
                logger.error(f"Response was: {json_text[:500]}")
                return None

            if not isinstance(questions_data, list):
                logger.warning("Response is not a JSON array")
                return None

            if len(questions_data) == 0:
                logger.warning("No questions in Ollama response")
                return None

            # Validate and normalize questions
            extracted_questions = []
            for q in questions_data:
                try:
                    # Validate required fields
                    if not q.get("question_text") or len(q.get("question_text", "").strip()) < 5:
                        continue

                    # Normalize type
                    q_type = q.get("type", "multiple_choice").lower()
                    if q_type not in ["multiple_choice", "true_false", "fill_blank", "short_answer"]:
                        q_type = "multiple_choice"

                    # Normalize difficulty
                    difficulty = q.get("difficulty", "medium").lower()
                    if difficulty not in ["easy", "medium", "hard"]:
                        difficulty = "medium"

                    extracted_question = ExtractedQuestion(
                        type=q_type,
                        question_text=q.get("question_text", "").strip(),
                        options=q.get("options", []) or [],
                        correct_answer=q.get("correct_answer"),
                        points=max(1, min(100, int(q.get("points", 1)))),
                        difficulty=difficulty,
                    )
                    extracted_questions.append(extracted_question)
                except Exception as e:
                    logger.warning(f"Skipping invalid question: {e}")
                    continue

            if extracted_questions:
                logger.info(f"✅ Successfully extracted {len(extracted_questions)} questions with Ollama")
                return extracted_questions
            else:
                logger.warning("No valid questions extracted after validation")
                return None

    except asyncio.TimeoutError:
        logger.error(f"⏱️  Ollama request timed out after {REQUEST_TIMEOUT}s - try again later")
        return None
    except httpx.ConnectError as e:
        logger.error(f"❌ Cannot connect to Ollama at {OLLAMA_BASE_URL}: {e}")
        logger.info("Install Ollama from https://ollama.ai and run: ollama serve")
        return None
    except Exception as e:
        logger.error(f"Error calling Ollama: {e}")
        return None


async def extract_questions_fallback(text: str, max_questions: int = 50) -> Optional[List[ExtractedQuestion]]:
    """
    Fallback extraction method (simple regex-based, no AI)
    Used when Ollama is not available
    """
    logger.info("Using fallback (non-AI) extraction method")
    # This would use simple regex patterns - keeping placeholder for now
    # In production, would have regex-based extraction like localParser.ts
    return None
