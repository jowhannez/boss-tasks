// nuxt.config.ts
export default defineNuxtConfig({
  // existing config...

  ssr: false,                          // ← forces full static (no server-side rendering)
  target: 'static',                     // ← old name, still respected in Nuxt 3 for compatibility

  nitro: {
    preset: 'github_pages',              // ← tells Nitro to generate correct paths for gh-pages
    output: { publicDir: '.output/public' }
  },

  app: {
    baseURL: '/boss-tasks/'             // ← VERY IMPORTANT: your repo name!
  },

  // Optional but recommended
  routeRules: {
    '/_nuxt/**': { headers: { 'cache-control': 's-maxage=3600, stale-while-revalidate=60' } }
  }
})