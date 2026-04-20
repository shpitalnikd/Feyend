# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Feyend is a location-based item-finding marketplace built with Expo (SDK 54) + Expo Router. Users post requests to find items at stores within a geographic area, optionally offering a finder's reward. Finders browse requests on a map+list feed, claim a find with photo proof, and the requester is notified. Trust is built through a poster score (post count + % rewards paid out + avg rating).

## Stack

- **Framework:** Expo SDK 54, Expo Router v6, React Native 0.81
- **Backend:** Supabase (Postgres + PostGIS, Auth, Storage, Realtime)
- **Map:** react-native-maps
- **Location:** expo-location (with reverse geocoding for location label)
- **Photos:** expo-image-picker
- **Slider:** @react-native-community/slider
- **Auth:** Supabase Auth — Email (Google + Apple planned)
- **Push:** expo-notifications (wired in app.json, not yet implemented)
- **Storage:** Supabase Storage (item-photos, claim-photos buckets) — plan to migrate to Cloudflare R2 at scale

## Getting Started

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run android    # Start on Android emulator
npm run ios        # Start on iOS simulator
```

## Environment

Copy `.env.example` to `.env` and fill in Supabase credentials:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## App Structure

```
app/
  (auth)/
    sign-in.tsx      # Email/password sign in
    sign-up.tsx      # Email/password sign up
  (tabs)/
    feed/
      index.tsx      # Map + list feed of open requests
      [id].tsx       # Request detail + claim flow
    post.tsx         # Create new request (GPS location, radius slider, expiry)
    activity/
      index.tsx      # My posts + my finds (segmented)
    profile/
      index.tsx      # Own profile with trust score
      [id].tsx       # Other user's profile
lib/
  supabase.ts        # Supabase client (SecureStore session persistence)
  types.ts           # TypeScript types: Profile, Request, Claim, Rating
components/
  AppMapView.native.tsx  # react-native-maps passthrough
  AppMapView.web.tsx     # Web stub (map not supported on web)
```

## Database Schema (Supabase)

- **profiles** — id, display_name, avatar_url, posts_count, paid_out_percent, avg_rating
- **requests** — id, poster_id, title, description, photo_url, store_name, location (PostGIS), lat, lng, radius_km, reward_amount, expires_at, status
- **claims** — id, request_id, finder_id, photo_url, status
- **ratings** — id, request_id, rater_id, rated_id, role, score

Auth trigger `handle_new_user` auto-creates a profile row on sign up (uses `public.profiles` fully qualified).

## Key Concepts

- **Requests** store both a PostGIS `geography(Point)` column and plain `lat`/`lng` columns (lat/lng used by the frontend map)
- **Claims** require a photo proof upload before notifying the requester
- **Poster trust score** = avg rating + post count + % rewards paid out — shown on every request card
- Location auto-detected via GPS on post form; reverse geocoded to show human-readable label
- Radius set via slider (1–50 km) on post form

## Known TODOs

- Push notifications not yet wired to claim events
- Google + Apple OAuth not yet configured in Supabase
- Expiry cron Edge Function not yet created
- Geo filtering on feed uses simple `.eq('status', 'open')` — needs PostGIS `ST_DWithin` RPC
- Ratings prompt after claim acceptance not yet implemented
