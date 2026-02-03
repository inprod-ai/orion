# inprod Strategy Research

research conducted february 2026 to determine product-market fit and academic novelty of two proposed directions for inprod.ai

## two competing visions

**proofs not scores**: evolve inprod from pattern-based scoring to verification-based guarantees via sandbox execution, mutation testing, load testing, and production correlation

**efficiency auditor**: measure how close actual code performance is to the mathematical theoretical minimum for a given problem class (e.g., "your sort uses 2.3x the comparisons it theoretically needs")

the question: which sells, which publishes, what should we build?

---

## market research

### software testing and verification market

| segment | 2025 size | growth | notes |
|---------|-----------|--------|-------|
| software testing/QA | $55B | 6.2% CAGR | massive, established |
| load testing | $8.9B | 11% CAGR | high growth, clear pain |
| continuous testing | $1.5-9.6B | 13-17% CAGR | DevOps integration |
| performance testing tools | $1.9B | 14% CAGR | enterprise IT buyers |
| formal verification | $1.1B | 18.6% CAGR | niche but growing fast |

sources: mordor intelligence, gm insights, dataintelo, markets and markets

### what enterprises actually buy

- 78% of enterprises have CI/CD automation integrated
- 62% of fortune 500 deploy continuous testing at scale (5000+ concurrent tests)
- 35% use AI-driven testing engines
- cloud-based solutions dominate (59% market share)

the pattern: enterprises pay for tools that answer **"does it work?"** and **"can it scale?"** in their existing DevOps workflow

### key vendors in the space

testing: tricentis, broadcom, micro focus, ibm, smartbear
load testing: k6, artillery, gatling, locust
observability: datadog, sentry, new relic
mutation testing: stryker, pit (open source, no major commercial player)

### mutation testing adoption

stryker and pit dominate the open source space. no major commercial mutation testing product exists as a standalone. this is an opportunity — mutation testing is known to be valuable but adoption is low because tooling is fragmented and slow.

---

## academic research

### automated complexity analysis (active field)

| tool/paper | venue | what it does |
|------------|-------|--------------|
| dynaplex | academic | infers complexity bounds from execution traces |
| koat | academic | derives bounds via ranking functions |
| clarity | PLDI 2015 | static detection of asymptotic performance bugs |
| codecomplex | EMNLP 2025 | dataset for LLM complexity prediction (4900 programs) |

the field of automated complexity inference is active. tools exist that can infer Big-O from execution or static analysis.

### what's NOT in the literature

**efficiency ratio** — the concept of measuring `theoretical_minimum / actual_operations` as a percentage is not productized or well-researched as a standalone metric.

existing work:
- classifies complexity (O(n), O(n²), etc.)
- compares algorithms to each other
- finds asymptotic bugs (O(n²) when O(n) possible)

missing work:
- quantifying distance from theoretical optimum
- LLM-based problem classification for arbitrary functions
- generating optimal implementations from suboptimal ones

### publication venues

relevant top venues for this work:
- **PLDI** (programming language design and implementation)
- **ICSE** (international conference on software engineering)
- **FSE** (foundations of software engineering)
- **POPL** (principles of programming languages)
- **EMNLP** (empirical methods in natural language processing, for LLM angle)

a paper titled something like "measuring the gap between empirical and theoretical algorithmic efficiency" would be novel.

---

## comparative analysis

### proofs not scores

**sellability: high**
- fits existing budget categories (testing, load testing, CI/CD)
- clear pain point every team has
- integrates into existing workflows
- immediate actionable output ("handles 12,847 users")
- competition validates market exists

**publishability: low-medium**
- combines known techniques (sandbox, mutation, load testing)
- incremental improvement, not fundamental contribution
- would be a "systems paper" at best

**technical difficulty: medium**
- sandbox execution already built (E2B integration exists)
- mutation testing is well-understood
- load testing is well-understood
- integration is the hard part, not invention

### efficiency auditor

**sellability: low-medium**
- niche market (HFT, games, databases, embedded)
- requires educating buyers on value
- no existing budget category
- harder to explain in a sales call

**publishability: high**
- novel contribution (efficiency ratio as metric)
- combines complexity theory + LLMs + program analysis
- clear research questions with measurable outcomes
- builds on active research area

**technical difficulty: high**
- problem classification via LLM is hard
- maintaining known bounds database is labor-intensive
- instrumentation for operation counting is complex
- theoretical bounds for custom transformations may be uncomputable

---

## the verdict

| dimension | proofs not scores | efficiency auditor |
|-----------|-------------------|-------------------|
| market fit | ✓ strong | ✗ niche |
| revenue potential | ✓ high | ✗ low (initially) |
| academic novelty | ✗ low | ✓ high |
| moat potential | medium | ✓ high |
| technical risk | low | high |
| infrastructure shared | yes | yes |

**proofs not scores** is the product that pays the bills.
**efficiency auditor** is the research that wins the moat.

---

## recommended strategy

### do both, sequenced

the infrastructure for proofs not scores (sandbox execution, instrumentation, LLM integration) is 70% of what efficiency auditor needs. build the revenue engine first, then extend it into research.

### phase sequence

```
phase 1: sandbox verification (now)
├── compile verification
├── test execution in sandbox
├── basic instrumentation
└── output: "your code builds and tests pass"

phase 2: test quality (next)
├── mutation testing integration
├── coverage measurement
└── output: "your tests catch 87% of mutations"

phase 3: capacity verification (after)
├── load testing in sandbox
├── concurrent user simulation
└── output: "handles 12,847 concurrent users"

phase 4: production correlation (later)
├── sentry/opentelemetry integration
├── real error → code location mapping
└── output: "this function caused 847 errors in prod"

phase 5: efficiency research (research track)
├── problem classification LLM
├── known bounds database
├── efficiency ratio calculation
└── output: "your sort is 34% of theoretical optimum"

phase 6: efficiency in product (premium tier)
├── productize research
├── optimal code generation
└── output: premium enterprise feature
```

### dual-track model

```
PRODUCT TRACK                 RESEARCH TRACK
─────────────────────────────────────────────
phases 1-4                    phases 5-6
proofs not scores             efficiency auditor

revenue engine                moat builder
enterprise sales              academic publication
existing market               new category

validates demand              creates differentiation
builds infrastructure         uses infrastructure
```

### why this sequence

1. **resource constraint**: building both simultaneously splits focus
2. **dependency**: efficiency auditor needs sandbox/instrumentation that proofs not scores builds
3. **market validation**: prove people pay for verified execution before adding theoretical analysis
4. **risk mitigation**: if efficiency auditor is too academic, you still have revenue from proofs not scores

---

## go-to-market implications

### proofs not scores messaging

**to devops/engineering teams:**
- "stop guessing if your code works. prove it."
- "verified test results, not pattern matching"
- "know your actual capacity before you deploy"

**positioning:**
- better testing → verified testing
- estimated capacity → measured capacity
- assumed security → proven security

### efficiency auditor messaging

**to performance engineers:**
- "how close is your code to perfect?"
- "find the 10x improvement your profiler can't see"
- "theoretical optimality, measured automatically"

**positioning:**
- academic rigor meets practical tooling
- thought leadership / content marketing engine
- premium tier for performance-critical teams

---

## risks and mitigations

### proofs not scores risks

| risk | mitigation |
|------|------------|
| sandbox costs at scale | E2B pricing is reasonable; cache results |
| mutation testing too slow | incremental mutation, prioritize critical paths |
| load testing commoditized | bundle with verification story, not standalone |

### efficiency auditor risks

| risk | mitigation |
|------|------------|
| problem classification fails | start with known problem types (sort, search) |
| theoretical bounds uncomputable | focus on well-understood algorithms first |
| too academic for market | position as premium research-backed feature |
| LLM hallucination | validate classifications with static analysis |

---

## success metrics

### product metrics (proofs not scores)

- verified scans per month
- paying customers
- revenue
- time from commit to verified result

### research metrics (efficiency auditor)

- paper acceptance at top venue
- novel problems classified correctly (precision/recall)
- customer adoption of efficiency features
- press/content engagement

---

## conclusion

the data supports a **sequenced dual-track strategy**:

1. build proofs not scores as the core product — it fits market demand and generates revenue
2. develop efficiency auditor as a research initiative — it creates moat and academic credibility
3. use shared infrastructure — sandbox, instrumentation, LLM integration serve both
4. convert research to product — efficiency auditor becomes premium tier once validated

the mistake would be building efficiency auditor first (too academic, no revenue) or ignoring it entirely (no differentiation from competitors who will catch up on verification).

**build the engine that makes money. use that engine to power the research that makes you unique.**
