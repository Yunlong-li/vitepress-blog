import { defineConfig } from 'vitepress'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const isUserOrOrgPages = repositoryName?.endsWith('.github.io')
const base = process.env.GITHUB_ACTIONS && repositoryName && !isUserOrOrgPages
  ? `/${repositoryName}/`
  : '/'

export default defineConfig({
  title: '我的博客',
  description: '用 VitePress 搭建的个人博客',
  lang: 'zh-CN',
  base,
  srcExclude: ['blog_origin/**'],
  cleanUrls: true,
  lastUpdated: true,
  head: [
    ['meta', { name: 'theme-color', content: '#2563eb' }],
    ['link', { rel: 'icon', href: `${base}favicon.svg` }]
  ],
  themeConfig: {
    logo: `${base}favicon.svg`,
    nav: [
      { text: '首页', link: '/' },
      { text: '文章', link: '/posts/' },
      { text: '关于', link: '/about' }
    ],
    sidebar: {
      '/posts/': [
        {
          text: '全栈学习',
          items: [
            { text: 'TypeScript 实战教程', link: '/posts/typescript-learning-roadmap' },
            { text: 'Node.js 实战教程', link: '/posts/nodejs-learning-roadmap' }
          ]
        },
        {
          text: 'JavaScript',
          items: [
            { text: '异步与事件循环', link: '/posts/js-async-event-loop' },
            { text: '数值与字符串', link: '/posts/js-number-string' },
            { text: 'this、闭包与函数技巧', link: '/posts/js-this-closure-functional' },
            { text: '集合、数组与遍历', link: '/posts/js-collections-arrays-iteration' }
          ]
        },
        {
          text: 'Vue',
          items: [
            { text: 'Vue 3 面试复习', link: '/posts/vue3-review' },
            { text: 'Vue 3 相比 Vue 2 的变化', link: '/posts/vue3-vs-vue2-deep-dive' }
          ]
        },
        {
          text: '前端工程实践',
          items: [
            { text: '微前端实战与面试复习', link: '/posts/micro-frontend-guide' },
            { text: '白屏与卡顿故障排查', link: '/posts/frontend-troubleshooting-white-screen-jank' },
            { text: '前端性能优化系统梳理', link: '/posts/frontend-performance-optimization' },
            { text: '前端埋点实战与面试复习', link: '/posts/frontend-tracking-guide' },
            { text: '移动端适配实战与面试复习', link: '/posts/mobile-adaptation-guide' }
          ]
        },
        {
          text: '浏览器与前端工程',
          items: [
            { text: '浏览器渲染与前端性能', link: '/posts/browser-render-performance' },
            { text: '前端兼容、路由与 SEO', link: '/posts/frontend-routing-seo-compat' },
            { text: 'CSS 0.5px 边框实现', link: '/posts/css-half-pixel-border' }
          ]
        },
        {
          text: '算法与复习',
          items: [
            { text: '算法与手写题复习', link: '/posts/algorithm-coding' },
            { text: '复习待办清单', link: '/posts/review-todo' }
          ]
        },
        {
          text: '归档',
          items: [
            { text: '旧博客笔记归档（原始）', link: '/posts/notebook' },
            { text: '开始写博客', link: '/posts/hello-vitepress' }
          ]
        }
      ]
    },
    search: {
      provider: 'local'
    },
    outline: {
      label: '本页目录',
      level: [2, 3]
    },
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },
    lastUpdated: {
      text: '最后更新',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short'
      }
    },
    socialLinks: []
  }
})
