# Arquitetura — MestraDosTrades

> Documento vivo. Espelha a estrutura de pastas do monorepo.

## Visão geral

Plataforma de trading automatizada para mercados Polymarket de **5 minutos (Bitcoin Up/Down)**. Stack divide-se em três planos:

1. **Ingestão** — market data (REST + WebSocket) do Polymarket CLOB e fontes de alpha externas
2. **Decisão** — strategy engine + risk gate (paper/live)
3. **Apresentação** — dashboard React + ledger persistido em MySQL

## Diagrama de componentes

```
┌──────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL                                    │
│  Polymarket CLOB REST   Polymarket WS feed   Alpha sources (Phase 4) │
└──────────┬──────────────────────┬──────────────────────┬─────────────┘
           │ REST                 │ WS                   │
           ▼                      ▼                      ▼
┌──────────────────────────────────────────────────────────────────────┐
│  BACKEND (Node 20+/TS :3001)                                          │
│                                                                       │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────┐   ┌──────────┐ │
│  │ market-data  │ → │  strategy    │ → │ risk-gate  │ → │ executor │ │
│  │   ingest     │   │   engine     │   │  (cap/stop)│   │ paper/live│ │
│  └──────────────┘   └──────────────┘   └────────────┘   └─────┬────┘ │
│         │                  │                 │                  │     │
│         ▼                  ▼                 ▼                  ▼     │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  ledger / repository (MySQL) — markets, orders, fills, PnL  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│         │                                                             │
│         │  REST + WS broadcast (sinais, posições, equity)            │
└─────────┼─────────────────────────────────────────────────────────────┘
          ▼
┌──────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Vite :5173 — React 18 + Tailwind 4)                        │
│  Dashboard: mercados ativos · sinais · posições · equity curve        │
└──────────────────────────────────────────────────────────────────────┘
```

## Conexões

| Origem            | Destino        | Protocolo              | Porta     |
|-------------------|----------------|------------------------|-----------|
| Frontend          | Backend        | HTTP/REST + WebSocket  | 3001      |
| Backend           | MySQL          | TCP (mysql2)           | 3306      |
| Backend           | Polymarket     | HTTPS REST             | 443 (ext) |
| Backend           | Polymarket     | WSS market feed        | 443 (ext) |
| Host (dev)        | Frontend       | HTTP (Vite HMR)        | 5173      |
| Host (dev)        | MySQL          | TCP                    | 3306      |

## Módulos planejados (espelham `backend/`)

```
backend/
├── src/
│   ├── config/          # env, secrets, feature flags
│   ├── market-data/     # Polymarket REST + WS clients, normalization, cache
│   ├── strategies/      # 5min BTC up/down + (fase 4) MiroFish agents
│   ├── risk/            # cap USD, max positions, per-session stops
│   ├── executor/        # paper mode + live (CLOB L2 auth)
│   ├── ledger/          # persistence (MySQL via mysql2), repository pattern
│   ├── api/             # Express/Fastify REST + WS broadcast
│   └── index.ts         # compose + lifecycle
├── Dockerfile           # (placeholder em T1)
└── package.json         # (placeholder em T1)
```

## Fluxo de dados (runtime)

```
1. market-data/ws  ──push──▶  normalized Tick → broadcast interno
2. strategies/*    ──consome──▶ emite Signal { market, side, size, conviction }
3. risk-gate       ──valida──▶ cap, drawdown, max-pos → approve/reject
4. executor        ──paper──▶ Ledger.Entry  (PAPER_MODE=true)
                 ──live────▶ Polymarket CLOB order → Fill → Ledger.Entry
5. ledger          ──persiste──▶ MySQL (orders, fills, equity)
6. api/ws          ──broadcast──▶ Frontend dashboard reativo
```

## Decisões arquiteturais (ADRs futuras)

- **DB driver**: `mysql2/promise` (default) — avaliar Drizzle/Prisma em T3
- **Runtime**: Node 20+ em T1/T2; Bun optional a partir de T3 (perf)
- **Auth**: JWT simétrico (HS256) com `JWT_SECRET`; refresh em T3
- **Paper mode**: gate forte via env — executor nunca chama CLOB live quando `PAPER_MODE=true`

## Fases (alinhado ao README)

| Fase | Módulos envolvidos                              |
|------|------------------------------------------------|
| 1    | monorepo, `db/schema`, market-data stub        |
| 2    | strategies, risk-gate, executor paper, api     |
| 3    | executor live (CLOB L2), ledger completo        |
| 4    | **MiroFish** agents — strategies/* autônomos   |
| 5    | observabilidade, alertas, capital optimizer    |
