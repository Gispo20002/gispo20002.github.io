# ⚡ TeslApp

Dashboard personale per Tesla — raccoglie dati dalle API ufficiali, li salva su SQL Server Docker e li visualizza su iPhone e Desktop.

## Struttura del progetto

```
TeslApp/
├── backend/          # Node.js + Express + TypeScript
├── mobile/           # React Native (iOS)
├── desktop/          # Electron + React
└── TESLA_API_SETUP.md
```

---

## 1. Setup credenziali Tesla

Leggi **TESLA_API_SETUP.md** per registrarti su developer.tesla.com e ottenere `CLIENT_ID` e `CLIENT_SECRET`.

---

## 2. Avviare il Backend + Database

### Prerequisiti
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installato e avviato
- [Node.js 20+](https://nodejs.org/)

```bash
cd backend

# Copia e configura il file .env
cp .env.example .env
# → Modifica .env con le tue credenziali Tesla

# Installa dipendenze
npm install

# Avvia SQL Server in Docker
docker-compose up -d sqlserver

# Aspetta ~30 secondi, poi crea le tabelle
npm run db:migrate

# Avvia il backend
npm run dev
```

Il backend sarà disponibile su **http://localhost:3000**

---

## 3. App Desktop (Windows/Mac)

```bash
cd desktop
npm install
npm run electron:dev   # sviluppo
npm run dist           # build distribuzione
```

---

## 4. App iOS (iPhone)

Prerequisiti: Mac con Xcode e CocoaPods.

```bash
cd mobile
npm install
cd ios && pod install && cd ..
npm run ios   # simulatore

# Per iPhone fisico: apri mobile/ios/TeslApp.xcworkspace in Xcode
```

Cambia l'IP in `mobile/src/api/client.ts` con il tuo IP locale quando usi il telefono fisico.

---

## Funzionalità

| Feature | Backend | Mobile | Desktop |
|---------|---------|--------|---------|
| Auth Tesla OAuth 2.0 | ✅ | ✅ | ✅ |
| Stato veicolo live | ✅ | ✅ | ✅ |
| Grafico batteria storico | — | — | ✅ |
| Storico percorsi + stats | ✅ | ✅ | ✅ |
| Storici ricariche + costo | ✅ | ✅ | ✅ |
| Modalità demo (no Tesla) | ✅ | ✅ | ✅ |
| WebSocket aggiornamenti live | ✅ | — | ✅ |
| Polling automatico ogni 30s | ✅ | — | — |