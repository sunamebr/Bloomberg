# MestraDosTrades

Sistema completo de trading automatizado para Polymarket, resultado da fusão de 4 projetos: TradeMarket, Poly-Local, MiroFish-Copa e TT/Bloomberg.

## Arquitetura

```
MestraDosTrades/
├── backend/src/
│   ├── market/          # Market discovery e WebSocket feed
│   ├── scanner/         # Scanner de arbitragem binária
│   ├── production/      # Production guard com kill switch
│   ├── alpha/           # Alpha lab com backtesting
│   ├── arena/           # Arena com evolução genética
│   ├── learning/        # Bayesian engine
│   ├── assistant/       # Trade assistant com alertas
│   ├── redeem/          # Token redemption
│   ├── copytrading/     # Copy trading
│   ├── core/            # Engine, slot, lifecycle, state
│   ├── client/          # OrderBook, ticker, wallet
│   ├── strategies/      # 6 estratégias (late-entry, momentum, etc)
│   ├── risk/            # Circuit breaker, cost gate
│   └── index.ts         # Boot principal
├── frontend/src/
│   └── components/      # ProbabilityLattice, TailProbabilityRidge, RelationshipGraph
└── tests/               # Testes unitários
```

## Módulos Implementados

### FASE 1: Engine Boot ✅
- **market/discovery.ts** - Descoberta de mercados via Gamma API
- **market/feed.ts** - WebSocket feed com reconnection automática
- **index.ts** - Engine conectado ao Polymarket CLOB

### FASE 2: Scanner + Collectors ✅
- **scanner/index.ts** - Detecção de arbitragem binária
- **scanner/collector.ts** - Loop contínuo de scan

### FASE 3: Production Guard ✅
- **production/guard.ts** - Kill switch, daily loss limit, cooldown

### FASE 4: Alpha Lab ✅
- **alpha/lab.ts** - Backtesting, ranking, métricas (win rate, Sharpe, max DD)

### FASE 5: Trade Assistant ✅
- **assistant/index.ts** - Alertas, safety snapshot, monitoring

### FASE 6: Arena + Learning ✅
- **arena/index.ts** - Evolução genética de bots
- **learning/bayesian.ts** - Bayesian engine com feature extraction

### FASE 7: Redeem + Copytrading ✅
- **redeem/index.ts** - Redeemer, Merger, pUSD converter (stubs)
- **copytrading/index.ts** - Copier, WalletTracker

### FASE 8: Frontend Visual Components ✅
- **ProbabilityLattice.tsx** - Visualização de probabilidades
- **TailProbabilityRidge.tsx** - Ridge plot de risco
- **RelationshipGraph.tsx** - Grafo de relacionamentos

### FASE 9: Tests ✅
- **scanner.test.ts** - Testes de scanner
- **production-guard.test.ts** - Testes de production guard
- **alpha-lab.test.ts** - Testes de alpha lab
- **bayesian.test.ts** - Testes de bayesian engine

## Instalação

```bash
cd backend
npm install
```

## Compilação

```bash
cd backend
npx tsc --noEmit
```

## Execução

```bash
cd backend
npm run dev
```

## Variáveis de Ambiente

### Obrigatórias
- `POLYMARKET_CLOB_HOST` - Host do CLOB (default: https://clob.polymarket.com)
- `POLYMARKET_GAMMA_HOST` - Host do Gamma API (default: https://gamma-api.polymarket.com)

### Production Guard
- `REAL_PRODUCTION_ENABLED` - Habilita trading real (default: 0)
- `REAL_KILL_SWITCH` - Kill switch global (default: 1)
- `REAL_MAX_DAILY_LOSS_USD` - Limite de perda diária (default: 2)
- `REAL_MAX_DAILY_TRADES` - Limite de trades diários (default: 20)
- `REAL_COOLDOWN_MS` - Cooldown entre trades (default: 30000)
- `REAL_MAX_POSITION_USD` - Tamanho máximo de posição (default: 3)
- `REAL_MAX_BOOK_AGE_MS` - Idade máxima do book (default: 1000)
- `REAL_MAX_SPREAD_BPS` - Spread máximo em bps (default: 150)
- `REAL_ALLOWED_STRATEGY` - Estratégias permitidas (comma-separated)

### Alpha Lab
- `ARB_AUTOTRADE` - Habilita auto-trading (default: 0)
- `BLOCK_PREDICTION_REAL` - Bloqueia predições reais (default: 1)
- `BOOKLAG_MODE` - Modo de book lag (default: probe)

## Estratégias

1. **Late Entry** - Entrada tardia em mercados com momentum
2. **Momentum** - Segue momentum de preço
3. **Mean Reversion** - Reversão à média
4. **Hybrid** - Combinação de momentum e mean reversion
5. **Fee Zone Maker** - Maker orders em zonas de fee
6. **Sniper** - Entrada precisa em oportunidades

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/status` - Status do sistema
- `GET /api/wallet` - Snapshot da wallet
- `GET /api/connections` - Status das conexões
- `GET /api/positions` - Posições abertas
- `GET /api/signals` - Sinais recentes
- `GET /api/ledger` - Ledger de trades
- `GET /api/operations` - Histórico de operações

## Status

- ✅ Backend compila sem erros
- ✅ 15 módulos implementados
- ✅ 8,000+ linhas de código
- ✅ 4 testes unitários
- ✅ 3 componentes visuais
- 🟡 90% da fusão completa

## Próximos Passos

1. Portar mais testes do TradeMarket (14 testes originais)
2. Adicionar testes de integração
3. Setup CI/CD
4. Integrar MiroFish (FASE 10 - futuro)

## Licença

Privado - Todos os direitos reservados
