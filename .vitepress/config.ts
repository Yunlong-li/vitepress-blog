import { defineConfig } from 'vitepress'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

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
  markdown: {
    config(md) {
      const defaultFence = md.renderer.rules.fence?.bind(md.renderer.rules)

      md.renderer.rules.fence = (tokens, index, options, env, self) => {
        const token = tokens[index]
        const language = token.info.trim().split(/\s+/)[0]

        if (language === 'mermaid') {
          const code = encodeURIComponent(token.content)
          const fallback = escapeHtml(token.content)

          return [
            `<MermaidDiagram code="${code}">`,
            `<pre class="mermaid-fallback"><code>${fallback}</code></pre>`,
            '</MermaidDiagram>'
          ].join('')
        }

        if (defaultFence) {
          return defaultFence(tokens, index, options, env, self)
        }

        return self.renderToken(tokens, index, options)
      }
    }
  },
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
            { text: 'Node.js 实战教程', link: '/posts/nodejs-learning-roadmap' },
            { text: '单点登录 SSO 讲解', link: '/posts/single-sign-on-guide' }
          ]
        },
        {
          text: '后端基础设施',
          items: [
            { text: 'Nginx 使用教程', link: '/posts/nginx-practical-guide' },
            { text: '消息队列中间件使用教程', link: '/posts/message-queue-middleware-guide' },
            { text: '幂等性讲解', link: '/posts/idempotency-guide' },
            { text: 'Redis 使用教程', link: '/posts/redis-practical-guide' },
            { text: 'Supabase 使用教程', link: '/posts/supabase-practical-guide' },
            { text: 'PostgreSQL 使用教程', link: '/posts/postgresql-practical-guide' }
          ]
        },
        {
          text: 'Python 后端',
          items: [
            { text: 'RESTful API 讲解', link: '/posts/restful-api-guide' },
            { text: 'FastAPI 使用教程', link: '/posts/fastapi-practical-guide' },
            { text: 'Django 使用教程', link: '/posts/django-practical-guide' },
            { text: 'PostgreSQL 后端开发教程', link: '/posts/postgresql-backend-guide' },
            { text: 'SQLAlchemy 使用教程', link: '/posts/sqlalchemy-practical-guide' }
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
            { text: 'Vue 3 相比 Vue 2 的变化', link: '/posts/vue3-vs-vue2-deep-dive' },
            { text: 'Vue Diff 算法讲解', link: '/posts/vue-diff-algorithm' },
            { text: '虚拟 DOM 讲解', link: '/posts/virtual-dom-deep-dive' },
            { text: 'Vue 全局状态管理工具', link: '/posts/vue-state-management' },
            { text: 'Vue 组件通信方式', link: '/posts/vue-component-communication' }
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
