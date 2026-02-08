import DefaultTheme from 'vitepress/theme'
import './custom.css'
import SimulationPlayground from './components/SimulationPlayground.vue'
import MM1QueuePlayground from './components/MM1QueuePlayground.vue'
import CoffeeShopPlayground from './components/CoffeeShopPlayground.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Inject current year globally
    app.config.globalProperties.$currentYear = new Date().getFullYear()

    // Register custom components
    app.component('SimulationPlayground', SimulationPlayground)
    app.component('MM1QueuePlayground', MM1QueuePlayground)
    app.component('CoffeeShopPlayground', CoffeeShopPlayground)
  }
}
