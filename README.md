# ⚡ Zap News

A **Stacker News-style social news platform** built on Nostr and Bitcoin Lightning. Share links, discuss ideas, and earn sats.

[![Edit with Shakespeare](https://shakespeare.diy/badge.svg)](https://shakespeare.diy/clone?url=https%3A%2F%2Fgithub.com%2FHeatherLarson%2Fzapnews.git)

## 🌐 Live Demo

**[https://zap-news.shakespeare.wtf](https://zap-news.shakespeare.wtf)**

## ✨ Features

### 📰 Social News Feed
- Browse posts sorted by **Hot**, **Recent**, or **Top** (by zaps)
- Hot ranking algorithm inspired by Hacker News
- Infinite scroll with real-time updates
- Support for both link posts and text discussions

### ⚡ Zap Integration
- Upvote posts by zapping with Bitcoin Lightning
- Real-time zap totals displayed on each post
- **Pay-to-reply**: Costs 10 sats to comment (like Stacker News)
- Supports WebLN wallets and Nostr Wallet Connect (NWC)

### 💬 Threaded Comments
- NIP-22 compliant comment system
- Nested/threaded replies with collapse/expand
- Zap individual comments to show appreciation

### 👤 Profiles
- View user profiles with avatar, banner, and bio
- See all posts by a specific user
- Lightning address display for zappable users

### 🏷️ Tags & Discovery
- Browse posts by hashtag
- Tag filtering at relay level for efficiency

### 🔌 Relay Management
- Easy relay picker in header
- Preset popular relays (Damus, Primal, Nostr.band, etc.)
- Add custom relays
- Auto-refresh content when relays change

### 🎨 Modern UI
- Clean, minimal design inspired by Stacker News
- Light/dark mode toggle
- Fully responsive (mobile-friendly)
- PWA-ready

## 🛠️ Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **shadcn/ui** - UI components
- **Nostrify** - Nostr protocol integration
- **TanStack Query** - Data fetching & caching
- **React Router** - Client-side routing

## 📋 Nostr Protocol

### Event Kinds Used
- **Kind 1** - Regular notes (posts)
- **Kind 11** - Threads with titles (NIP-7D)
- **Kind 1111** - Comments (NIP-22)
- **Kind 9735** - Zap receipts (NIP-57)
- **Kind 0** - User metadata
- **Kind 10002** - Relay list (NIP-65)

### Features
- Only shows posts from **zappable authors** (with Lightning addresses)
- Filters out replies to show only top-level posts
- Counts both NIP-22 comments and NIP-10 replies

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/HeatherLarson/zapnews.git
cd zapnews

# Install dependencies
npm install

# Start development server
npm run dev
```

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## ⚙️ Configuration

### Default Relays
The app connects to these relays by default:
- `wss://bevo.nostr1.com` (primary)
- `wss://relay.damus.io`
- `wss://relay.primal.net`

Users can change relays via the relay picker in the header.

### Reply Cost
The cost to post a reply is configured in `src/pages/ThreadPage.tsx`:
```typescript
const REPLY_COST_SATS = 10;
```

## 📁 Project Structure

```
src/
├── components/       # React components
│   ├── auth/        # Authentication components
│   ├── comments/    # Comment system
│   ├── ui/          # shadcn/ui components
│   ├── Header.tsx   # Main header with nav
│   ├── ThreadItem.tsx    # Post item in feed
│   ├── ThreadList.tsx    # Post feed
│   ├── RelayPicker.tsx   # Relay selector
│   ├── ZapButton.tsx     # Zap button
│   └── ZapDialog.tsx     # Zap payment modal
├── hooks/           # Custom React hooks
│   ├── useThreads.ts     # Post queries
│   ├── useZaps.ts        # Zap functionality
│   ├── useAuthor.ts      # User profiles
│   └── ...
├── pages/           # Route pages
│   ├── Index.tsx         # Home feed
│   ├── ThreadPage.tsx    # Post detail + comments
│   ├── ProfilePage.tsx   # User profile
│   ├── TagPage.tsx       # Posts by tag
│   └── SettingsPage.tsx  # Relay settings
├── contexts/        # React contexts
├── lib/             # Utilities
└── App.tsx          # App entry point
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

## 📄 License

This project is open source.

## 🙏 Acknowledgments

- Inspired by [Stacker News](https://stacker.news)
- Built with [Nostr](https://nostr.com) protocol
- Powered by Bitcoin Lightning Network
- Vibed with [Shakespeare](https://shakespeare.diy)

---

**Made with ⚡ by the Nostr community**
