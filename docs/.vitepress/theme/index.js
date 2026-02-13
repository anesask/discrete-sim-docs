import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    // Inject current year globally
    app.config.globalProperties.$currentYear = new Date().getFullYear()
  }
}
