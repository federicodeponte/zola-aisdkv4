#!/usr/bin/env python3
"""Standalone Deep Research workflow with citation verification.

Usage:
  python deep_research_runner.py "Explain the 2025 AI chip supply chain outlook"

Set environment variables beforehand:
  export GEMINI_API_KEY="your-google-generative-ai-key"
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import os
import textwrap
import time
from dataclasses import dataclass, asdict
from typing import Any, Dict, Iterable, List, Optional, Tuple

import google.generativeai as genai
import requests


GEMINI_MODEL_RESEARCH = "models/gemini-2.5-pro"
GEMINI_MODEL_RELEVANCE = "models/gemini-2.5-flash"
HEAD_TIMEOUT_SECONDS = 5
MAX_OUTPUT_TOKENS = 32_768
RESEARCH_TIMEOUT_SECONDS = 600  # 10 minutes


@dataclass
class ConversationMessage:
  role: str
  content: str


@dataclass
class Citation:
  title: str
  url: str
  description: Optional[str] = None
  originalUrl: Optional[str] = None


@dataclass
class VerifiedCitation(Citation):
  verified: bool = False
  verificationStatus: str = "warning"  # valid | warning | failed
  verificationDetails: Dict[str, Any] = None


def configure_gemini(api_key: Optional[str] = None) -> None:
  key = api_key or os.environ.get("GEMINI_API_KEY")
  if not key:
    raise RuntimeError("Missing GEMINI_API_KEY")
  genai.configure(api_key=key)


def build_research_prompt(question: str, website_context: Optional[str]) -> str:
  base_prompt = textwrap.dedent(
    f"""\
    DEEP RESEARCH TASK:
    {question}

    RESEARCH METHODOLOGY:
    1. Break this question into 3-5 focused sub-questions that cover different aspects.
    2. For each sub-question:
       - Use Google Search to find the most current, authoritative information.
       - Analyze multiple sources to identify patterns and consensus.
       - Note any conflicting viewpoints or data.
    3. Synthesize all findings into a comprehensive, well-structured answer.
    4. Include specific examples, data points, and statistics where relevant.
    5. Cite ALL sources with proper attribution.

    RESEARCH QUALITY STANDARDS:
    - Prioritize recent sources (2023-2025) for current trends.
    - Cross-reference multiple authoritative sources.
    - Distinguish between facts, opinions, and predictions.
    - Acknowledge uncertainties or knowledge gaps.
    - Provide actionable insights, not just information.

    Begin your deep research now."""
  )

  if not website_context:
    return base_prompt

  context_block = textwrap.dedent(
    f"""\
    ═══════════════════════════════════════════════════════════
    BUSINESS CONTEXT (reference when the user says "we/our/company")
    ═══════════════════════════════════════════════════════════
    {website_context.strip()}
    ═══════════════════════════════════════════════════════════

    Use the above context when discussing the user's company or product.
    """
  )
  return context_block + "\n\n" + base_prompt


def run_deep_research(
  question: str,
  *,
  website_context: Optional[str] = None,
  context_messages: Optional[Iterable[ConversationMessage]] = None,
) -> Dict[str, Any]:
  model = genai.GenerativeModel(GEMINI_MODEL_RESEARCH)

  prompt = build_research_prompt(question, website_context)

  contents: List[Dict[str, Any]] = []
  if context_messages:
    for msg in context_messages:
      contents.append({"role": msg.role, "parts": [{"text": msg.content}]})

  contents.append({"role": "user", "parts": [{"text": prompt}]})

  response = model.generate_content(
    contents,
    tools=[
      {"google_search": {}},
      {"url_context": {}},
    ],
    generation_config={
      "temperature": 0.2,
      "top_k": 40,
      "top_p": 0.95,
      "max_output_tokens": MAX_OUTPUT_TOKENS,
    },
    safety_settings=None,
    request_options={"timeout": RESEARCH_TIMEOUT_SECONDS},
  )

  text = response.text.strip() if response.text else ""
  metadata = getattr(response, "candidates", [{}])[0]
  grounding = getattr(metadata, "grounding_metadata", {})

  citations = extract_citations(grounding)
  enriched = enrich_citations(citations)

  if not enriched and grounding.get("web_search_queries"):
    enriched = fallback_citations(grounding["web_search_queries"])

  verified = verify_citations(question, text, enriched)

  return {
    "content": text,
    "citations": [asdict(c) for c in verified],
    "metadata": {
      "model": GEMINI_MODEL_RESEARCH,
      "grounding_supports": len(grounding.get("grounding_supports", [])),
      "search_queries": grounding.get("web_search_queries", []),
      "usage": getattr(response, "usage_metadata", None),
    },
  }


def extract_citations(grounding_metadata: Dict[str, Any]) -> List[Citation]:
  chunks = grounding_metadata.get("grounding_chunks") or []
  citations: List[Citation] = []
  for chunk in chunks:
    web = chunk.get("web") or {}
    uri = web.get("uri")
    if not uri:
      continue
    citations.append(
      Citation(
        title=web.get("title") or uri,
        url=uri,
        description=web.get("description"),
        originalUrl=web.get("originalUrl"),
      )
    )
  return citations


def enrich_citations(citations: List[Citation]) -> List[Citation]:
  seen: Dict[str, Citation] = {}
  for citation in citations:
    key = normalize_url(citation.url)
    if key not in seen:
      seen[key] = citation
  return list(seen.values())


def normalize_url(url: str) -> str:
  normalized = url.strip()
  for prefix in ("http://", "https://"):
    if normalized.startswith(prefix):
      normalized = normalized[len(prefix) :]
  normalized = normalized.split("#", 1)[0]
  normalized = normalized.rstrip("/")
  return normalized.lower()


def fallback_citations(queries: List[str], limit: int = 3) -> List[Citation]:
  return [
    Citation(
      title=f"Search: {query}",
      url=f"https://www.google.com/search?q={requests.utils.quote(query)}",
    )
    for query in queries[:limit]
  ]


def verify_citations(
  question: str,
  answer: str,
  citations: List[Citation],
) -> List[VerifiedCitation]:
  if not citations:
    return []

  flash_model = genai.GenerativeModel(GEMINI_MODEL_RELEVANCE)

  def verify_single(citation: Citation) -> VerifiedCitation:
    issues: List[str] = []
    confidence = 100.0

    url_ok, http_status = check_url_head(citation.url)
    if not url_ok:
      issues.append(f"HEAD request failed ({http_status})")
      confidence -= 50

    content_ok: Optional[bool] = None
    if url_ok:
      content_ok, relevance_reason = relevance_check(
        flash_model, question, answer, citation
      )
      if content_ok is False:
        issues.append(relevance_reason or "Model flagged citation as questionable")
        confidence -= 30

    domain_score = reputation_score(citation.url)
    confidence += domain_score

    status = (
      "valid"
      if confidence >= 80 and url_ok
      else "warning"
      if confidence >= 50 and url_ok
      else "failed"
    )

    return VerifiedCitation(
      **asdict(citation),
      verified=status == "valid",
      verificationStatus=status,
      verificationDetails={
        "urlAccessible": url_ok,
        "httpStatus": http_status,
        "contentRelevant": content_ok,
        "confidence": max(0, min(100, math.floor(confidence))),
        "issues": issues,
      },
    )

  with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
    return list(executor.map(verify_single, citations))


def check_url_head(url: str) -> Tuple[bool, Optional[int]]:
  try:
    response = requests.head(
      url,
      allow_redirects=True,
      timeout=HEAD_TIMEOUT_SECONDS,
    )
    return response.ok, response.status_code
  except requests.RequestException:
    return False, None


def relevance_check(
  model: genai.GenerativeModel,
  question: str,
  answer: str,
  citation: Citation,
) -> Tuple[Optional[bool], Optional[str]]:
  prompt = textwrap.dedent(
    f"""\
    You are a citation verification expert.

    ORIGINAL QUESTION:
    {question}

    EXCERPT FROM ANSWER:
    {answer[:1000]}...

    CITED SOURCE:
    Title: {citation.title}
    URL: {citation.url}
    {f"Description: {citation.description}" if citation.description else ""}

    TASK:
    Decide whether the cited source appears relevant and credible for the claims above.

    Respond with exactly:
    - "RELEVANT" or
    - "QUESTIONABLE" or
    - "IRRELEVANT"

    Then on a new line, give a short (≤15 words) reason.
    """
  )

  try:
    result = model.generate_content(
      prompt,
      generation_config={"temperature": 0.1, "max_output_tokens": 128},
    )
  except Exception as exc:
    return None, f"Relevance check failed: {exc}"

  raw = result.text.strip() if result.text else ""
  first_line, *rest = raw.splitlines()
  reason = rest[0].strip() if rest else ""

  verdict = first_line.upper()
  if "RELEVANT" in verdict:
    return True, reason
  if "QUESTIONABLE" in verdict or "IRRELEVANT" in verdict:
    return False, reason
  return None, "Unclear relevance verdict"


def reputation_score(url: str) -> float:
  lowered = url.lower()
  positive_domains = [
    "gov",
    ".edu",
    "nytimes.com",
    "wsj.com",
    "forbes.com",
    "bloomberg.com",
    "techcrunch.com",
    "wired.com",
    "theverge.com",
    "harvard.edu",
    "stanford.edu",
  ]
  negative_domains = [
    "blogspot.com",
    "wordpress.com/free",
    "wixsite.com",
    "medium.com/@",
  ]

  if any(domain in lowered for domain in negative_domains):
    return -20.0
  if any(domain in lowered for domain in positive_domains):
    return 10.0
  return 0.0


def main() -> None:
  parser = argparse.ArgumentParser(
    description="Run Deep Research with citation verification."
  )
  parser.add_argument("question", help="Research question to investigate.")
  parser.add_argument(
    "--context",
    help="Optional business/website context to prepend.",
  )
  args = parser.parse_args()

  configure_gemini()

  print("🔬 Running deep research…")
  start = time.time()
  result = run_deep_research(args.question, website_context=args.context)
  duration = time.time() - start

  print(f"\n✅ Completed in {duration:.1f}s")
  print("\nAnswer:\n")
  print(result["content"])
  print("\nCitations:")
  for citation in result["citations"]:
    status = citation["verificationStatus"]
    conf = citation["verificationDetails"]["confidence"]
    print(f"- [{status}] ({conf}%) {citation['title']} — {citation['url']}")

  print("\nRaw JSON:")
  print(json.dumps(result, indent=2))


if __name__ == "__main__":
  main()


