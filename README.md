# CodeSentinel

## Autonomous Code Review Agent with Security Vulnerability Detection

> **Version:** 1.0.0 · **Type:** GitHub App + SaaS Platform · **Stack:** Node.js · FastAPI · Next.js · Qdrant · PostgreSQL · Docker · GCP

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Why Existing Tools Fail](#3-why-existing-tools-fail)
4. [Solution Overview](#4-solution-overview)
5. [System Architecture](#5-system-architecture)
6. [Technical Deep Dive](#6-technical-deep-dive)
   - 6.1 [GitHub App & Webhook Layer](#61-github-app--webhook-layer)
   - 6.2 [Analysis Engine (FastAPI)](#62-analysis-engine-fastapi)
   - 6.3 [RAG Pipeline](#63-rag-pipeline)
   - 6.4 [LLM Review Orchestration](#64-llm-review-orchestration)
   - 6.5 [MLOps — Shadow Deployment Layer](#65-mlops--shadow-deployment-layer)
   - 6.6 [Analytics Dashboard](#66-analytics-dashboard)
   - 6.7 [Observability Stack](#67-observability-stack)
7. [Tech Stack](#7-tech-stack)
8. [Database Schema](#8-database-schema)
9. [API Reference](#9-api-reference)
10. [Security Architecture](#10-security-architecture)
11. [Deployment Architecture](#11-deployment-architecture)
12. [CI/CD Pipeline](#12-cicd-pipeline)
13. [MLOps Pipeline](#13-mlops-pipeline)
14. [Feature Roadmap](#14-feature-roadmap)
15. [Revenue Model](#15-revenue-model)
16. [Competitive Analysis](#16-competitive-analysis)
17. [Business Deep Dive](#17-business-deep-dive)

---

## 1. Executive Summary

CodeSentinel is a GitHub App that autonomously reviews every pull request — not just for code style, but for **context-aware security vulnerabilities**, logic flaws, OWASP Top 10 risks, and performance regressions. It posts structured, human-readable review comments directly on the PR diff with exact line references and actionable remediation suggestions.

At its core, CodeSentinel combines a **RAG (Retrieval-Augmented Generation) pipeline** over a curated CVE + OWASP corpus with a production LLM to generate security reviews that are contextually aware — not just static pattern matching. It also implements an **MLOps shadow deployment** system where new model versions run silently in parallel before promotion, an architectural decision that demonstrates production ML maturity.

**What makes it differentiated:**

- Reviews code the way a senior security engineer would — understanding *context*, not just matching signatures
- Every finding is backed by a CVE / CWE reference retrieved from a live vector database
- Shadow mode MLOps means the review quality continuously improves without production risk
- An analytics dashboard surfaces vulnerability trends across an organization's entire codebase over time

**Skill signals for recruiters:** Full-stack engineering · LLM integration · RAG architecture · Vector databases · MLOps · GitHub App development · Cloud infrastructure (GCP) · Terraform IaC · Observability (Prometheus + Grafana) · CI/CD

---

## 2. Problem Statement

### The core pain

Startups and engineering teams merge code with security vulnerabilities daily. The reasons are structural:

**Manual code review is a bottleneck.** Senior engineers who can spot a subtle SQL injection or a SSRF vulnerability are reviewing 15 PRs a day. Security review depth degrades under time pressure. On a team of 10 engineers shipping fast, the security review is the first thing that gets shortcut.

**Static analysis tools are blind to context.** Tools like SonarQube, Semgrep, and Snyk catch known patterns — they are essentially regex over an AST. They don't understand:

- Whether this specific API endpoint is exposed to the public internet or internal only
- Whether the JWT validation logic *downstream* compensates for a weak check *upstream*
- Whether a rate-limit bypass in isolation is exploitable given the specific auth model of this codebase

**The result:** Companies ship OWASP Top 10 vulnerabilities into production regularly. The average time to detect a vulnerability post-merge is 197 days (IBM Cost of Data Breach Report, 2024). The average cost of a data breach for a startup: $4.2M. Most startups don't survive it.

### Who suffers

- **Engineering teams at early-stage startups** (5–50 engineers) who cannot afford a dedicated AppSec engineer but are shipping real user data
- **Mid-size product companies** whose security reviews are done by the same developer who wrote the code
- **Open source projects** with no formal review process at all
- **CTOs and VPEs** who have no visibility into the security posture of their codebase over time — until something breaks

---

## 3. Why Existing Tools Fail

| Tool | What it does | Why it's insufficient |
| ------ | ------------- | ---------------------- |
| **SonarQube** | Static AST analysis, code smell detection | Pattern-matching only; zero LLM context; no CVE-backed reasoning; high false positives |
| **Snyk** | Dependency vulnerability scanning | Only scans `package.json` / `requirements.txt`; misses logic-layer vulnerabilities entirely |
| **Semgrep** | Rule-based pattern matching | Requires writing custom rules; no natural language reasoning; enterprise pricing for teams |
| **GitHub Advanced Security** | CodeQL + secret scanning | CodeQL is powerful but requires significant setup; no AI layer; GitHub-only |
| **Manual review** | Human security engineers | Doesn't scale; expensive ($150–300/hr for AppSec contractors); inconsistent coverage |
| **Copilot / Cursor suggestions** | Inline code completion | Reactive, not proactive; no PR-level review; no CVE database grounding; no org-level trends |

**The gap CodeSentinel fills:** Context-aware, CVE-grounded, LLM-powered review that posts actionable findings directly into the PR workflow, at a price point accessible to startups, with zero setup friction.

---

## 4. Solution Overview

CodeSentinel operates as a **GitHub App** installed on a repository or organization. Once installed:

1. Every PR triggers a webhook to CodeSentinel's backend
2. The system fetches the PR diff (changed files + line context)
3. The **RAG pipeline** retrieves relevant vulnerability patterns from a Qdrant vector database containing CVE, CWE, and OWASP data
4. The **LLM orchestrator** sends the diff + retrieved context to the review model
5. Findings are structured, deduplicated, and severity-scored
6. **Review comments** are posted directly on the PR at the exact lines of concern
7. A **summary review** is posted as a PR-level comment with a security score, risk summary, and actionable checklist
8. All findings feed into the **analytics dashboard** for org-level trend visibility
9. In parallel, a **shadow model** processes the same PR for comparison — new model versions are promoted only after statistical validation

```
GitHub PR Event
      │
      ▼
Webhook Server (Node.js)
      │
      ├──► Queue Job (Redis/BullMQ)
      │
      ▼
Analysis Engine (FastAPI)
      │
      ├──► Diff Parser
      │         │
      │         ▼
      │    RAG Pipeline ──► Qdrant Vector DB (CVE + OWASP corpus)
      │         │
      │         ▼
      │    LLM Orchestrator ──► Claude / GPT-4 API
      │         │
      │         ▼
      │    Findings Structurer
      │         │
      ├──────────────────────────────────────────┐
      │ Production path                          │ Shadow path
      ▼                                          ▼
GitHub API                              Shadow Results DB
(Post PR comments)                      (No user-visible output)
      │
      ▼
PostgreSQL (findings storage)
      │
      ▼
Next.js Dashboard
```

---

## 5. System Architecture

### Services

CodeSentinel is a **microservices architecture** with four core services:

```
┌─────────────────────────────────────────────────────────────┐
│                      CodeSentinel Platform                   │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  GitHub App  │    │   Analysis   │    │  Dashboard   │  │
│  │  Webhook Srv │    │   Engine     │    │  (Next.js)   │  │
│  │  (Node.js /  │───►│  (FastAPI /  │───►│              │  │
│  │  TypeScript) │    │  Python)     │    │  React + TS  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│          │                  │                   │           │
│          ▼                  ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Redis       │    │  Qdrant      │    │  PostgreSQL  │  │
│  │  (BullMQ     │    │  Vector DB   │    │  (Prisma     │  │
│  │  job queue)  │    │  (CVE corpus)│    │  ORM)        │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Observability Layer                          │  │
│  │   Prometheus ── Grafana ── GCP Cloud Logging        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Language | Responsibility |
| --------- | ---------- | --------------- |
| **Webhook Server** | Node.js / TypeScript | Receives GitHub webhooks, validates signatures, enqueues analysis jobs |
| **Analysis Engine** | Python / FastAPI | Orchestrates diff parsing, RAG retrieval, LLM calls, findings structuring |
| **Dashboard API** | Node.js / Express | Serves analytics data to frontend |
| **Dashboard UI** | Next.js / TypeScript | React analytics dashboard |
| **Ingestion Worker** | Python | Periodic CVE/OWASP data ingestion into Qdrant |

---

## 6. Technical Deep Dive

### 6.1 GitHub App & Webhook Layer

**GitHub App vs OAuth App:** CodeSentinel uses a GitHub App (not OAuth) because:

- Installation-level permissions per repository
- Bot identity for PR comments (`codesentinel[bot]`)
- Webhook events scoped to specific repos without requiring user auth
- Can be installed on orgs, not just individual repos

**Webhook Events Consumed:**

```typescript
// src/webhooks/handlers.ts

const HANDLED_EVENTS = [
  'pull_request.opened',
  'pull_request.synchronize',  // new commits pushed to existing PR
  'pull_request.reopened',
  'pull_request_review.submitted',
]
```

**Webhook Verification:**

```typescript
// src/webhooks/verify.ts
import { createHmac, timingSafeEqual } from 'crypto'

export function verifyGithubSignature(
  payload: Buffer,
  signature: string,
  secret: string
): boolean {
  const expectedSig = `sha256=${createHmac('sha256', secret)
    .update(payload)
    .digest('hex')}`

  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  )
}
```

**Job Queue (BullMQ):**

```typescript
// src/queue/analysisQueue.ts
import { Queue } from 'bullmq'
import { redis } from '../lib/redis'

export const analysisQueue = new Queue('pr-analysis', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
})

export interface AnalysisJobData {
  installationId: number
  repositoryFullName: string
  prNumber: number
  prTitle: string
  headSha: string
  baseSha: string
  diffUrl: string
  authorLogin: string
}
```

---

### 6.2 Analysis Engine (FastAPI)

The Analysis Engine is the core intelligence layer. It receives jobs from the queue, orchestrates the review pipeline, and returns structured findings.

**Main Review Pipeline:**

```python
# app/pipelines/review_pipeline.py
from app.services.diff_parser import DiffParser
from app.services.rag_retriever import RAGRetriever
from app.services.llm_orchestrator import LLMOrchestrator
from app.services.findings_structurer import FindingsStructurer
from app.models.review import ReviewResult

class ReviewPipeline:
    def __init__(self):
        self.diff_parser    = DiffParser()
        self.rag_retriever  = RAGRetriever()
        self.llm            = LLMOrchestrator()
        self.structurer     = FindingsStructurer()

    async def run(self, job_data: AnalysisJobData) -> ReviewResult:
        # 1. Parse the diff into structured code chunks
        chunks = await self.diff_parser.parse(job_data.diff_url)

        # 2. For each chunk, retrieve relevant CVE/OWASP context
        enriched_chunks = []
        for chunk in chunks:
            context_docs = await self.rag_retriever.retrieve(
                code_snippet=chunk.content,
                language=chunk.language,
                top_k=5
            )
            enriched_chunks.append((chunk, context_docs))

        # 3. Send to LLM for review
        raw_review = await self.llm.review(enriched_chunks)

        # 4. Structure and deduplicate findings
        result = self.structurer.structure(raw_review, chunks)

        return result
```

**Diff Parser:**

```python
# app/services/diff_parser.py
import aiohttp
from dataclasses import dataclass
from typing import List
import re

@dataclass
class CodeChunk:
    file_path: str
    language: str
    content: str
    added_lines: List[tuple]   # (line_number, line_content)
    context_lines: List[tuple] # surrounding unchanged lines
    hunk_header: str

class DiffParser:
    LANGUAGE_MAP = {
        '.js': 'javascript', '.ts': 'typescript',
        '.py': 'python', '.go': 'go',
        '.java': 'java', '.rb': 'ruby',
        '.php': 'php', '.rs': 'rust',
    }

    async def parse(self, diff_url: str) -> List[CodeChunk]:
        async with aiohttp.ClientSession() as session:
            async with session.get(diff_url) as resp:
                raw_diff = await resp.text()

        return self._parse_unified_diff(raw_diff)

    def _parse_unified_diff(self, diff: str) -> List[CodeChunk]:
        chunks = []
        current_file = None
        current_added = []
        current_context = []

        for line in diff.split('\n'):
            if line.startswith('diff --git'):
                if current_file and current_added:
                    chunks.append(self._build_chunk(
                        current_file, current_added, current_context
                    ))
                    current_added = []
                    current_context = []
                current_file = self._extract_filename(line)
            elif line.startswith('+') and not line.startswith('+++'):
                current_added.append(line[1:])
            elif not line.startswith('-') and not line.startswith('\\'):
                current_context.append(line)

        return chunks
```

---

### 6.3 RAG Pipeline

The RAG (Retrieval-Augmented Generation) pipeline is the architectural decision that separates CodeSentinel from "just wrapping GPT-4." Every LLM-generated finding is grounded in retrieved CVE, CWE, or OWASP documentation, which:

1. Reduces hallucinations
2. Provides authoritative references for each finding
3. Allows the review prompt to include specific exploit patterns similar to the code being reviewed

**Corpus Sources:**

| Source | Update Frequency | Record Count |
| -------- | ----------------- | -------------- |
| NVD (National Vulnerability Database) | Daily via API | ~220,000 CVEs |
| CWE (Common Weakness Enumeration) | Monthly | ~900 weaknesses |
| OWASP Top 10 patterns | Per release | ~200 patterns |
| Custom internal patterns | Manual | Configurable |

**Ingestion Pipeline:**

```python
# app/ingestion/cve_ingester.py
import asyncio
import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance
from sentence_transformers import SentenceTransformer
from app.models.corpus import CVEDocument

class CVEIngester:
    COLLECTION_NAME = "vulnerability_corpus"
    EMBEDDING_DIM   = 768  # all-mpnet-base-v2

    def __init__(self):
        self.qdrant    = QdrantClient(host="qdrant", port=6333)
        self.embedder  = SentenceTransformer('all-mpnet-base-v2')
        self._ensure_collection()

    def _ensure_collection(self):
        collections = [c.name for c in self.qdrant.get_collections().collections]
        if self.COLLECTION_NAME not in collections:
            self.qdrant.create_collection(
                collection_name=self.COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=self.EMBEDDING_DIM,
                    distance=Distance.COSINE
                )
            )

    async def ingest_nvd_batch(self, start_index: int = 0):
        """Fetch CVEs from NVD API 2.0 and ingest into Qdrant."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://services.nvd.nist.gov/rest/json/cves/2.0",
                params={"startIndex": start_index, "resultsPerPage": 2000},
                headers={"apiKey": SETTINGS.NVD_API_KEY}
            )
            data = resp.json()

        points = []
        for cve in data["vulnerabilities"]:
            doc = self._parse_cve(cve)
            if doc:
                # Create rich embedding text combining description + affected code patterns
                embed_text = (
                    f"Vulnerability: {doc.cve_id}\n"
                    f"Type: {doc.cwe_ids}\n"
                    f"Description: {doc.description}\n"
                    f"Affected patterns: {doc.affected_patterns}\n"
                    f"Severity: {doc.cvss_score} ({doc.severity})"
                )
                vector = self.embedder.encode(embed_text).tolist()

                points.append(PointStruct(
                    id=doc.numeric_id,
                    vector=vector,
                    payload={
                        "cve_id":           doc.cve_id,
                        "cwe_ids":          doc.cwe_ids,
                        "description":      doc.description,
                        "severity":         doc.severity,
                        "cvss_score":       doc.cvss_score,
                        "affected_langs":   doc.affected_languages,
                        "remediation":      doc.remediation_guidance,
                    }
                ))

        self.qdrant.upsert(
            collection_name=self.COLLECTION_NAME,
            points=points
        )
        print(f"Ingested {len(points)} CVE records starting from index {start_index}")
```

**RAG Retriever:**

```python
# app/services/rag_retriever.py
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchAny
from sentence_transformers import SentenceTransformer
from typing import List
from app.models.corpus import RetrievedDoc

class RAGRetriever:
    def __init__(self):
        self.qdrant   = QdrantClient(host="qdrant", port=6333)
        self.embedder = SentenceTransformer('all-mpnet-base-v2')

    async def retrieve(
        self,
        code_snippet: str,
        language: str,
        top_k: int = 5,
        severity_filter: List[str] = None
    ) -> List[RetrievedDoc]:
        """
        Embed the code snippet and retrieve similar vulnerability patterns.
        Language filter narrows results to language-relevant CVEs.
        """
        query_vector = self.embedder.encode(
            f"Code in {language}:\n{code_snippet}"
        ).tolist()

        filters = None
        if language or severity_filter:
            conditions = []
            if language:
                conditions.append(
                    FieldCondition(
                        key="affected_langs",
                        match=MatchAny(any=[language, "any"])
                    )
                )
            if severity_filter:
                conditions.append(
                    FieldCondition(
                        key="severity",
                        match=MatchAny(any=severity_filter)
                    )
                )
            filters = Filter(must=conditions)

        results = self.qdrant.search(
            collection_name="vulnerability_corpus",
            query_vector=query_vector,
            query_filter=filters,
            limit=top_k,
            with_payload=True,
            score_threshold=0.65  # discard low-relevance results
        )

        return [
            RetrievedDoc(
                cve_id=r.payload["cve_id"],
                cwe_ids=r.payload["cwe_ids"],
                description=r.payload["description"],
                severity=r.payload["severity"],
                cvss_score=r.payload["cvss_score"],
                remediation=r.payload["remediation"],
                relevance_score=r.score
            )
            for r in results
        ]
```

---

### 6.4 LLM Review Orchestration

The LLM orchestrator constructs the review prompt with diff content + retrieved CVE context and parses the structured response.

**Prompt Architecture:**

```python
# app/services/llm_orchestrator.py
from anthropic import AsyncAnthropic
import json
from typing import List, Tuple
from app.models.review import RawReviewOutput

SYSTEM_PROMPT = """You are CodeSentinel, an expert security code reviewer with 15 years of 
application security experience. You review code diffs for:

1. Security vulnerabilities (OWASP Top 10, CWE patterns)
2. Authentication and authorization flaws
3. Input validation failures
4. Cryptographic weaknesses
5. Injection vulnerabilities (SQL, NoSQL, command, LDAP)
6. Sensitive data exposure
7. Security misconfiguration
8. Logic flaws that could be exploited

You are provided with:
- The code diff (added lines in context)
- Retrieved CVE/CWE documentation relevant to the code patterns

Your output MUST be valid JSON following the schema provided. Do not include markdown fences.
Be specific: reference exact line numbers. Do not report false positives.
Only flag real security concerns — not style issues."""

class LLMOrchestrator:
    def __init__(self):
        self.client = AsyncAnthropic()

    async def review(
        self,
        enriched_chunks: List[Tuple]
    ) -> RawReviewOutput:

        review_content = self._build_review_content(enriched_chunks)

        response = await self.client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[{
                "role": "user",
                "content": f"""Review the following code diff for security vulnerabilities.

{review_content}

Respond with ONLY a JSON object matching this schema:
{{
  "security_score": <integer 0-100, higher is safer>,
  "overall_risk": <"critical"|"high"|"medium"|"low"|"informational">,
  "summary": <string, 2-3 sentences>,
  "findings": [
    {{
      "file_path": <string>,
      "line_start": <integer>,
      "line_end": <integer>,
      "severity": <"critical"|"high"|"medium"|"low"|"informational">,
      "title": <string, concise>,
      "description": <string, explain the vulnerability and how it could be exploited>,
      "cve_reference": <string or null>,
      "cwe_id": <string e.g. "CWE-89" or null>,
      "owasp_category": <string e.g. "A03:2021 - Injection" or null>,
      "remediation": <string, specific code-level fix suggestion>,
      "code_fix_suggestion": <string, actual corrected code snippet if applicable>
    }}
  ],
  "positive_observations": [<string>],
  "recommended_actions": [<string>]
}}"""
            }]
        )

        return RawReviewOutput(
            raw_json=response.content[0].text,
            model_version="claude-sonnet-4-6",
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens
        )

    def _build_review_content(self, enriched_chunks: List[Tuple]) -> str:
        sections = []
        for chunk, context_docs in enriched_chunks:
            section = f"### File: `{chunk.file_path}`\n"
            section += f"**Language:** {chunk.language}\n\n"
            section += f"```{chunk.language}\n{chunk.content}\n```\n\n"

            if context_docs:
                section += "**Relevant vulnerability patterns from CVE database:**\n"
                for doc in context_docs:
                    section += (
                        f"- **{doc.cve_id}** ({doc.severity}, CVSS {doc.cvss_score}): "
                        f"{doc.description[:300]}... "
                        f"Remediation: {doc.remediation[:200]}\n"
                    )
            sections.append(section)

        return "\n---\n".join(sections)
```

---

### 6.5 MLOps — Shadow Deployment Layer

This is the most architecturally sophisticated component, demonstrating production ML engineering thinking. The shadow deployment system allows new model versions (or prompt variants) to be evaluated against real PR traffic before promotion.

**Why shadow deployment matters:**

When you update the LLM model or change the review prompt, you cannot know if quality improved or degraded without running it on real data. Shadow mode lets both versions run on every PR — but only the production version posts comments. You compare outputs statistically, then promote when confidence is sufficient.

**Shadow Architecture:**

```python
# app/services/shadow_runner.py
import asyncio
from app.models.model_version import ModelVersion
from app.services.llm_orchestrator import LLMOrchestrator
from app.repositories.shadow_repository import ShadowRepository
from app.metrics.shadow_metrics import ShadowMetricsCollector

class ShadowRunner:
    def __init__(self):
        self.shadow_repo    = ShadowRepository()
        self.metrics        = ShadowMetricsCollector()

    async def run_shadow(
        self,
        pr_id: str,
        enriched_chunks: list,
        prod_result,
        shadow_version: ModelVersion
    ):
        """
        Run shadow model on the same input without surfacing output to GitHub.
        Store comparison for offline evaluation.
        """
        shadow_orchestrator = LLMOrchestrator(model=shadow_version.model_id)

        try:
            shadow_result = await shadow_orchestrator.review(enriched_chunks)
            structured    = self._structure(shadow_result)

            comparison = self._compare(prod_result, structured)

            await self.shadow_repo.save_comparison(
                pr_id=pr_id,
                prod_result=prod_result,
                shadow_result=structured,
                comparison_metrics=comparison,
                shadow_version_id=shadow_version.id
            )

            # Emit Prometheus metrics
            self.metrics.record_shadow_comparison(
                shadow_version_id=shadow_version.id,
                severity_delta=comparison.severity_distribution_delta,
                finding_count_delta=comparison.finding_count_delta,
                score_delta=comparison.security_score_delta,
                latency_ms=shadow_result.latency_ms
            )

        except Exception as e:
            self.metrics.record_shadow_failure(shadow_version.id, str(e))
```

**Model Version Management:**

```python
# app/models/model_version.py
from enum import Enum
from dataclasses import dataclass
from datetime import datetime

class DeploymentStatus(Enum):
    SHADOW   = "shadow"      # Running silently, not posted to GitHub
    CANARY   = "canary"      # Posted to 10% of PRs
    STABLE   = "stable"      # Full production
    RETIRED  = "retired"     # No longer used

@dataclass
class ModelVersion:
    id:                str
    model_id:          str          # e.g. "claude-sonnet-4-6"
    prompt_hash:       str          # SHA256 of system prompt
    deployed_at:       datetime
    status:            DeploymentStatus
    shadow_pr_count:   int          # PRs evaluated in shadow mode
    avg_finding_count: float
    false_positive_rate: float | None   # None until human-evaluated
    promotion_threshold: int = 100  # min shadow PRs before promotion eligible
```

**Promotion Logic:**

```python
# app/services/model_promoter.py

class ModelPromoter:
    PROMOTION_CRITERIA = {
        "min_shadow_prs":           100,
        "max_severity_delta":       0.1,    # <10% change in severity distribution
        "max_false_positive_delta": 0.05,   # <5% increase in FP rate
        "min_finding_coverage":     0.95,   # catches ≥95% of prod findings
        "max_latency_p95_ms":       8000,
    }

    async def evaluate_shadow_for_promotion(
        self,
        shadow_version_id: str
    ) -> PromotionEvaluation:
        stats = await self.shadow_repo.get_aggregate_stats(shadow_version_id)

        checks = {
            "sufficient_data":     stats.pr_count >= self.PROMOTION_CRITERIA["min_shadow_prs"],
            "severity_stable":     abs(stats.avg_severity_delta) <= self.PROMOTION_CRITERIA["max_severity_delta"],
            "latency_acceptable":  stats.p95_latency_ms <= self.PROMOTION_CRITERIA["max_latency_p95_ms"],
            "coverage_adequate":   stats.finding_coverage >= self.PROMOTION_CRITERIA["min_finding_coverage"],
        }

        eligible = all(checks.values())

        return PromotionEvaluation(
            shadow_version_id=shadow_version_id,
            eligible=eligible,
            checks=checks,
            recommendation="PROMOTE" if eligible else "CONTINUE_SHADOW",
            stats=stats
        )
```

---

### 6.6 Analytics Dashboard

The Next.js dashboard surfaces org-level security intelligence that no PR-level tool provides.

**Key Dashboard Sections:**

**1. Security Score Trend**

- Rolling 30/60/90-day security score per repository
- Score benchmarking against industry average (anonymized)

**2. Vulnerability Heatmap**

- Files/directories sorted by historical vulnerability density
- Identifies the "riskiest corners" of the codebase

**3. OWASP Category Breakdown**

- Pie/bar chart of findings by OWASP category
- Helps engineering leaders prioritize security training

**4. Author Analysis**

- Aggregate (not punitive) view of which team members introduce which vulnerability types
- Used for targeted training, not blame

**5. Fix Rate Tracking**

- What % of CodeSentinel findings are actually fixed before merge?
- Trend over time shows improving (or declining) security culture

**6. Shadow Model Comparison**

- Admin view: production vs shadow model finding comparison
- Promotion readiness dashboard

```typescript
// components/SecurityScoreTrend.tsx
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface SecurityTrendProps {
  repositoryId: string
  days: 30 | 60 | 90
}

export function SecurityScoreTrend({ repositoryId, days }: SecurityTrendProps) {
  const { data, isLoading } = useSecurityTrend(repositoryId, days)

  return (
    <div className="bg-white rounded-xl border p-6">
      <h3 className="text-sm font-medium text-gray-500 mb-4">
        Security Score — Last {days} days
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(val) => [`${val}/100`, 'Security Score']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#1D9E75"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

---

### 6.7 Observability Stack

```yaml
# monitoring/prometheus-config.yml
scrape_configs:
  - job_name: 'codesentinel-analysis-engine'
    static_configs:
      - targets: ['analysis-engine:8000']
    metrics_path: '/metrics'

  - job_name: 'codesentinel-webhook-server'
    static_configs:
      - targets: ['webhook-server:3000']

  - job_name: 'qdrant'
    static_configs:
      - targets: ['qdrant:6333']
```

**Key Metrics Tracked:**

| Metric | Type | Description |
| -------- | ------ | ------------- |
| `cs_pr_analysis_duration_seconds` | Histogram | End-to-end analysis latency |
| `cs_llm_tokens_used_total` | Counter | LLM token consumption (cost tracking) |
| `cs_findings_by_severity_total` | Counter | Finding volume by severity |
| `cs_rag_retrieval_latency_ms` | Histogram | Qdrant query latency |
| `cs_shadow_comparison_delta` | Gauge | Prod vs shadow finding count delta |
| `cs_false_positive_rate` | Gauge | Human-reported false positives |
| `cs_github_api_rate_limit_remaining` | Gauge | GitHub API quota remaining |

---

## 7. Tech Stack

### Backend

| Component | Technology | Justification |
| ----------- | ----------- | --------------- |
| Webhook Server | Node.js + TypeScript | Native GitHub Octokit SDK; async event handling |
| Analysis Engine | Python + FastAPI | LLM/ML ecosystem is Python-native; async support |
| Job Queue | Redis + BullMQ | Reliable job processing with retry logic; dashboard UI available |
| Vector Database | Qdrant | Best-in-class performance for dense vector search; Docker-friendly |
| Primary Database | PostgreSQL + Prisma | Relational data (repos, findings, users); Prisma for type-safe queries |
| LLM API | Anthropic Claude | Context window; instruction following; JSON output reliability |
| Embeddings | sentence-transformers (all-mpnet-base-v2) | Open source; no per-token cost; deployable on-prem for enterprise |

### Frontend

| Component | Technology |
| ----------- | ----------- |
| Framework | Next.js 15 + App Router |
| Language | TypeScript |
| Charts | Recharts |
| UI Components | shadcn/ui + Tailwind CSS |
| State Management | TanStack Query (React Query) |
| Auth | NextAuth.js (GitHub OAuth) |

### Infrastructure

| Component | Technology |
| ----------- | ----------- |
| Container Runtime | Docker + Docker Compose (dev) |
| Cloud Provider | GCP |
| Deployment | Cloud Run (webhook + analysis engine) |
| Orchestration | Cloud Run (scales to zero, cost-effective) |
| IaC | Terraform |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Logging | GCP Cloud Logging |
| Secrets | GCP Secret Manager |

---

## 8. Database Schema

```sql
-- Repositories installed with CodeSentinel
CREATE TABLE repositories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_repo_id  BIGINT UNIQUE NOT NULL,
  full_name       TEXT NOT NULL,   -- e.g. "acmecorp/backend-api"
  owner_login     TEXT NOT NULL,
  installation_id BIGINT NOT NULL,
  default_branch  TEXT DEFAULT 'main',
  settings        JSONB DEFAULT '{}',
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Pull requests analyzed
CREATE TABLE pull_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id   UUID REFERENCES repositories(id),
  pr_number       INTEGER NOT NULL,
  title           TEXT,
  author_login    TEXT,
  head_sha        TEXT NOT NULL,
  base_sha        TEXT NOT NULL,
  status          TEXT CHECK (status IN ('queued','processing','completed','failed')),
  security_score  INTEGER CHECK (security_score BETWEEN 0 AND 100),
  overall_risk    TEXT CHECK (overall_risk IN ('critical','high','medium','low','informational')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  UNIQUE(repository_id, pr_number, head_sha)
);

-- Individual findings
CREATE TABLE findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id           UUID REFERENCES pull_requests(id) ON DELETE CASCADE,
  file_path       TEXT NOT NULL,
  line_start      INTEGER,
  line_end        INTEGER,
  severity        TEXT CHECK (severity IN ('critical','high','medium','low','informational')),
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  cve_reference   TEXT,
  cwe_id          TEXT,
  owasp_category  TEXT,
  remediation     TEXT,
  code_fix        TEXT,
  is_false_positive BOOLEAN DEFAULT false,
  github_comment_id BIGINT,     -- for updating/resolving on GitHub
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- LLM model versions
CREATE TABLE model_versions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id            TEXT NOT NULL,         -- e.g. "claude-sonnet-4-6"
  prompt_hash         TEXT NOT NULL,
  status              TEXT CHECK (status IN ('shadow','canary','stable','retired')),
  shadow_pr_count     INTEGER DEFAULT 0,
  deployed_at         TIMESTAMPTZ DEFAULT NOW(),
  promoted_at         TIMESTAMPTZ,
  retired_at          TIMESTAMPTZ,
  notes               TEXT
);

-- Shadow model comparison records
CREATE TABLE shadow_comparisons (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id                 UUID REFERENCES pull_requests(id),
  shadow_version_id     UUID REFERENCES model_versions(id),
  prod_findings_count   INTEGER,
  shadow_findings_count INTEGER,
  prod_score            INTEGER,
  shadow_score          INTEGER,
  severity_delta        JSONB,    -- {critical: +1, high: -2, medium: 0, ...}
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Org-level users and billing
CREATE TABLE organizations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  github_org_id   BIGINT UNIQUE NOT NULL,
  login           TEXT NOT NULL,
  plan            TEXT CHECK (plan IN ('free','starter','pro','enterprise')) DEFAULT 'free',
  repo_limit      INTEGER DEFAULT 1,
  billing_email   TEXT,
  stripe_customer_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 9. API Reference

### Webhook Endpoints (Internal)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/github` | Receives GitHub App webhook events |
| `GET` | `/health` | Health check for Cloud Run |

### Dashboard API

| Method | Path | Description |
| -------- | ------ | ------------- |
| `GET` | `/api/repos` | List repos for authenticated org |
| `GET` | `/api/repos/:id/prs` | PR list with security scores |
| `GET` | `/api/repos/:id/findings` | Aggregate findings with filters |
| `GET` | `/api/repos/:id/trend` | Security score trend data |
| `GET` | `/api/repos/:id/heatmap` | File-level vulnerability heatmap |
| `GET` | `/api/shadow/versions` | List model versions (admin) |
| `GET` | `/api/shadow/compare/:versionId` | Shadow vs prod statistics |
| `POST` | `/api/shadow/promote/:versionId` | Promote shadow to stable (admin) |
| `POST` | `/api/findings/:id/false-positive` | Mark finding as false positive |

### Example Response — PR Review Summary

```json
{
  "pr_number": 247,
  "security_score": 62,
  "overall_risk": "high",
  "summary": "This PR introduces a SQL injection vulnerability in the user search endpoint and exposes an internal API key in the error response. Both issues require immediate remediation before merge.",
  "findings": [
    {
      "id": "f-8a3c9d",
      "file_path": "src/routes/users.ts",
      "line_start": 34,
      "line_end": 38,
      "severity": "critical",
      "title": "SQL Injection via unsanitized query parameter",
      "description": "The `search` query parameter is interpolated directly into a raw SQL query without parameterization. An attacker can inject arbitrary SQL, potentially exfiltrating the entire users table or dropping the database.",
      "cve_reference": "CVE-2023-38545",
      "cwe_id": "CWE-89",
      "owasp_category": "A03:2021 - Injection",
      "remediation": "Use parameterized queries or a query builder. Pass `search` as a bound parameter, never via string interpolation.",
      "code_fix_suggestion": "const results = await db.query(\n  'SELECT * FROM users WHERE name ILIKE $1',\n  [`%${search}%`]\n);"
    }
  ],
  "positive_observations": [
    "Password hashing correctly uses bcrypt with cost factor 12",
    "JWT expiry is appropriately set to 15 minutes"
  ],
  "recommended_actions": [
    "Fix the SQL injection in users.ts line 34 before merging",
    "Move API key to environment variable and rotate the exposed key immediately"
  ]
}
```

---

## 10. Security Architecture

### GitHub App Permissions (Principle of Least Privilege)

| Permission | Level | Reason |
| ----------- | ------- | -------- |
| `pull_requests` | Read + Write | Read diff, post review comments |
| `contents` | Read | Read file content for context |
| `metadata` | Read | Repository metadata |

> **CodeSentinel never requests write access to code, secrets, settings, or Actions.**

### Data Handling

- PR diffs are processed in-memory and **never persisted** to disk or long-term storage
- Only structured findings (file path, line number, severity, description) are stored in PostgreSQL — **not raw code**
- All inter-service communication is over mTLS in production
- Qdrant contains only CVE/OWASP corpus data — **no customer code**
- All secrets stored in GCP Secret Manager, injected at runtime
- RBAC: organization admins can see all repos; individual developers see only their assigned repos

### Threat Model

| Threat | Mitigation |
| -------- | ----------- |
| Webhook spoofing | HMAC-SHA256 signature verification on every request |
| LLM prompt injection via malicious code | System prompt clearly scopes model role; findings are JSON-structured not free text |
| CVE corpus poisoning | NVD data fetched only from official NIST endpoint over HTTPS; content hashed |
| GitHub token exposure | Short-lived installation tokens (1 hour), never logged |

---

## 11. Deployment Architecture

```hcl
# terraform/main.tf

module "codesentinel" {
  source = "./modules/codesentinel"

  project_id = var.gcp_project_id
  region     = "asia-south1"

  services = {
    webhook_server = {
      image        = "gcr.io/${var.project}/webhook-server:${var.tag}"
      cpu          = "1"
      memory       = "512Mi"
      min_instances = 1
      max_instances = 10
      concurrency  = 80
    }

    analysis_engine = {
      image        = "gcr.io/${var.project}/analysis-engine:${var.tag}"
      cpu          = "2"
      memory       = "2Gi"
      min_instances = 0      # scales to zero when idle
      max_instances = 20
      concurrency  = 5       # LLM calls are slow; keep concurrency low
    }

    dashboard = {
      image        = "gcr.io/${var.project}/dashboard:${var.tag}"
      cpu          = "1"
      memory       = "512Mi"
      min_instances = 1
      max_instances = 5
    }
  }

  database = {
    tier            = "db-g1-small"
    disk_size_gb    = 20
    deletion_protection = true
  }

  qdrant = {
    machine_type    = "e2-standard-2"
    disk_size_gb    = 50
  }
}
```

---

## 12. CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: CodeSentinel CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  GCP_PROJECT: ${{ secrets.GCP_PROJECT_ID }}
  GCP_REGION: asia-south1

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: codesentinel_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }

      - name: Install dependencies
        run: |
          cd webhook-server && npm ci
          cd ../analysis-engine && pip install -r requirements.txt --break-system-packages

      - name: Run webhook server tests
        run: cd webhook-server && npm test

      - name: Run analysis engine tests
        run: cd analysis-engine && pytest --cov=app tests/

      - name: Run Prisma migrations
        run: cd webhook-server && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost/codesentinel_test

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Build and push images
        run: |
          gcloud builds submit webhook-server/ \
            --tag gcr.io/$GCP_PROJECT/webhook-server:$GITHUB_SHA
          gcloud builds submit analysis-engine/ \
            --tag gcr.io/$GCP_PROJECT/analysis-engine:$GITHUB_SHA

      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy codesentinel-webhook \
            --image gcr.io/$GCP_PROJECT/webhook-server:$GITHUB_SHA \
            --region $GCP_REGION --platform managed
          gcloud run deploy codesentinel-analysis \
            --image gcr.io/$GCP_PROJECT/analysis-engine:$GITHUB_SHA \
            --region $GCP_REGION --platform managed

      - name: Apply Terraform
        run: |
          cd terraform
          terraform init
          terraform apply -auto-approve \
            -var="tag=$GITHUB_SHA"
```

---

## 13. MLOps Pipeline

```
New Prompt / Model Version
          │
          ▼
  Create ModelVersion
  (status: SHADOW)
          │
          ▼
  Shadow runs on every PR
  alongside production model
          │
          ▼
  ShadowMetricsCollector
  emits to Prometheus
          │
          ▼
  Grafana dashboard shows
  prod vs shadow comparison
          │
          ├── [criteria met] → PromotionEvaluation returns PROMOTE
          │                              │
          │                              ▼
          │                   Manual approval gate
          │                   (admin in dashboard)
          │                              │
          │                              ▼
          │                   status → CANARY (10% traffic)
          │                              │
          │                   [7 days, no regressions]
          │                              │
          │                              ▼
          │                   status → STABLE
          │                   Old version → RETIRED
          │
          └── [criteria not met] → Continue shadow, alert Slack
```

---

## 14. Feature Roadmap

### MVP (Month 1–2)

- [x] GitHub App with PR webhook handling
- [x] Diff parsing and chunking
- [x] Basic RAG pipeline with OWASP Top 10 corpus
- [x] LLM review with structured JSON output
- [x] PR comment posting (summary + inline)
- [x] PostgreSQL findings storage

### v1.1 (Month 3–4)

- [ ] Full NVD CVE corpus ingestion (220K+ records)
- [ ] Shadow deployment infrastructure
- [ ] Analytics dashboard (security score, OWASP breakdown)
- [ ] False positive reporting from dashboard
- [ ] Multi-language support (Python, Go, Rust, Java)

### v1.2 (Month 5–6)

- [ ] Grafana monitoring dashboard
- [ ] Stripe billing integration (SaaS launch)
- [ ] GitHub Actions native integration (run on CI)
- [ ] Slack/Discord notifications for critical findings
- [ ] GitLab support

### v2.0 (Month 7–12)

- [ ] On-premise deployment (enterprise, no code leaves network)
- [ ] Custom ruleset editor (org-specific patterns)
- [ ] Jira/Linear ticket auto-creation for critical findings
- [ ] PR blocking for critical findings (optional, per-repo setting)
- [ ] SBOM (Software Bill of Materials) generation

---

## 15. Revenue Model

| Plan | Price | Included |
| ------ | ------- | --------- |
| **Free** | $0/mo | 1 repo, 50 PRs/month, community support |
| **Starter** | $29/mo | 5 repos, unlimited PRs, email support |
| **Pro** | $99/mo | 25 repos, shadow deployment dashboard, Slack alerts |
| **Enterprise** | $499+/mo | Unlimited repos, on-prem option, SSO, SLA, custom rules |

**Unit economics (target Year 2):**

- 500 Starter customers = $14,500/mo
- 150 Pro customers = $14,850/mo
- 20 Enterprise = $10,000/mo
- **Total MRR: ~$40,000 (~$480K ARR)**

---

## 16. Competitive Analysis

| | CodeSentinel | SonarQube | Snyk | GitHub Advanced Security |
| -- | -- | -- | -- | -- |
| LLM-powered context understanding | ✅ | ❌ | ❌ | ❌ |
| CVE-grounded RAG pipeline | ✅ | ❌ | Partial | ❌ |
| Inline PR comments | ✅ | ✅ | ✅ | ✅ |
| MLOps shadow deployment | ✅ | ❌ | ❌ | ❌ |
| Org-level trend analytics | ✅ | ✅ | ✅ | Partial |
| Zero-config GitHub App | ✅ | ❌ | ✅ | ✅ |
| Startup pricing (<$50/mo) | ✅ | ❌ (expensive) | ❌ (expensive) | ❌ (GitHub Enterprise) |
| Self-hostable | Roadmap | ✅ | ❌ | ❌ |

---

## 17. Business Deep Dive

### Why the RAG architecture is the core defensibility

The CVE-grounded RAG pipeline is not just a technical feature — it is the moat. Over time, CodeSentinel accumulates:

1. A proprietary corpus of **false positive feedback** from users (which CVE retrievals led to actual vs. phantom findings)
2. **Codebase-specific vulnerability patterns** (if org-level learning is enabled) that no competitor can replicate without the same install base
3. **Retrieval quality feedback loops** that make the vector search progressively more accurate for specific language/framework combinations

A competitor launching with raw GPT-4 (no RAG, no CVE grounding) produces reviews that feel impressive but aren't verifiably trustworthy. The CVE reference on every finding is what makes an engineer say "this is real" instead of "this might be hallucinated."

---

## 18. Project Structure

```
codesentinel/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── deploy-production.yml
│   │   ├── deploy-staging.yml
│   │   └── security-scan.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── pull_request_template.md
│   └── CODEOWNERS
│
├── services/
│   ├── webhook-server/          # Node.js/TypeScript GitHub App
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── config/
│   │   │   │   ├── index.ts
│   │   │   │   └── env.ts
│   │   │   ├── webhooks/
│   │   │   │   ├── handlers/
│   │   │   │   │   ├── pull-request.handler.ts
│   │   │   │   │   └── index.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── verify-signature.ts
│   │   │   │   │   └── rate-limit.ts
│   │   │   │   └── router.ts
│   │   │   ├── queue/
│   │   │   │   ├── analysis.queue.ts
│   │   │   │   ├── workers/
│   │   │   │   │   └── analysis.worker.ts
│   │   │   │   └── types.ts
│   │   │   ├── github/
│   │   │   │   ├── client.ts
│   │   │   │   ├── installation.service.ts
│   │   │   │   └── review.service.ts
│   │   │   ├── db/
│   │   │   │   ├── prisma/
│   │   │   │   │   └── schema.prisma
│   │   │   │   ├── client.ts
…
```

---

### Why 2026 is the right window

The developer security tooling market is consolidating around two extremes: expensive enterprise platforms (SonarQube enterprise: $20,000+/year) and lightweight free tools with no intelligence (Semgrep free tier). The **middle market** — startups and SMB engineering teams that ship real user data but cannot afford enterprise security tooling — is completely underserved. LLMs crossed the quality threshold for code understanding in 2023–2024. The product is buildable now. The market is waiting.

### The insight nobody else is building

Every existing tool is **reactive** — it tells you what's wrong after you write the code. CodeSentinel's long-term vision is to become **predictive**: given the patterns in your codebase and your team's historical vulnerability introduction rate, forecast where the next vulnerability is likely to emerge before it's written. That requires the historical findings database, the RAG corpus, and the org-level behavioral data that only a deployed product can accumulate. The competitive moat builds with every PR reviewed.

---

*Documentation generated for CodeSentinel v1.0 · Built by [Your Name] · Full source: github.com/your-handle/codesentinel*

-----------------------
-----------------------

# Codemap

An AI tool that helps you understand any GitHub repository quickly — its architecture, folder structure, and how the code connects together.

## The problem

Whenever you join a new project or open a large repo for the first time, it takes days to understand:

- Where does the project start?
- How is authentication handled?
- Which file does what?
- Which function calls which?
- Where is the business logic?

Normally you spend hours going file by file, searching, and asking seniors just to get a basic understanding of the codebase.

## What Codemap does

You give it a GitHub repo link, and it:

1. Clones and analyzes the repository
2. Parses the code and builds a graph of how functions and files are connected
3. Generates a simple explanation of the architecture (with a diagram)
4. Lets you chat with the repo — ask questions like "how does login work" and get an answer based on the actual code

## Current scope (v1)

This project is still in progress. Right now I am focusing on these core parts only, instead of trying to build everything at once:

- Repo analyzer (clone + folder structure + basic summary)
- Code parser using Tree-sitter (JS/TS support first)
- Knowledge graph of functions and files
- RAG-based chat over the codebase
- AI-generated architecture explanation

Features like security scanning, commit history analysis, API docs generation, etc. are ideas for later and are not part of v1.

## Tech stack

- **Frontend:** React, TypeScript, Tailwind, React Flow (for graphs)
- **Backend:** Node.js / Express
- **Parsing:** Tree-sitter
- **Database:** PostgreSQL + pgvector (for embeddings)
- **AI:** LLM + RAG pipeline for chat and explanations

## How it works (basic flow)

```text
GitHub URL
  -> Clone repo
  -> Parse code (AST)
  -> Build knowledge graph
  -> Generate embeddings
  -> Store in vector DB
  -> User asks question / views architecture
  -> LLM answers using graph + embeddings as context
```

## Frontend

```text
┌──────────────────────────────────────────────┐
│ Top Bar                                     │
├─────────────┬───────────────────────────────┤
│ Repo Tree   │ Knowledge Graph               │
│             │                               │
│             │                               │
├─────────────┼───────────────────────────────┤
│ AI Chat     │ Code Preview / Docs / Graphs  │
└─────────────┴───────────────────────────────┘
```

## AI + Backend Pipeline

```text
 GitHub URL
        │
        ▼
Clone Repository
        │
        ▼
Language Detection
        │
        ▼
Parser (AST)
        │
        ▼
Dependency Analysis
        │
        ▼
Knowledge Graph
        │
        ▼
Embeddings + Vector DB
        │
        ▼
LLM + RAG
        │
        ▼
Frontend Dashboard
```

## Why I'm building this

Understanding a new codebase is a problem every developer faces, and existing tools either don't go deep enough into the actual code structure or are not built for this specific use case. I wanted to build something that actually parses and understands code relationships, not just summarizes text.

## User Flow

```text
Homepage

↓

Login

↓

Dashboard

↓

Connect GitHub

↓

Select Repository

↓

Analyze

↓

Chat

↓

Save Workspace
```

## Dashboard

```text
Krish

Repositories

-------------------

Faradai

AgentMesh

Witness

Next.js

React
```

## User Workspace

- AI chats
- analysis
- diagrams
- bookmarks
- notes

save

```text
Workspace

↓

Repository

↓

Chats

↓

Graphs

↓

Notes

↓

Bookmarks
```

## Modules

1. Authentication

Login options

- GitHub OAuth
- Google
- Email

1. Repository Analyzer

- User will paste github repo link
eg: <https://github.com/vercel/next.js>

System will automatically

- clone repo
- parse
- index
- summarize

output:

```text
Repository Name

Tech Stack

Framework

Languages

Folder Structure

Packages

README Summary

Contributors

License

Stars

Forks
```

## Database Architecture

```text
                    Client
                      │
                      ▼
                 Express Backend
                      │
        ┌─────────────┼──────────────┐
        ▼             ▼              ▼
   PostgreSQL      Redis         Qdrant
(Relational)      (Cache/Jobs)  (Embeddings)
        │
        ▼
 Object Storage (S3/MinIO)
```

### PostreSQL store

- Users
- Organizations
- Repositories
- Analysis Metadata
- Chats
- Billing
- Permissions

### Redis store

- Sessions
- Cache
- Queue
- Rate limiting
- Pub/Sub
- Background jobs

### Qdrant store

- Code embeddings
- Documentation embeddings
- README embeddings
- AI search

### S3 / MinIO store

- Repository snapshots
- Generated diagrams
- Exported reports
- Large JSON
- Images

### Multi-Tenant Design

```text
Organization

      │

Users

      │

Projects

      │

Repositories

      │

Analyses
```

Every record belongs to an organization.

### Schema

1. users

```sql
id (UUID)

github_id

email

username

avatar_url

provider

status

created_at

updated_at

last_login
```

### Relations

```text
User

↓

Organizations

↓

Repositories

↓

Chats
```

1. organizations

```sql
id

name

slug

logo

plan

owner_id

created_at
```

1. organization_members

```sql
id

organization_id

user_id

role

joined_at
```

Role:

```text
Owner

Admin

Developer

Viewer
```

1. repositories

```sql
id

organization_id

provider

repo_name

full_name

visibility

default_branch

language

stars

forks

github_id

last_synced

status
```

status:

```text
Pending

Cloning

Indexing

Ready

Failed
```

1. repository_branches

```sql
id

repository_id

branch_name

is_default

latest_commit
```

1. repository_analysis

```sql
id

repository_id

analysis_version

summary

architecture_summary

tech_stack

complexity_score

health_score

security_score

created_at
```sql

1. files
```

id

repository_id

path

extension

language

size

hash

last_commit

is_generated

embedding_status

```sql

1.folders
```

id

repository_id

path

summary

parent_folder

1. functions

```sql
id

file_id

name

signature

return_type

visibility

line_start

line_end

complexity
```

1. classes

```sql
id

file_id

class_name

extends

implements

summary
```

1. dependencies

```sql
id

repository_id

source

target

dependency_type
```

Example

UserService

↓

UserRepository

## Status

Actively building. This README will be updated as more parts get built.

## Author

Built by Krish.
