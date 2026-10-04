# StudyBook

A social study workspace for students and tutors. StudyBook combines an academic feed, study groups, direct messaging, educational reels, a resource marketplace, and study tools in one React app backed by Firebase.

## Features

- **Academic Feed**: Share study posts and resources, filtered and ranked by grade level, subjects, freshness, and engagement.
- **Friends & Chat**: Friends list, one-on-one direct messages, and floating chat windows.
- **Study Groups**: Virtual classrooms with shared files, group posts, and per-group interaction scores.
- **User Profiles**: Bio, grade, subjects, streaks (bronze, silver, gold), badges, and posts.
- **Tutors**: Browse verified tutors and educators, follow them, and leave reviews.
- **Educational Reels**: Short-form study content, plus a composer for creating reels.
- **Bazaar Marketplace**: Share and browse calculators, textbooks, and giveaways.
- **Games**: Flashcards and quiz battles.
- **Study Settings**: Timer options and vocabulary filters.
- **Moderation and privacy**: Block users, control who can DM you, hide profile posts, and an admin role.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 4, Motion, Lucide icons
- **Backend**: Firebase (Firestore for data, Firebase Auth for sign-in)
- **File uploads**: Uploadcare (primary, files up to 25 MB) and Filestack
- **Hosting**: Vercel (SPA rewrites configured in `vercel.json`)

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm (a `bun.lock` is also included if you prefer Bun)
- A Firebase project with Firestore and Authentication enabled

### Installation

```bash
git clone https://github.com/TKGuest/StudyBook.git
cd StudyBook
npm install
```

### Configuration

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Fill in the `VITE_FIREBASE_*` values from **Firebase Console → Project Settings → General → Your apps → Web app configuration**.

3. Optionally, create a `firebase-applet-config.json` file in the project root. The app loads it first and falls back to the `VITE_FIREBASE_*` variables if it is missing or contains placeholder values.

4. Optionally, set `VITE_UPLOADCARE_PUBLIC_KEY` to use your own Uploadcare project. A default key is built in.

Never commit `.env` or any file containing live keys. `.env*` is already listed in `.gitignore`, except `.env.example`.

### Running Locally

```bash
npm run dev
```

The dev server starts on [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 3000 |
| `npm run build` | Build for production into `dist/` and copy the output to `build/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Type-check the project with `tsc --noEmit` |
| `npm run delete-bots` | Run `scripts/deleteBots.ts` to remove seeded bot and test accounts from Firestore. Requires `firebase-applet-config.json`. |
| `npm run clean` | Remove `dist/`, `build/`, and `server.js` |

## Project Structure

```
StudyBook/
├── src/
│   ├── components/   # Views and UI: FeedView, GroupsView, MessengerView, TutorsView, ...
│   ├── context/      # AppContext: global state, Firestore sync, and actions
│   ├── lib/          # Firebase, Uploadcare, and Filestack setup
│   ├── utils/        # Feed ranking, permissions, chat helpers, post factory, sounds, URL routing
│   ├── data/         # Mock data
│   ├── types.ts      # Shared TypeScript types
│   ├── App.tsx       # Layout and tab routing
│   └── main.tsx      # Entry point
├── scripts/          # Maintenance scripts (deleteBots.ts)
├── firestore.rules   # Firestore security rules
├── vercel.json       # Vercel SPA rewrites
└── vite.config.ts
```

## Deployment

The app is a static single-page app, so it can be deployed to any static host. `vercel.json` rewrites all routes to `index.html`.

1. Build the app with `npm run build`, or let Vercel run the build.
2. Set the `VITE_FIREBASE_*` environment variables in your hosting provider.
3. Deploy Firestore rules with the Firebase CLI: `firebase deploy --only firestore:rules`.

## Security Note

The current `firestore.rules` allow all reads and writes to every document:

```
allow read, write: if true;
```

This is fine for local development and testing, but it is not safe for production. Before launching, replace it with rules that check `request.auth` and restrict writes to the owning user.

## License

The source files are marked Apache-2.0 (SPDX identifier in the file headers). Add a `LICENSE` file to make this explicit for the repository.
