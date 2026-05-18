import fs from 'node:fs'
import path from 'node:path'

const sourcePath = path.join('posts', 'notebook.md')

const groups = [
  {
    file: 'js-async-event-loop.md',
    title: 'JavaScript 异步与事件循环',
    description: '整理 JS 异步、事件循环、队列和计时器相关复习内容。',
    sections: [
      'js异步',
      '事件循环（渲染主线程、微队列、交互队列、延时队列等等）',
      '事件循环输出题目',
      'js中计时器精准吗？'
    ]
  },
  {
    file: 'js-number-string.md',
    title: 'JavaScript 数值与字符串',
    description: '整理浮点数精度处理、字符串 substring 与 slice 的区别。',
    sections: ['前端浮点数处理', 'JS中字符串的substring方法和slice方法的区别']
  },
  {
    file: 'js-this-closure-functional.md',
    title: 'JavaScript this、闭包与函数技巧',
    description: '整理 this 指向、闭包、节流防抖、函数柯里化等高频 JavaScript 主题。',
    sections: ['函数调用方式/this', '闭包', '节流、防抖', '函数柯里化']
  },
  {
    file: 'js-collections-arrays-iteration.md',
    title: 'JavaScript 集合、数组与遍历',
    description: '整理 Map、Set、Object、数组方法和循环遍历相关复习内容。',
    sections: [
      'Map和WeakMap？Set与WeakSet？',
      '举例说明+什么是原始值',
      '数组有哪些方法',
      '数组的遍历方法中，哪些可以中断，哪些不能中断',
      'for循环、for in和for of',
      '**Object 与 Map 的深度对比与替代性分析**'
    ]
  },
  {
    file: 'vue3-review.md',
    title: 'Vue 3 面试复习',
    description: '整理 Vue3 与 Vue2 对比、组合式 API、Hook、TypeScript 支持和生命周期。',
    sections: [
      'Vue3的组合式api和Vue2的选项式区别',
      'Vue3中Hook？自定义Hook？',
      '为什么Vue3对TypeScript的支持更友好？',
      'Vue3的生命周期钩子，对比Vue2',
      'Vue3与Vue2不同'
    ]
  },
  {
    file: 'browser-render-performance.md',
    title: '浏览器渲染与前端性能',
    description: '整理浏览器渲染流程、回流重绘、transform 性能和首屏加载优化。',
    sections: [
      '浏览器是如何渲染页面的？',
      '什么是 reflow（回流、重排）？',
      '什么是 repaint（重绘）？',
      '为什么 transform 的效率高？',
      '首屏加载慢怎么办'
    ]
  },
  {
    file: 'frontend-routing-seo-compat.md',
    title: '前端兼容、路由与 SEO',
    description: '整理兼容性处理、前端路由、SEO、预渲染和相关工程实践。',
    sections: ['前端如何解决兼容性问题', '什么是前端路由？', '前端SEO怎么做？']
  },
  {
    file: 'css-half-pixel-border.md',
    title: 'CSS 0.5px 边框实现',
    description: '整理高清屏下 0.5px 边框的多种实现方案和适用场景。',
    sections: ['实现一个0.5px的边框']
  },
  {
    file: 'algorithm-coding.md',
    title: '算法与手写题复习',
    description: '整理链表、缓存高阶函数、超时请求、等价多米诺骨牌等 coding 题。',
    sections: [
      '翻转列表（双指针/递归/栈）',
      '（CODING）翻转单链表',
      '（CODING）实现带缓存结果功能的高阶函数',
      '（CODING）实现带超时的请求函数',
      '等价多米诺骨牌对的数量'
    ]
  }
]

const source = fs.readFileSync(sourcePath, 'utf8')
const sections = collectSections(source)
const byTitle = new Map(sections.map((section) => [section.title, section]))

for (const group of groups) {
  fs.writeFileSync(path.join('posts', group.file), renderGroup(group, byTitle), 'utf8')
}

fs.writeFileSync(path.join('posts', 'review-todo.md'), renderTodo(), 'utf8')

function collectSections(markdown) {
  const lines = markdown.split(/\r?\n/)
  const sections = []
  let inFrontmatter = false
  let frontmatterClosed = false
  let currentDate = ''
  let current = null

  for (const line of lines) {
    if (!frontmatterClosed && line === '---') {
      inFrontmatter = !inFrontmatter
      if (!inFrontmatter) frontmatterClosed = true
      continue
    }

    if (inFrontmatter) continue

    const dateMatch = line.match(/^#\s+(20\d{2}\.\d{2}\.\d{2})\s*$/)
    if (dateMatch) {
      currentDate = dateMatch[1]
      continue
    }

    const sectionMatch = line.match(/^##\s+(.+?)\s*$/)
    if (sectionMatch) {
      if (current) sections.push(current)
      current = {
        title: sectionMatch[1].trim(),
        date: currentDate,
        lines: [line]
      }
      continue
    }

    if (current) current.lines.push(line)
  }

  if (current) sections.push(current)
  return sections
}

function renderGroup(group, byTitle) {
  let output = [
    '---',
    `title: ${group.title}`,
    'date: 2026-05-18',
    `description: ${group.description}`,
    '---',
    '',
    `# ${group.title}`,
    '',
    group.description,
    '',
    '> 本文从旧博客笔记归档中按主题拆分整理，保留了原笔记内容和图片引用。',
    ''
  ].join('\n')

  for (const title of group.sections) {
    const section = byTitle.get(title)
    if (!section) {
      output += `## ${title}\n\n> 原归档中没有找到这一节。\n\n`
      continue
    }

    output += `> 来源日期：${section.date || '未标注'}\n\n`
    output += cleanupSection(section).trim()
    output += '\n\n'
  }

  return output
}

function cleanupSection(section) {
  let body = section.lines.join('\n').replace(/\n{3,}/g, '\n\n')

  if (section.title === '翻转列表（双指针/递归/栈）') {
    body = body.replace(/\n> 待办[\s\S]*?(?=\n---|\n# |\n## |$)/, '')
  }

  return body
}

function renderTodo() {
  return `---
title: 复习待办清单
date: 2026-05-18
description: 从旧博客笔记中整理出的后续复习方向。
---

# 复习待办清单

这页保留旧笔记中的待办项，便于后续继续拆成更具体的文章。

- 浏览器渲染
- 英文自我介绍，英文名词
- JS 手写题目，比如防抖、节流、继承
- 算法 JS 写法
- 前端性能优化
- 前端如何 debug
- Vue3 与 Vue2 的不同
- ES6 新增内容
- 如何改变 this
- JS 函数分类、调用方式
`
}
