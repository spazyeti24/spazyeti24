# StashTag

**StashTag** is a mobile app that helps you label and find everything in your home storage using QR codes. Scan any box with your phone to instantly see what's inside. Perfect for moving, holiday decorations, garage organization, or shared family storage.

---

## What StashTag Does

- **Create boxes** with a name, photo, location, and custom tags
- **Generate QR codes** for each box automatically
- **Scan boxes** with your phone camera to pull up box contents instantly
- **Share with family** — invite household members with different roles (Head, Editor, Viewer)
- **Works offline** — browse cached data even without internet, then syncs when you reconnect
- **Search everything** — find any box by name, description, tag, or storage location

---

## Prerequisites

Before you start, you'll need:

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) (comes with Node.js)
- A free [Supabase](https://supabase.com) account
- [Expo Go](https://expo.dev/go) app on your iPhone or Android phone

---

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up for a free account.
2. Click **"New Project"**.
3. Give it a name (e.g., "StashTag"), choose a region close to you, and set a database password.
4. Wait 1–2 minutes for the project to provision.
5. Once ready, go to **Project Settings → API** in the left sidebar.
6. Copy your:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public key** (long string starting with `eyJ...`)

---

## Step 2: Run the SQL Schema Migration

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar.
2. Click **"New query"**.
3. Open the file `supabase/migrations/001_initial_schema.sql` from this project.
4. Copy the entire contents and paste it into the SQL editor.
5. Click **"Run"** (or press Cmd+Enter / Ctrl+Enter).
6. You should see "Success. No rows returned." — this means all tables, policies, and triggers were created.

> **Tip:** If you see an error about a table already existing, that's okay — just make sure the full script completed without red errors.

---

## Step 3: Add Environment Variables

1. In the root of this project, copy the example file:

   ```
   cp .env.example .env
   ```

2. Open `.env` in any text editor.

3. Replace the placeholder values with your real Supabase credentials from Step 1:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. Save the file. **Never commit your `.env` file to git.**

---

## Step 4: Install Expo Go on Your Phone

- **iPhone:** Search "Expo Go" in the App Store, or visit [expo.dev/go](https://expo.dev/go)
- **Android:** Search "Expo Go" in the Google Play Store, or visit [expo.dev/go](https://expo.dev/go)

Make sure your phone and computer are on the **same Wi-Fi network**.

---

## Step 5: Install Dependencies and Start the App

Open a terminal in the project folder and run:

```bash
npm install
```

This downloads all the required packages (may take 1–3 minutes).

Then start the development server:

```bash
npx expo start
```

You'll see a QR code in the terminal. Open the **Expo Go** app on your phone and scan it. The app will load on your device.

> **Running on a simulator/emulator:**
> - iOS Simulator: press `i` in the terminal (requires Xcode on Mac)
> - Android Emulator: press `a` in the terminal (requires Android Studio)

---

## Step 6: Create Your First Account

1. When the app opens, tap **"Get Started"**
2. Enter your name, email, and a password
3. Give your household a name (e.g., "My Home" or "Smith Family")
4. You're in! Create your first box by tapping the **+** button in Boxes.

---

## Troubleshooting

### "Network request failed" or blank screen on login
- Double-check your `.env` file — make sure there are no extra spaces or quotes around the values.
- Confirm your Supabase project is active (green status in the dashboard).

### App won't load on phone / QR code doesn't work
- Make sure your phone and computer are on the same Wi-Fi network.
- Try pressing `r` in the terminal to reload the bundle.
- If on a corporate or school network, try your phone's hotspot instead.

### SQL migration errors
- If a table already exists, that's harmless — the `IF NOT EXISTS` clauses protect against duplicates.
- For a clean start, go to Supabase → Table Editor and drop any existing StashTag tables, then re-run the migration.

### Camera won't open for QR scanning
- On first launch, the app will ask for camera permission — tap "Allow".
- If you accidentally denied it, go to your phone's Settings → Apps → Expo Go (or StashTag) → Permissions → Camera → Allow.

### "Row Level Security" errors from Supabase
- This usually means the migration didn't run correctly. Re-run the full SQL file in the Supabase SQL Editor.

---

## Project Structure

```
/app          - Screen files (Expo Router)
/src/contexts - React contexts (Auth, Household)
/src/hooks    - Custom hooks (network, offline sync)
/src/components - Reusable UI components
/src/lib      - Supabase client, AsyncStorage helpers
/src/types    - TypeScript type definitions
/supabase     - Database migrations
```

---

## License

MIT — feel free to use and build on this.
