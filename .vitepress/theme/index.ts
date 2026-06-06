import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import MermaidDiagram from './MermaidDiagram.vue'
import MusicDock from './MusicDock.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => h(MusicDock)
    })
  },
  enhanceApp({ app }) {
    app.component('MermaidDiagram', MermaidDiagram)
  }
}
