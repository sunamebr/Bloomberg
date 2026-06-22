# Bloomberg Terminal - Quantitative Trading Dashboard

A quantitative trading dashboard matching Bloomberg Terminal aesthetic, built with React 19, TypeScript, D3, and Cytoscape.

## Features

- **Real-time portfolio metrics** with live updating
- **Probability Lattice** - D3 scatter/bar hybrid with Bayesian posterior
- **Tail Probability Ridge** - Contour density plot with tail region analysis
- **Signal Flow Diagram** - Cytoscape DAG showing signal-to-execution pipeline
- **Responsive grid layout** with draggable/resizable panels
- **Dark Bloomberg Terminal aesthetic**

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Production

```bash
npm run build
npm start
```

## Hostinger Deployment

1. Build the project: `npm run build`
2. Upload `dist/` folder and `server.js` to your Hostinger server
3. Install production dependencies: `npm install --production`
4. Start with PM2: `pm2 start server.js --name bloomberg-dashboard`
5. Configure reverse proxy (nginx) to forward traffic to port 3000
