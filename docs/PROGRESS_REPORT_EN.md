# StateBreaker Progress Report (English)

**Repository:** [RainyMarks/StateBreaker](https://github.com/RainyMarks/StateBreaker)  
**Baseline:** v0.1 interface skeleton (initial `main`)  
**Report date:** 2026-07-17  
**Current trunk:** Minimal learner → generator → executor → verifier → reporter chain integrated on `main`

---

## 1. What the original skeleton provided

StateBreaker v0.1 is **not** a finished vulnerability scanner. It is:

> **Versioned contracts + shared HTTP runtime + plugin bus + CLI + a demo lab**

| Component | Initial state |
|-----------|---------------|
| Core `src/statebreaker` | Present: models, runtime, plugin discovery, CLI |
| Six-stage pipeline | **Sockets only** — no business algorithms |
| `plugin-template` | Present: dry-run executor (no network) |
| `labs/coupon-race` | Present: “Uncle Wang’s milk-tea” BUG50 race lab |
| `examples/coupon-race` | Present: hand-written Workflow / Invariant / AttackPlan |
| Real plugins | **None** for capture / learner / generator / executor / verifier / reporter |

Documented target flow:

```text
capture → learner → generator → executor → verifier → reporter
  ❌        ❌         ❌          ❌         ❌         ❌
```

What you could do then:

1. `statebreaker doctor` / `workflow validate`
2. Start the lab in Docker and **manually** click honest redeem / double-speed race
3. Install the template and prove entry-point discovery  

What you **could not** do: learn rules, generate attack plans, run concurrent races, emit formal Findings, or produce a PDF report.

---

## 2. Progress vs. the skeleton

```text
capture → learner → generator → executor → verifier → reporter
  ❌        ✅         ✅          ✅         ✅         ✅
         delta learn  race plans  bounded run  state judge  PDF report
```

| Stage | Package | plugin_id | Status |
|-------|---------|-----------|--------|
| capture | — | — | **Not started** |
| learner | `statebreaker-learner-delta` | `team.delta-learner` | Done (baseline deltas) |
| generator | `race-generator` | `team.race-generator` | Done (coupon race–oriented) |
| executor | `race-executor` | `team.race-executor` | Done (coupon race–oriented) |
| verifier | `statebreaker-verifier-basic` | `team.basic-verifier` | Done (minimal) |
| reporter | `statebreaker-reporter-pdf` | `team.pdf-reporter` | Done (PDF) |

Still kept: `plugin-template` → `template.dry-run` (teaching only).

---

## 3. What each module does

### 3.1 learner (`team.delta-learner`)

- Replays a normal Workflow **N times** and compares `state_probe_steps` before/after  
- Proposes candidate Invariants: `max-delta` / `min-value` / `state-transition`  
- Explicitly marks bounds as **observed** (`bound_source: observed_maximum`), not proven business truth  
- Example: learn “discount increases by at most +50” from honest single redemption  

### 3.2 generator (`team.race-generator`)

- Input: Workflow + Invariant[] → deterministic `AttackPlan[]` (hard cap on plan count)  
- Covers concurrent replay, burst, offset sweep, idempotency-key reuse, mid-state probe, run-pool eviction, etc.  
- Embeds an invariant snapshot into each plan for downstream evaluation  
- **Domain:** coupon/race lab markers and scenarios  

### 3.3 executor (`team.race-executor`)

- Sends real HTTP (or ASGI lab tests), records before/after state and lab events  
- Bounded concurrency and multiple schedule strategies  
- `plugin_data.vulnerability_observed` is a **heuristic**, not a formal Finding  
- Batch CLI: `statebreaker-coupon-audit`  

### 3.4 verifier (`team.basic-verifier`)

- Compares before/after state + responses against Invariants  
- Emits formal `Finding`s: `confirmed` / `probable` / `rejected`  
- Supports common kinds such as `max-delta`  

### 3.5 reporter (`team.pdf-reporter`)

- Input: full `RunBundle`  
- Output: `statebreaker-report.pdf` (+ `report-summary.json`)  

### 3.6 Engineering

- CI installs and tests plugin packages  
- Plugin failures use `PluginError` / stable CLI exit codes  
- Review hardening: invariant-backed evidence, option semantics, honest observed-bound labeling  

---

## 4. Still missing / boundaries

| Item | Note |
|------|------|
| **capture** | No HAR/traffic → Workflow plugin yet |
| Domain coupling | generator/executor still coupon-lab oriented |
| One-shot orchestration | No single command for full learn→…→report |
| PDF CJK fonts | Latin core fonts only (portable) |
| Target allow-lists | Core still reports target limits as disabled |

---

## 5. One-line conclusion

**We moved from “sockets + a vulnerable lab” to a minimal closed loop on Uncle Wang’s milk-tea shop: draft rules → generate attacks → execute → formal Findings → PDF.** Still missing: capture, broader domain generality, and pipeline glue.

---

## 6. How to demo with the milk-tea lab

Three tracks: **A browser demo**, **B CLI closed loop (recommended for talks)**, **C optional learner path**.

### 6.0 One-time setup

**Needs:** Python 3.11+, Docker Desktop, Git.

```powershell
cd "PATH\TO\StateBreaker"
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
python -m pip install -e .\plugin-template
python -m pip install -e .\race-generator
python -m pip install -e .\race-executor
python -m pip install -e .\statebreaker-learner-delta
python -m pip install -e .\statebreaker-verifier-basic
python -m pip install -e .\statebreaker-reporter-pdf

statebreaker doctor
statebreaker plugins list
```

You should see:

- `team.delta-learner`
- `team.race-generator`
- `team.race-executor`
- `team.basic-verifier`
- `team.pdf-reporter`

### 6.1 Start the lab

```powershell
docker compose up --build
```

Open: <http://127.0.0.1:8080/>

If port 8080 is busy:

```powershell
$env:STATEBREAKER_LAB_PORT = "18080"
docker compose up --build
# Browse http://127.0.0.1:18080/
# Update base_url in examples/coupon-race/workflow.yaml accordingly
```

Health: <http://127.0.0.1:8080/healthz>

---

### Track A: Browser-only demo (1–2 minutes)

**Goal:** Prove the bug is real without the framework.

| Step | Action | Expected |
|------|--------|----------|
| 1 | “Open a new table” | discount 0, coupon unused |
| 2 | “Honest redeem once” | discount **50** |
| 3 | Redeem again | **rejected**, still 50 |
| 4 | Open a new table | reset |
| 5 | “Double-speed attack” | two concurrent requests |
| 6 | Observe result | discount **100**, 2 successful redemptions |
| 7 | Timeline | two checks before the first commit |

**Talking point:** intentional TOCTOU — check unused → sleep 150ms → add value & mark used. Two requests both pass the check window.

Keep the lab running for Track B.

---

### Track B: CLI closed loop (recommended)

**Goal:** Show the framework path from models/rules to attack evidence, Findings, and PDF.

#### B1. Validate the normal workflow

```powershell
statebreaker workflow validate .\examples\coupon-race\workflow.yaml
```

#### B2. Generate attack plans

```powershell
New-Item -ItemType Directory -Force -Path .\.statebreaker\demo | Out-Null

statebreaker generate `
  .\examples\coupon-race\workflow.yaml `
  .\examples\coupon-race\invariants.yaml `
  --plugin team.race-generator `
  --output .\.statebreaker\demo\plans.json
```

`plans.json` should list ~10 plans (concurrent, burst, offsets, …).

#### B3. Pick the minimal two-request race and execute

```powershell
python -c "import json; from pathlib import Path; plans=json.loads(Path('.statebreaker/demo/plans.json').read_text(encoding='utf-8')); p=next(x for x in plans if x['attack_type']=='concurrent-replay'); Path('.statebreaker/demo/one-plan.json').write_text(json.dumps(p,ensure_ascii=False,indent=2),encoding='utf-8'); print(p['id'])"

statebreaker attack .\.statebreaker\demo\one-plan.json `
  --workflow .\examples\coupon-race\workflow.yaml `
  --plugin team.race-executor `
  --output .\.statebreaker\demo\raw-result.json
```

**Check** `raw-result.json`:

- `after_state.discount_yuan` ≈ **100**
- `plugin_data.vulnerability_observed` often **true**
- lab check/commit event counts often **2**

#### B4. Formal verification (Findings)

```powershell
statebreaker verify .\.statebreaker\demo\raw-result.json `
  .\examples\coupon-race\invariants.yaml `
  --plugin team.basic-verifier `
  --output .\.statebreaker\demo\findings.json
```

**Check:** `verdict: confirmed` for `coupon-max-delta` (observed delta 100 > 50).

#### B5. Build a RunBundle and render PDF

```powershell
python -c @"
import json
from pathlib import Path
from pydantic import TypeAdapter
from statebreaker.documents import load_model, write_json
from statebreaker.models import AttackPlan, Finding, RawAttackResult, RunBundle, Workflow

root = Path('.statebreaker/demo')
findings = TypeAdapter(list[Finding]).validate_python(
    json.loads((root / 'findings.json').read_text(encoding='utf-8'))
)
bundle = RunBundle(
    workflow=load_model(Path('examples/coupon-race/workflow.yaml'), Workflow),
    attack_plan=load_model(root / 'one-plan.json', AttackPlan),
    result=load_model(root / 'raw-result.json', RawAttackResult),
    findings=findings,
)
write_json(root / 'run-bundle.json', bundle)
print('wrote', root / 'run-bundle.json')
"@

statebreaker report .\.statebreaker\demo\run-bundle.json `
  --plugin team.pdf-reporter `
  --output-dir .\.statebreaker\demo\report
```

Open:

```text
.statebreaker\demo\report\statebreaker-report.pdf
```

#### B6. Optional: batch all plans

```powershell
statebreaker-coupon-audit `
  .\examples\coupon-race\workflow.yaml `
  .\.statebreaker\demo\plans.json `
  --output-dir .\.statebreaker\demo\audit
```

Inspect `summary.json` for which plans set `vulnerability_observed` (negative controls such as precondition-bypass should stay false).

---

### Track C: Add the learner (full story)

**Requires:** lab up; `workflow.yaml` `base_url` port correct.

```powershell
$env:STATEBREAKER_LEARNER_SAMPLES = "5"

statebreaker learn .\examples\coupon-race\workflow.yaml `
  --plugin team.delta-learner `
  --output .\.statebreaker\demo\learning-result.json
```

Extract invariants:

```powershell
python -c "
import json
from pathlib import Path
data=json.loads(Path('.statebreaker/demo/learning-result.json').read_text(encoding='utf-8'))
Path('.statebreaker/demo/learned-invariants.json').write_text(
    json.dumps(data['invariants'], ensure_ascii=False, indent=2), encoding='utf-8')
print(len(data['invariants']), 'invariants')
"
```

Generate from learned rules:

```powershell
statebreaker generate `
  .\examples\coupon-race\workflow.yaml `
  .\.statebreaker\demo\learned-invariants.json `
  --plugin team.race-generator `
  --output .\.statebreaker\demo\plans-from-learn.json
```

Then attack → verify → report as in Track B.

**Story:** learner sees “normal +50 max”; race reaches 100; verifier returns `confirmed`.

---

## 7. ~3-minute talk track

1. **Problem:** business-logic bugs need **state evidence**, not status codes alone.  
2. **Lab:** BUG50 TOCTOU with a 150ms window (Track A).  
3. **Skeleton:** six plugin stages; algorithms stay out of the core.  
4. **Progress:** learner → generator → executor → verifier → PDF.  
5. **Loop:** concurrent attack, discount 0→100, Finding confirmed, PDF on disk (Track B).  
6. **Limits:** no capture; race plugins are coupon-lab focused; next steps: generality + orchestration.  

---

## 8. Teardown

```powershell
docker compose down
```

Artifacts worth keeping for screenshots:

```text
.statebreaker/demo/
  plans.json
  one-plan.json
  raw-result.json
  findings.json
  run-bundle.json
  report/statebreaker-report.pdf
```

---

## 9. Related docs

- [Architecture](architecture.md)  
- [Contracts](contracts.md)  
- [Plugin development](plugin-development.md)  
- Chinese version: [PROGRESS_REPORT_ZH.md](PROGRESS_REPORT_ZH.md)  
