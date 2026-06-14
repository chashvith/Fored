# Focusread

Focusread is a modern, lightweight reading application tailored for EPUB documents. Built with Next.js and React, it prioritizes a clean, distraction-free reading experience while offering integrated AI features to help you understand and interact with your books.

## Features

- **EPUB Support**: Native rendering of EPUB documents using `epub.js`.
- **AI Integration**: Select text to get instant explanations, translations, or full-page summaries powered by the Google Gemini API.
- **Reading Dashboard**: Track your reading progress, manage your digital library, and bookmark your favorite sections.
- **Offline Storage**: Your uploaded books are stored locally in the browser using IndexedDB for fast, offline access.
- **Typography & Theming**: Fully customizable reading experience with adjustable font sizes, line heights, and built-in light/dark modes.
- **Annotations**: Highlight text directly in the reader and persistently save your notes to the dashboard.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS & Floating UI (for contextual popups)
- **State Management**: Zustand
- **Reader Engine**: epub.js
- **AI Services**: Google Gemini API

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/chashvith/Fored.git
   cd Fored
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Set up the environment variables:
   Create a `.env.local` file in the root directory and add your API keys.
   ```bash
   # Example
   GEMINI_API_KEY=your_google_gemini_api_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

## Usage

1. Open the Dashboard to import an EPUB file.
2. Click on the imported book to launch the Reader.
3. Highlight text to bring up the context toolbar for AI Explanations, Translations, or Highlighting.
4. Access the top right settings gear to adjust typography and toggle dark mode.
5. Books can be deleted directly from the Dashboard when finished.

## License

This project is open-source and available under the MIT License.
