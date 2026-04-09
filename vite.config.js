# CardSnap 🃏

List sports cards on eBay in 30 seconds. Photo → AI identification → quick questions → live listing.

---

## Deploy to Netlify (5 minutes)

### Step 1 — Push to GitHub
1. Create a new repo on GitHub (can be private)
2. Upload all these files to it

### Step 2 — Connect to Netlify
1. Go to [netlify.com](https://netlify.com) and sign up / log in
2. Click **Add new site → Import an existing project**
3. Connect your GitHub account and select this repo
4. Build settings will auto-detect from `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy site**

### Step 3 — Add your Gemini API key
1. Get a free key at [aistudio.google.com](https://aistudio.google.com) (free tier = 1,500 req/day, ~$0.0002/scan after)
2. In Netlify: go to **Site → Environment variables**
3. Add: `GEMINI_API_KEY` = your key
4. Click **Save** then **Trigger deploy → Deploy site**

That's it — your app is live on Gemini Flash.

---

## Optional: Switch to Claude for higher accuracy

Claude Sonnet is more accurate on tricky parallels and graded slab labels but costs ~$0.03/scan vs $0.0002 for Gemini.

1. Get a key from [console.anthropic.com](https://console.anthropic.com)
2. In Netlify Environment Variables add:
   - `AI_PROVIDER` = `claude`
   - `ANTHROPIC_API_KEY` = your key
3. Redeploy

---

## Local development

```bash
npm install
npm install -g netlify-cli

# Add your API key
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Run locally (starts both Vite + Netlify functions)
netlify dev
```

Open http://localhost:8888

---

## Project structure

```
cardsnap/
├── netlify/
│   └── functions/
│       └── analyze-card.js   ← AI vision call (server-side, key stays safe)
├── src/
│   ├── main.jsx
│   └── App.jsx               ← Full React app
├── index.html
├── netlify.toml              ← Netlify config + redirects
├── package.json
└── vite.config.js
```

---

## Next steps after deploy

- [ ] Wire up real eBay API (Sell API + OAuth)
- [ ] Wire up real eBay comp pricing (Finding API)
- [ ] Add user accounts (Supabase Auth)
- [ ] Store listing history (Supabase DB)
- [ ] Add back photo support to improve accuracy
- [ ] Add image upload to Cloudflare R2 for eBay listing photos
