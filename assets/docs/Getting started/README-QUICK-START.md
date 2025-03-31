# Quick Start Guide

You should now be able to run:

```bash
npm run dev
```

This will start the development server and you can access the UI at http://localhost:3000.

## What's Included

- Basic Next.js app directory structure
- Tailwind CSS configuration
- Shadcn UI setup with components.json
- Sample page with a simple chat interface

## Next Steps

1. Install the packages needed for Shadcn UI:
   ```bash
   npm install class-variance-authority clsx tailwind-merge
   ```

2. Install additional Shadcn components as needed:
   ```bash
   npx shadcn-ui@latest add button
   npx shadcn-ui@latest add input
   # etc.
   ```

3. Connect the UI to your Mistral MCP adapter using the code in the `lib/mistral` directory.

Enjoy building your Mistr. Agent!
