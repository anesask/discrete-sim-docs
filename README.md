# Discrete-Sim Documentation

Documentation website for the discrete-sim npm package - a powerful discrete event simulation library for JavaScript.

## Quick Start

### Installation

```bash
npm install
```

### Development

Start the documentation dev server:

```bash
npm run docs:dev
```

The documentation will be available at `http://localhost:5173`

### Build

Build the documentation for production:

```bash
npm run docs:build
```

### Preview

Preview the production build locally:

```bash
npm run docs:preview
```

## Documentation Structure

```
docs/
├── .vitepress/
│   └── config.js         # VitePress configuration
├── index.md              # Home page
├── guide/
│   ├── index.md          # Introduction
│   ├── installation.md   # Installation guide
│   ├── quick-start.md    # Quick start tutorial
│   └── ...               # Other guides
├── api/
│   └── index.md          # API reference
└── examples/
    └── index.md          # Example simulations
```

## Deployment

### GitHub Pages

The documentation is automatically deployed to GitHub Pages when you push to the `main` branch. The GitHub Actions workflow is configured in `.github/workflows/deploy.yml`.

To enable GitHub Pages:
1. Go to Settings > Pages in your GitHub repository
2. Set Source to "GitHub Actions"

### Netlify

To deploy on Netlify:
1. Connect your GitHub repository to Netlify
2. The `netlify.toml` file contains all necessary configuration
3. Deploy will trigger automatically on push

### Vercel

To deploy on Vercel:
```bash
npm run docs:build
# Upload docs/.vitepress/dist folder
```

## Features

- **Modern Documentation Site** - Built with VitePress for fast, SEO-friendly docs
- **Interactive Examples** - Live code examples that run in the browser
- **API Reference** - Complete API documentation with TypeScript types
- **Search** - Built-in local search functionality
- **Dark Mode** - Automatic dark/light theme support
- **Mobile Responsive** - Works great on all devices

## Customization

### Theme Configuration

Edit `docs/.vitepress/config.js` to customize:
- Navigation menu
- Sidebar structure
- Social links
- Footer content

### Styling

Create `docs/.vitepress/theme/custom.css` for custom styles:

```css
:root {
  --vp-c-brand: #646cff;
  --vp-c-brand-light: #747bff;
  --vp-c-brand-dark: #535bf2;
}
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-docs`)
3. Commit your changes (`git commit -m 'Add amazing documentation'`)
4. Push to the branch (`git push origin feature/amazing-docs`)
5. Open a Pull Request

## License

This documentation is part of the discrete-sim package and follows the same license.