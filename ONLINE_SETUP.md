# Turn on the online ranking (free, about 10 minutes)

Out of the box the game runs in **offline mode**: the leaderboard shows the 🤖 arena bots and the
players who signed in on the same device. Follow these steps so **friends on other devices** appear
in the same ranking.

## 1. Create a free Supabase project
1. Go to <https://supabase.com> and sign up (you can use your GitHub account).
2. Click **New project**. Pick any name (for example `hackathon-arena`), choose a database password
   (save it somewhere), and pick a region close to you (for example *Frankfurt*).
3. Wait about two minutes until the project is ready.

## 2. Create the ranking tables
1. In your project open **SQL Editor** → **New query**.
2. Open the file `online-setup.sql` from this repository, copy **everything** and paste it in.
3. Click **Run**. You should see *Success. No rows returned*.

## 3. Copy your two values
1. Open **Project Settings → API** (or click **Connect** at the top).
2. Copy the **Project URL** (looks like `https://abcdefghijk.supabase.co`).
3. Copy the **anon public** key (a long text starting with `eyJ`).

> ⚠️ Never use the **service_role** key anywhere in this game. Only the **anon** key is safe to publish.

## 4. Paste them into `config.js`
```js
window.ARENA_ONLINE = {
  url: 'https://abcdefghijk.supabase.co',
  anonKey: 'eyJ...your anon key...'
};
```
Save, commit and push the file. The leaderboard now says **🌐 ONLINE**.

## 5. Put the game on the internet so friends can open it
On GitHub open your repository → **Settings → Pages** → under *Build and deployment* choose
**Deploy from a branch**, branch **main**, folder **/ (root)** → **Save**.
After a minute your game is live at `https://<your-username>.github.io/<repository-name>/`.
Share that link with friends (the **🔗 INVITE FRIENDS** button on the leaderboard copies it).

## Good to know
- **Names are first come, first served.** The first device that uses a name owns it. Someone who tries
  the same name from another device is asked to pick a different one.
- **Not cheat-proof.** XP is calculated in the browser, so a determined player could fake a score.
  The database limits big jumps, but it is fine for friendly competition, not for prizes.
- **Free projects pause** after about a week without any visits. Open the Supabase dashboard and click
  *Restore* if that happens. Your data is kept.
