# Caffeine — Complete System Architecture

## 1. High-Level System Overview

```mermaid
graph TB
    subgraph "🖥️ App Router — src/app/"
        LAYOUT["layout.tsx<br/>Global UI Shell"]
        PAGE["page.tsx<br/>Home Page"]
        LINGU["lingubreak/page.tsx<br/>Sentence Analysis UI"]
        OCR["ocr/page.tsx<br/>OCR Sandbox UI"]
        DICT["dictionary/page.tsx<br/>(Placeholder) Dictionary UI"]
    end

    subgraph "🧩 Feature Modules — src/features/"
        F_LINGU["lingubreak/components/<br/>(ChunkDisplay, StepAccordion...)"]
        F_OCR["ocr/components/<br/>(TextAndBoxes...)"]
        F_DICT["dictionary/<br/>(Future dev)"]
    end

    subgraph "⚡ API Layer — src/app/api/"
        API_LINGU["api/analyze/route.ts<br/>POST Handler for NLP"]
        API_OCR["api/ocr/route.ts<br/>POST Handler for Image Upload"]
    end

    subgraph "🛠️ Shared Services & UI — src/shared/"
        S_UI["components/<br/>(Sidebar, StatusDisplay...)"]
        S_LIB["lib/<br/>Shared Logic (db, rag, ocr)"]
        S_RAG["lib/rag/<br/>(embeddings, retriever)"]
        S_OCR["lib/ocr/<br/>(Gemini 2.0 Vision extractText)"]
    end

    subgraph "🗄️ Database — Supabase + pgvector"
        KB_DOC["kb_documents"]
        KB_CHK["kb_chunks"]
        ANA["analyses"]
    end

    subgraph "🤖 External AI APIs"
        DS["DeepSeek Chat API (NLP)"]
        GEM["Gemini 2.0 Flash (NLP & Vision)"]
        OAI_EMB["OpenAI Embedding API"]
    end

    PAGE --> LAYOUT
    LINGU & OCR & DICT --> LAYOUT

    LINGU --> F_LINGU
    OCR --> F_OCR

    F_LINGU --> API_LINGU
    F_OCR --> API_OCR

    API_LINGU --> S_RAG
    API_LINGU --> DS & GEM
    API_OCR --> S_OCR
    S_OCR --> GEM

    S_RAG --> OAI_EMB
    S_RAG --> KB_CHK
    API_LINGU --> ANA
```

---

## 2. Request Flows

### LinguBreak Feature (Sentence Analysis)
```mermaid
sequenceDiagram
    actor Student
    participant UI as LinguBreak UI
    participant API as /api/analyze/route.ts
    participant Engine as ai-providers.ts
    participant Cache as Supabase<br/>analyses table
    participant RAG as retriever.ts
    participant LLM as DeepSeek / Gemini

    Student->>UI: Submits English sentence
    UI->>API: POST /api/analyze
    API->>Engine: analyzeSentence()
    
    Engine->>Cache: SELECT cached result
    alt Cache HIT ✅
        Cache-->>Engine: result_json
    else Cache MISS ❌
        Engine->>RAG: getRAGContext()
        RAG-->>Engine: relevant grammar context
        Engine->>LLM: Prompt + RAG Context + Sentence
        LLM-->>Engine: JSON breakdown
        Engine->>Cache: UPSERT (Cache for future)
    end
    
    Engine-->>API: AnalysisResult
    API-->>UI: Renders pedagogical breakdown
```

### OCR Feature
```mermaid
sequenceDiagram
    actor User
    participant UI as OCR UI
    participant API as /api/ocr/route.ts
    participant Engine as ocr-service.ts
    participant LLM as Gemini 2.0 Flash Vision

    User->>UI: Uploads Image
    UI->>API: POST /api/ocr (FormData)
    API->>Engine: extractText(buffer)
    Engine->>LLM: Send Image Data
    LLM-->>Engine: Parsed text + bounding boxes
    Engine-->>API: OcrResult
    API-->>UI: Render text & copy buttons
```

---

## 3. Database Schema — Entity Relationship

*(Currently heavily utilized by LinguBreak's RAG and caching systems)*

```mermaid
erDiagram
    kb_documents {
        UUID id PK
        TEXT filename UK
        TEXT category
        TEXT title
        TEXT content
        TEXT checksum
    }

    kb_chunks {
        UUID id PK
        UUID document_id FK
        INT chunk_index
        TEXT content
        JSONB metadata
        VECTOR_1536 embedding
    }

    analyses {
        UUID id PK
        TEXT sentence
        TEXT sentence_hash UK
        VECTOR_1536 embedding
        TEXT provider
        JSONB result_json
        TEXT status 
        TEXT_ARRAY rag_chunks_used
    }

    kb_documents ||--o{ kb_chunks : "has many"
    kb_chunks }o--o{ analyses : "referenced via rag_chunks_used"
```

---

## 4. Knowledge Base Ingestion Pipeline

Used to populate the RAG context for LinguBreak analysis.

```mermaid
flowchart LR
    subgraph "📖 Source Files (knowledge-base/)"
        MD["Markdown Files<br/>(Grammar, Errors, Pedagogy)"]
    end

    subgraph "⚙️ ingest.ts"
        READ["Read file & Check MD5"]
        CHUNK["Split by ## headings"]
        EMBED["OpenAI text-embedding-3-small"]
    end

    subgraph "🗄️ Supabase"
        DOC["kb_documents"]
        CHK["kb_chunks"]
    end

    MD --> READ
    READ -->|"If changed"| CHUNK
    CHUNK --> EMBED
    EMBED --> DOC & CHK
```

---

## 5. RAG Context Construction (LinguBreak)

```mermaid
flowchart TD
    INPUT["Input Sentence"]
    INPUT --> EMB["embedText()<br/>→ 1536-dim vector"]

    EMB --> SEARCH1["match_kb_chunks()"]
    EMB --> SEARCH2["match_analyses()"]

    SEARCH1 --> R1["Grammar Chunk"]
    SEARCH2 --> R4["Past approved analysis"]

    R1 & R4 --> PROMPT["Final LLM Prompt"]
    PROMPT --> LLM["DeepSeek / Gemini"]
```

---

## 6. Development Philosophy & Scaling

The architecture has shifted from a single-app (LinguBreak) MVP to a **multi-feature workspace (`Caffeine`)**. 

- **App Router (`src/app/`)**: Thin glue layer mounting the features and exposing API routes.
- **Feature Modules (`src/features/`)**: Self-contained vertical slices. Each MVP (LinguBreak, OCR, Dictionary) manages its own specialized components, types, and logic.
- **Shared (`src/shared/`)**: Generic UI blocks (Sidebar, layout), reusable hooks, and foundational backend libraries (DB clients, RAG engines, external API wrappers).
