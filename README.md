# IPO0 VLSI Backend Analysis Platform

An AI-powered platform for analyzing VLSI backend data, including timing paths, congestion, and logs.

## Features

- **Timing Path Analysis**: Analyze critical paths and timing violations
- **Congestion Analysis**: Visualize and identify routing congestion issues
- **Log Analysis**: Parse and extract insights from tool logs

## Getting Started

### Prerequisites

- Node.js 18.0.0 or later
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ipo0agent.git
cd ipo0agent
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Run the development server
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technology Stack

- **Next.js**: React framework for server-rendered applications
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Framer Motion**: Animation library
- **React Spinners**: Loading animations

## Project Structure

```
ipo0agent/
├── src/
│   ├── app/
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/
│   │   └── LoadingScreen.tsx  # Loading screen component
│   ├── styles/
│   │   └── globals.css   # Global styles
│   └── lib/              # Utility functions and helpers
├── public/               # Static assets
├── tailwind.config.js    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies and scripts
```

## License

MIT
