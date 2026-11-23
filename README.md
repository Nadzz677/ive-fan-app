# IVE Dive Archive

Build a modern responsive web application called “IVE: Dive Archive”, a fan-made information and music-discovery app dedicated to the K-pop group IVE.

The app should feel like a polished modern mobile application rather than a traditional website. It must work beautifully on mobile screens first, while remaining responsive on desktop.

Technology

Use:

- React

- TypeScript

- Tailwind CSS

- Lucide icons

For this first version, use static local data/JSON instead of a backend. Structure the code so that a database such as Supabase or Firebase can be added later.

Visual Design

Create a premium K-pop-inspired interface with:

- Clean modern typography

- Soft glassmorphism elements

- Rounded cards

- Subtle shadows

- Smooth transitions and micro-animations

- Large album artwork

- Elegant spacing

- Minimal visual clutter

- Mobile-first layout

Do not make the interface look like a generic AI-generated dashboard.

The design should feel like a polished music/fan application.

Main Navigation

Create these primary sections:

1. Home

2. Members

3. Discography

4. Music

5. Favorites

Use a modern bottom navigation bar on mobile.

Home Screen

Create a visually impressive home screen containing:

- IVE hero section

- Featured release

- Featured song

- Six member preview cards

- Recently added albums

- Quick navigation to Members and Discography

- A compact music-player preview

The home screen should immediately communicate that this is an IVE fan application.

Members

Create a Members page containing six member cards:

- An Yujin

- Gaeul

- Rei

- Jang Wonyoung

- Liz

- Leeseo

Each member card should have:

- Image area

- Name

- Short information

- Interactive hover/tap animation

Create a dedicated member-detail view that can later be expanded with biography and additional information.

Discography

Create an album browsing interface.

Each album card should contain:

- Album artwork

- Album title

- Release date

- Number of tracks

Create an album-detail view containing:

- Large album artwork

- Album title

- Release date

- Track list

- Favorite button

Use placeholder/local image assets where necessary rather than inventing external image URLs.

Music

Create a music-library interface with:

- Song cards

- Album artwork

- Song title

- Album name

- Favorite button

- Play button

Add a persistent bottom music player that appears when a song is selected.

The player should visually include:

- Album artwork

- Song title

- Play/pause

- Previous/next

- Progress bar

- Favorite button

For this version, do not include copyrighted audio files. Build the player interface and interaction logic using placeholder audio or a simulated playback state.

Favorites

Create a Favorites page where users can view:

- Favorite songs

- Favorite albums

- Favorite members

Persist favorites using localStorage so they remain after refreshing the page.

Navigation and Interaction

Make navigation feel like a real mobile application.

Add:

- Smooth page transitions

- Button feedback

- Card animations

- Press/tap interactions

- Empty states for sections with no favorites

Code Quality

Keep the application modular.

Separate:

- Components

- Pages

- Data

- Types

- Utility functions

Create reusable components for:

- Member cards

- Album cards

- Song cards

- Navigation

- Music player

- Favorite buttons

Do not put everything into one large component.

Important

Build the application as a functional first version, not merely a static mockup.

All navigation buttons should work.

Favorite interactions should work.

Album and member detail views should work.

The music player should respond to user interactions even if actual audio playback is simulated.

After implementing the initial version, show the application and explain the main structure briefly.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/76bb26ee-df98-4abd-94a1-03952b4c1037).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
