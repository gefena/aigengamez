export const en = {
  nav: {
    explore: "Explore",
    about: "About",
  },
  home: {
    badge: "Next-Gen AI Gaming",
    title: "The Future of Play is",
    titleAccent: "Here and Now",
    subtitle:
      "Experience games crafted, adapted, and powered by artificial intelligence. No downloads required. Play instantly in your browser on any device.",
    exploreBtn: "Explore Games",
    howItWorks: "How it Works",
    featuredTitle: "Featured Games",
    viewAll: "View All",
    ctaTitle: "Ready to Enter the Arena?",
    ctaDesc: "Join thousands of players in the next generation of adaptive gaming.",
    playFree: "Play Now for Free",
  },
  explore: {
    title: "Explore Games",
    subtitle: "Discover the best AI-powered games hand-picked for you.",
    searchPlaceholder: "Search for games or developers...",
    surpriseTitle: "Surprise Me!",
    surpriseSubtitle: "Pick your vibe and we'll send you somewhere fun",
    kids: "Kids",
    adult: "Adult",
    noGames: "No games found",
    noGamesHint: "Try adjusting your search criteria or category filter.",
    resetFilters: "Reset Filters",
  },
  gameDetail: {
    back: "← Back to Explore",
    gameInfo: "Game Info",
    controls: "Controls",
    controlsVal: "Mouse / Touch",
    type: "Type",
    typeVal: "Single Player",
    aiModel: "AI Model",
    aiModelVal: "Placeholder v1.0",
    status: "Status",
    statusVal: "Beta Prototype",
    share: "Share Game",
    notFound: "Game not found.",
  },
  about: {
    title: "About aigengamez",
    body: "aigengamez is an experimental platform built to showcase the future of interactive entertainment. We believe that artificial intelligence will revolutionize how games are created, played, and experienced. Our mission is to collect and develop the best AI-powered mini-games for you to enjoy directly in your browser.",
    startPlaying: "Start Playing",
  },
  games: {} as Record<string, { title: string; description: string }>,
};

export type Translations = typeof en;
