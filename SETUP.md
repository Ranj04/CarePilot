# SETUP.md — do all of this BEFORE you open Claude Code

Target: ~20–30 minutes. Get every key and account ready so Claude Code never stalls waiting on you.

## 1. Accounts & keys

### HydraDB (mandatory — the memory layer)
1. Sign up at **dashboard.hydradb.com**.
2. Redeem promo code **HYDRA2026** in billing for your credits.
3. Create an API key. Note the **API key** and the **base URL / endpoint** it gives you.
4. Skim **docs.hydradb.com** — specifically how to: create a node, create a relationship/edge, query by semantic similarity, and traverse relationships. (Claude Code will read these too, but you should know the shape.)
5. Remember the submission code: **MEMORY2026** (for the portal at the end).

### Nebius Token Factory (the LLM brain)
1. Sign up at **tokenfactory.nebius.com** (Google/GitHub login).
2. Create an **API key**.
3. In the playground, pick a **tool-calling-capable instruct model** and copy its exact id (e.g. a `meta-llama/Llama-3.x-Instruct` or `Qwen/Qwen2.5-...-Instruct`). Avoid pure reasoning models (DeepSeek-R1) for function-calling.
4. Base URL is `https://api.tokenfactory.nebius.com/v1/` (OpenAI-compatible).

## 2. Local tools

- **Node.js 20+** and **npm** (`node -v` to check).
- **Claude Code** installed and authenticated (`claude` runs from your terminal).
- A code editor (VS Code or similar).
- **Chrome** for the demo (Web Speech API voice works best there).

## 3. Create the project + drop in the docs

```bash
mkdir carepilot && cd carepilot
git init
npx create-next-app@latest . --typescript --app --eslint --no-tailwind --no-src-dir=false
```
(Tailwind optional — say yes if you want quick styling.)

Then copy these files from this folder into the repo:
- **CLAUDE.md** → repo root (Claude Code reads this automatically).
- **ARCHITECTURE.md**, **BUILD_PLAN.md**, **DEMO.md** → repo root (reference).

## 4. Environment variables

Create `.env.local` from the template (`.env.example` is in this folder):

```
HYDRADB_API_KEY=...
HYDRADB_BASE_URL=...                 # from the HydraDB dashboard
NEBIUS_API_KEY=...
NEBIUS_BASE_URL=https://api.tokenfactory.nebius.com/v1/
NEBIUS_CHAT_MODEL=...                # the tool-calling model id you copied
# NEBIUS_EMBED_MODEL=...             # only if HydraDB needs you to supply your own vectors
```

> Note on embeddings: HydraDB does semantic recall for you. Only add `NEBIUS_EMBED_MODEL` if its docs say you must provide your own embedding vectors.

## 5. Kickoff prompt for Claude Code

Open the repo in your terminal, run `claude`, and paste:

> Read CLAUDE.md and ARCHITECTURE.md in full. Then do FIRST STEP only: read the HydraDB docs at docs.hydradb.com, write `src/lib/hydra.ts` (the only file that imports the HydraDB SDK), and prove a write→read round-trip works against my live HydraDB with a throwaway script. Stop and show me the result before building anything else.

After the round-trip works, follow **BUILD_PLAN.md** phase by phase, pausing at each verify gate.

## 6. Pre-flight checklist

- [ ] HydraDB key + base URL in `.env.local`, promo redeemed
- [ ] Nebius key + chosen model id in `.env.local`
- [ ] `npm run dev` starts the blank Next.js app
- [ ] CLAUDE.md + ARCHITECTURE.md + BUILD_PLAN.md in repo root
- [ ] Claude Code authenticated and running
- [ ] Chrome open for the demo
