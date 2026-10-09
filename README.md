<div align="center">

# YouTube Clone

### A responsive video discovery and watch experience, powered by the YouTube Data API v3.

[![React](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)](https://vite.dev/)
[![React Router](https://img.shields.io/badge/React_Router-7-f44250?logo=reactrouter&logoColor=white)](https://reactrouter.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![YouTube Data API](https://img.shields.io/badge/API-YouTube_Data_API_v3-ff0033?logo=youtube&logoColor=white)](https://developers.google.com/youtube/v3)
[![Google Cloud Console](https://img.shields.io/badge/Google_Cloud-Console-4285F4?logo=googlecloud&logoColor=white)](https://console.cloud.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-f7df1e?logo=javascript&logoColor=222)](https://developer.mozilla.org/docs/Web/JavaScript)
[![CSS](https://img.shields.io/badge/CSS-Tailwind_and_project_styles-663399?logo=css&logoColor=white)](https://developer.mozilla.org/docs/Web/CSS)
[![HTML](https://img.shields.io/badge/HTML-Vite_entry-e34f26?logo=html5&logoColor=white)](https://developer.mozilla.org/docs/Web/HTML)

[![Live Demo](https://img.shields.io/badge/Live_Demo-Open_App-00c853?logo=vercel&logoColor=white)](https://you-tube-clone-nine-pearl.vercel.app)

[Explore the repository](https://github.com/rahulsinghkushwaha232/YouTube-Clone) · [Report a bug](https://github.com/rahulsinghkushwaha232/YouTube-Clone/issues)

</div>

---

## Overview

YouTube Clone is a single-page video browsing application built with React 19 and Vite. It brings together popular and category-based feeds, paginated search, a feature-rich watch page, and browser-local library tools in a responsive dark interface.

The project uses the official YouTube Data API v3 for public video information. Watch history, subscriptions, preferences, reports, feedback, likes, Watch later items, and the optional sign-in profile are stored locally in the browser.

> This is an independent learning project and is not affiliated with or endorsed by YouTube or Google.

## Highlights

| Discover | Watch | Personalize |
| --- | --- | --- |
| Popular feed with infinite scrolling | Embedded YouTube player | Local watch history |
| Category chips with trending fallbacks | Suggested videos and channel filter | Subscriptions and channel uploads |
| Search with previous/next pagination | Comments, sorting, and pagination | Watch later and liked videos |
| Explore, subscriptions, and Shorts | Theater mode and autoplay next | Region and player preferences |

### Video discovery

- Browse popular videos and select categories including Music, Gaming, Live, Technology, Mixes, Podcasts, Design, and Recently uploaded.
- Search videos and move through result pages.
- Discover category-matched trending videos from a watch page; request channel-specific suggestions only when needed.
- Browse Explore, Shorts, and the latest public uploads from locally saved subscriptions.
- See loading skeletons, retryable errors, and friendly empty states.

### Watch experience

- Responsive embedded player with autoplay preference, fullscreen, and picture-in-picture support.
- Theater mode and autoplay-next controls.
- Video details, expandable description, channel subscription, like/dislike actions, sharing, and report flow.
- Public comments with relevance/date sorting and pagination. New comments are local to the current view.
- Suggested-video cards adapt from a desktop side column to a full-width list on smaller screens.

### Your browser library

- Watch history is deduplicated, ordered newest-first, limited to 50 videos, and can be cleared.
- Subscriptions, Watch later, liked videos, settings, reports, and feedback are stored in local storage.
- Google Identity Services can display a locally stored profile. This does not connect the app to a Google account's private YouTube data.

## Technology

| Area | Implementation |
| --- | --- |
| Languages | JavaScript (ES modules and JSX), CSS, and HTML |
| UI | React 19 |
| Build and development | Vite 8 |
| Routing | React Router DOM 7 |
| Styling | Tailwind CSS 4 with `@tailwindcss/vite`, plus project CSS |
| Video data | YouTube Data API v3 using `fetch` |
| Sign-in profile | Google Identity Services |
| Local persistence | Browser `localStorage` |
| Linting | Oxlint |

## Routes

| Route | Page |
| --- | --- |
| `/` | Popular feed and category filters |
| `/watch/:id` | Player, video details, comments, and suggestions |
| `/search/:searchTerm` | Search results with pagination |
| `/explore` | Explore page and category shortcuts |
| `/subscriptions` | Saved channels and their latest public videos |
| `/library` | Locally saved Watch later and liked videos |
| `/history` | Local watch history |
| `/shorts` | Short-video results with load-more pagination |

All routes share the responsive application layout. Direct route requests are configured to resolve through the Vercel SPA rewrite.

## Getting started

### Prerequisites

- Node.js compatible with Vite 8
- npm
- A [Google Cloud project](https://console.cloud.google.com/) with **YouTube Data API v3** enabled and an API key
- Optional: a Google OAuth 2.0 Web client ID for the sign-in profile feature

### Install

```bash
git clone https://github.com/rahulsinghkushwaha232/YouTube-Clone.git
cd YouTube-Clone
npm install
```

### Configure environment variables

In the [Google Cloud Console](https://console.cloud.google.com/), create/select a project, enable **YouTube Data API v3**, and create an API key. Copy `.env.example` to `.env` in the repository root and replace the placeholders:

```env
VITE_YOUTUBE_API_KEY=your_youtube_data_api_key
VITE_GOOGLE_CLIENT_ID=your_google_oauth_web_client_id
```

`VITE_GOOGLE_CLIENT_ID` is optional. If omitted, Google sign-in stays disabled. Configure the OAuth client with the JavaScript origins where the application will run.

Start the development server:

```bash
npm run dev
```

Open the local app at [http://localhost:5175/](http://localhost:5175/). Restart the dev server after changing environment variables.

### Available commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run lint` | Check source with Oxlint |
| `npm run build` | Create the production build in `dist/` |
| `npm run preview` | Serve the production build locally |

## YouTube API and quota

API requests are centralized in [`src/lib/youtubeApi.js`](src/lib/youtubeApi.js). The application uses endpoints including:

- `videos.list` for popular/category feeds and video details
- `search.list` for user searches, Shorts, live results, and channel-specific suggestions
- `channels.list` for channel subscriber counts
- `commentThreads.list` for public video comments

Successful responses are cached in local storage for one hour. Category feeds and default watch-page suggestions use `videos.list` where possible; the channel-specific suggestion filter invokes search only when selected. When quota is exhausted, a matching cached response can still be used, and the UI reports quota errors with a friendly message.

YouTube Data API projects commonly start with a daily allocation of **10,000 quota units**; check the current limits for your own Google Cloud project. A `search.list` request commonly costs 100 units, while many `videos.list` requests cost 1 unit. Search pagination can therefore consume quota quickly.

### Protect your API key

The `.env` file is excluded by `.gitignore` and should never be committed. Vite embeds `VITE_` variables into browser-delivered code, so an API key used by this frontend is visible to visitors. In Google Cloud Console:

1. Restrict the key to the YouTube Data API v3.
2. Add the exact local and production HTTP referrers that should be allowed.
3. Monitor quota usage and rotate the key if it is exposed outside its intended referrers.

## Deploy to Vercel

1. Import [this GitHub repository](https://github.com/rahulsinghkushwaha232/YouTube-Clone) into Vercel.
2. Use the Vite build defaults: build command `npm run build`, output directory `dist`.
3. Add `VITE_YOUTUBE_API_KEY` and, if used, `VITE_GOOGLE_CLIENT_ID` in the Vercel project's environment-variable settings.
4. Update the API key's allowed referrers and the OAuth client's authorized JavaScript origins to include the production domain.
5. Deploy or redeploy the project.

The repository's [`vercel.json`](vercel.json) includes an SPA rewrite so routes such as `/watch/:id` also load when opened directly.

## Project structure

```text
.
├── public/                 # Public static assets
├── src/
│   ├── components/         # Layout, navigation, feeds, dialogs, and watch UI
│   ├── lib/                # YouTube API, auth, and local-storage helpers
│   ├── assets/             # Imported static assets
│   ├── App.jsx             # Home feed
│   ├── main.jsx            # Application entry point and route definitions
│   └── index.css           # Global styles and responsive theme
├── .env                    # Local-only configuration; not committed
├── .env.example            # Safe placeholder environment template
├── .gitignore
├── package.json
├── vite.config.js
└── vercel.json             # Vercel SPA routing
```

## Data and privacy notes

- The app requests public YouTube data using the configured API key.
- Watch history, subscriptions, preferences, reports, feedback, likes, Watch later items, and the optional sign-in profile remain in this browser's local storage.
- Google sign-in is used to display a profile in the app; it does not provide OAuth access to personal YouTube playlists or account data.
- Clearing browser storage removes locally saved app data.

---

<div align="center">

Built as an independent React learning project.

</div>
