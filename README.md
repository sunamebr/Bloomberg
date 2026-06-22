# MestraDosTrades

> Plataforma de trading Polymarket focada em mercados de 5min (Bitcoin Up/Down) com alpha multi-fonte.

![status](https://img.shields.io/badge/status-WIP-yellow)
![mode](https://img.shields.io/badge/mode-paper-blue)
![license](https://img.shields.io/badge/license-TBD-lightgrey)

## Arquitetura

```
MestraDosTrades/
├── frontend/        # React 18 + TS + Vite + Tailwind 4 (dashboard)
├── backend/         # Node 20+/TS — API, strategy engine, executor
├── db/              # MySQL 8 schema + migrations
│   ├── schema/      # init SQL montado no container mysql
│   ├── migrations/  # alterações incrementais
│   └── data/        # volume do MySQL (gitignored)
├── docs/            # ARCHITECTURE.md, decisões, runbooks
├── scripts/         # deploy, utilidades, ETL
├── docker-compose.yml
└── .env.example
```

### Fluxo de dados

```
[Polymarket WS feed] ─┐
[Alpha sources]      ─┤→ Strategy Engine → Risk Gate → Executor → Ledger (MySQL)
[Market REST]        ─┘                                            │
                                                                   ▼
                                                          Frontend Dashboard
```

Detalhes em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Stack

| Camada     | Tecnologia                                            |
|------------|------------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS 4           |
| Backend    | Node 20+ / TypeScript (Bun-ready)                    |
| DB         | MySQL 8.0                                            |
| Orquestração | Docker Compose                                    |
| Exchange   | Polymarket CLOB (REST + WebSocket)                   |

## Setup

```bash
# 1. Configurar env
cp .env.example .env
# preencher senhas/JWT secret

# 2. Subir stack (DB + backend + frontend)
docker compose up -d

# 3. Acessar
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
# MySQL:    localhost:3306
```

> Nota: em T1 os serviços backend/frontend rodam `tail -f /dev/null` (placeholder). Código entra em T2/T3.

## Estrutura de pastas

- `frontend/` — UI React (dashboard de mercados, posições, PnL, sinais)
- `backend/` — API REST/WS, strategy engine, risk manager, executor paper/live
- `db/` — schema `mestrados` com tabelas: markets, orders, fills, ledger, signals
- `docs/` — arquitetura, ADRs, runbooks
- `scripts/` — deploy, ETL de backfill, utilidades

## Estratégias 5min

Foco em mercados Polymarket de **Bitcoin Up/Down de 5 minutos**:
- Resolução rápida → alta taxa de oportunidade por dia
- Edge agregado de múltiplas fontes de alpha (price action on-chain, order flow, sentiment, mikä-fish agents na Fase 2)
- Risk gate obrigatório: cap USD, max positions, stop por sessão

## Roadmap

| Fase | Escopo                                                      | Status |
|------|------------------------------------------------------------|--------|
| 1    | Monorepo skeleton + DB schema + market data ingestion      | em andamento |
| 2    | Strategy engine + paper trading + dashboard                | planejado |
| 3    | Live trading Polymarket CLOB (L2 auth)                     | planejado |
| 4    | **MiroFish agents** — alpha autônomo multi-fonte           | planejado |
| 5    | Observabilidade, alertas, otimização de capital            | planejado |

## Aviso

Projeto em desenvolvimento ativo. **Sem garantia de lucro.** Trading em mercados preditivos envolve risco de perda total do capital alocado. O modo paper (`PAPER_MODE=true`) é o padrão; live trading exige configuração explícita de chaves e aceite de risco.
