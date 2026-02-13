import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'discrete-sim',
  description: 'A powerful discrete event simulation library for JavaScript',

  themeConfig: {

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' }
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' }
          ]
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Processes', link: '/guide/processes' },
            { text: 'Resources', link: '/guide/resources' },
            { text: 'Statistics', link: '/guide/statistics' }
          ]
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Random Numbers', link: '/guide/random' },
            { text: 'Advanced Features', link: '/guide/advanced' },
            { text: 'Error Handling', link: '/guide/errors' }
          ]
        }
      ],

      '/api/': [
        {
          text: 'Core API',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Simulation', link: '/api/simulation' },
            { text: 'Process', link: '/api/process' },
            { text: 'Statistics', link: '/api/statistics' },
            { text: 'Random', link: '/api/random' }
          ]
        },
        {
          text: 'Resources',
          items: [
            { text: 'Resource', link: '/api/resource' },
            { text: 'Buffer', link: '/api/buffer' },
            { text: 'Store', link: '/api/store' }
          ]
        }
      ],

      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'M/M/1 Queue', link: '/examples/mm1-queue' },
            { text: 'Bank Tellers', link: '/examples/bank-tellers' },
            { text: 'Bank Express Lane', link: '/examples/bank-express-lane' },
            { text: 'Restaurant', link: '/examples/restaurant' },
            { text: 'Warehouse Operations', link: '/examples/warehouse' },
            { text: 'Hospital Emergency Room', link: '/examples/hospital-emergency' }
          ]
        },
        {
          text: 'Resource Examples',
          items: [
            { text: 'Fuel Station (Buffer)', link: '/examples/fuel-station' },
            { text: 'Warehouse Store (Store)', link: '/examples/warehouse-store' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/anesask/discrete-sim' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/discrete-sim' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © ${new Date().getFullYear()}`
    },

    search: {
      provider: 'local'
    }
  }
})