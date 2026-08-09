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
