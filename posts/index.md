# 文章

旧博客笔记已经按主题拆分成下面这些复习文章。原始归档仍然保留在最后，方便需要时回看完整上下文。

<div class="post-list">
  <a href="./docker-compose-practical-guide">
    <h2>Docker 使用教程：从镜像、容器到 Docker Compose 和生产部署</h2>
    <p>系统讲解镜像、容器、Dockerfile、数据卷、网络、Compose、多阶段构建、仓库、安全和生产部署。</p>
  </a>

  <a href="./object-storage-practical-guide">
    <h2>对象存储使用教程：从 S3、MinIO 到 R2、OSS、COS 和 Ceph RGW</h2>
    <p>讲清 Bucket、Object、Key、S3 API、预签名 URL、分片上传、权限、生命周期、CDN 和热门方案选型。</p>
  </a>

  <a href="./nginx-practical-guide">
    <h2>Nginx 使用教程：从静态服务到反向代理、负载均衡和 HTTPS</h2>
    <p>从来源和配置模型讲起，覆盖静态资源、反向代理、负载均衡、缓存、压缩、HTTPS、日志和排查。</p>
  </a>

  <a href="./message-queue-middleware-guide">
    <h2>消息队列中间件使用教程：RabbitMQ、Kafka、RocketMQ、Redis Streams 和 NATS</h2>
    <p>讲清消息队列解决的问题，并用代码串起生产者、消费者、确认、重试、死信、幂等和 Outbox。</p>
  </a>

  <a href="./idempotency-guide">
    <h2>幂等性讲解：从 HTTP 接口到订单、支付和消息队列</h2>
    <p>系统讲解重复请求来源、幂等键、唯一约束、状态机、支付回调和消息消费幂等。</p>
  </a>

  <a href="./redis-practical-guide">
    <h2>Redis 使用教程：从缓存到数据结构、分布式锁、排行榜和 Streams</h2>
    <p>覆盖常用数据结构、缓存模式、分布式锁、限流、发布订阅、Streams、持久化和内存淘汰。</p>
  </a>

  <a href="./supabase-practical-guide">
    <h2>Supabase 使用教程：从数据库、登录鉴权到存储、实时订阅和 Edge Functions</h2>
    <p>围绕 Postgres、Auth、RLS、Storage、Realtime 和 Edge Functions 构建完整后端能力。</p>
  </a>

  <a href="./prisma-practical-guide">
    <h2>Prisma 使用教程：从 Schema、迁移到类型安全查询和事务</h2>
    <p>围绕 schema.prisma、Prisma Client、Migrate、关系查询、分页、事务、raw SQL 和生产实践讲清 ORM 落地方式。</p>
  </a>

  <a href="./postgresql-practical-guide">
    <h2>PostgreSQL 使用教程：从 SQL 基础到索引、事务、JSONB 和性能分析</h2>
    <p>系统讲解表设计、SQL、约束、索引、执行计划、事务、锁、JSONB、全文搜索和 Node.js 访问。</p>
  </a>

  <a href="./elasticsearch-practical-guide">
    <h2>Elasticsearch 使用教程：从倒排索引到全文搜索、聚合分析和性能优化</h2>
    <p>系统讲解倒排索引、mapping、搜索 DSL、相关性、分页、高亮、聚合、数据同步、集群和 Node.js 接入。</p>
  </a>

  <a href="./micro-frontend-guide">
    <h2>微前端实战与面试复习</h2>
    <p>从架构拆分、运行时集成、通信、样式隔离、部署和面试表达系统梳理微前端。</p>
  </a>

  <a href="./frontend-troubleshooting-white-screen-jank">
    <h2>前端故障排查：白屏与页面卡顿</h2>
    <p>以用户页面白屏和卡顿为例，整理监控、定位、修复和复盘方法。</p>
  </a>

  <a href="./frontend-performance-optimization">
    <h2>前端性能优化系统梳理</h2>
    <p>覆盖加载、渲染、运行时、缓存、图片、构建和监控闭环。</p>
  </a>

  <a href="./frontend-tracking-guide">
    <h2>前端埋点实战与面试复习</h2>
    <p>系统梳理 PV、点击、曝光、停留、性能、错误、上报 SDK 和数据质量治理。</p>
  </a>

  <a href="./mobile-adaptation-guide">
    <h2>移动端适配实战与面试复习</h2>
    <p>覆盖 viewport、rem、vw、响应式布局、安全区、高清屏和移动端调试。</p>
  </a>

  <a href="./frontend-engineering-guide">
    <h2>前端工程化讲解：从开发体验到构建、规范和交付</h2>
    <p>围绕项目结构、依赖管理、构建工具、代码规范、测试、CI/CD、性能优化和监控讲清工程化闭环。</p>
  </a>

  <a href="./babel-guide">
    <h2>Babel 讲解：从语法转换到插件机制和 Polyfill</h2>
    <p>讲清 Babel 的 AST 流程、preset、plugin、浏览器兼容、polyfill、TypeScript 和 JSX 转换。</p>
  </a>

  <a href="./eslint-guide">
    <h2>ESLint 讲解：从代码规范到静态检查和团队协作</h2>
    <p>系统梳理 parser、plugin、rule、config、Prettier 配合、TypeScript、React、Vue 和 CI 集成。</p>
  </a>

  <a href="./webpack-guide">
    <h2>Webpack 讲解：从模块打包到 Loader、Plugin 和性能优化</h2>
    <p>从依赖图讲起，覆盖 entry、output、loader、plugin、dev server、HMR、代码分割和 tree shaking。</p>
  </a>

  <a href="./vite-guide">
    <h2>Vite 讲解：从原生 ESM 到极速开发和生产构建</h2>
    <p>讲清 Vite 开发服务器、原生 ESM、依赖预构建、HMR、Rollup 生产构建和与 Webpack 的区别。</p>
  </a>

  <a href="./tailwind-css-practical-guide">
    <h2>Tailwind CSS 使用教程：从原子化样式到响应式、主题和组件封装</h2>
    <p>讲清 utility-first 思路、安装接入、工具类、状态变体、响应式、暗色模式、主题变量、组件封装和团队规范。</p>
  </a>

  <a href="./typescript-learning-roadmap">
    <h2>TypeScript 实战教程：从类型基础到业务建模</h2>
    <p>通过商品和订单业务场景，讲清联合类型、类型守卫、泛型请求 SDK、表单和组件类型。</p>
  </a>

  <a href="./nodejs-learning-roadmap">
    <h2>Node.js 实战教程：从 JS 基础到可上线 API</h2>
    <p>通过 Todo API 项目讲清运行时、HTTP、路由、中间件、错误处理、鉴权和部署思路。</p>
  </a>

  <a href="./single-sign-on-guide">
    <h2>单点登录 SSO 讲解：背景、原理与代码实现</h2>
    <p>结合 Cookie、Session、OAuth2、OIDC、CAS、SAML、JWT、流程图和代码示例讲清 SSO 落地方案。</p>
  </a>

  <a href="./restful-api-guide">
    <h2>RESTful API 讲解：从资源建模到接口落地</h2>
    <p>围绕资源、HTTP 方法、状态码、分页、错误响应、幂等性、认证和 OpenAPI 讲清接口设计。</p>
  </a>

  <a href="./fastapi-practical-guide">
    <h2>FastAPI 使用教程：从接口到工程化</h2>
    <p>结合路由、Pydantic、依赖注入、异常处理、数据库访问、认证和测试讲清 FastAPI 落地方式。</p>
  </a>

  <a href="./django-practical-guide">
    <h2>Django 使用教程：从 MVT 到可维护后端应用</h2>
    <p>讲解项目结构、MVT、路由、模型、ORM、Admin、表单、认证、DRF 和部署要点。</p>
  </a>

  <a href="./postgresql-backend-guide">
    <h2>PostgreSQL 后端开发教程：表设计、SQL、索引与事务</h2>
    <p>从表设计、约束、查询、索引、执行计划、事务、锁、JSONB、全文搜索和 Python 访问讲起。</p>
  </a>

  <a href="./sqlalchemy-practical-guide">
    <h2>SQLAlchemy 使用教程：Core、ORM、事务与异步</h2>
    <p>系统讲解 Engine、Session、声明式模型、关系映射、查询、事务、Alembic 迁移和异步用法。</p>
  </a>

  <a href="./python-logging-guide">
    <h2>Python logging 库讲解：从日志级别到工程化配置</h2>
    <p>讲清日志级别、Logger、Handler、Formatter、Filter、dictConfig、日志轮转、异常日志和请求 ID。</p>
  </a>

  <a href="./python-argparse-guide">
    <h2>Python argparse 库讲解：从命令行参数到子命令和工程化 CLI</h2>
    <p>系统讲解位置参数、可选参数、类型转换、默认值、布尔开关、列表参数、互斥参数、子命令和测试方式。</p>
  </a>

  <a href="./uvicorn-practical-guide">
    <h2>Uvicorn 使用教程：ASGI 服务、启动参数与部署</h2>
    <p>从 ASGI 协议、FastAPI 启动、常用参数、生命周期、日志、反向代理、Docker 和部署讲起。</p>
  </a>

  <a href="./python-decorators-guide">
    <h2>Python 装饰器讲解：从闭包到工程化实践</h2>
    <p>结合闭包、wraps、带参数装饰器、类装饰器、方法装饰器、异步装饰器和工程场景讲透装饰器。</p>
  </a>

  <a href="./python-common-modules-guide">
    <h2>Python 常用模块讲解：asyncio、time、uuid、collections、httpx、datetime、typing、dataclasses、os、functools</h2>
    <p>系统讲解异步并发、时间处理、唯一 ID、容器工具、HTTP 调用、类型提示、数据类、系统交互和函数工具。</p>
  </a>

  <a href="./js-async-event-loop">
    <h2>JavaScript 异步与事件循环</h2>
    <p>JS 异步、事件循环、队列和计时器相关内容。</p>
  </a>

  <a href="./js-number-string">
    <h2>JavaScript 数值与字符串</h2>
    <p>浮点数精度处理、substring 与 slice 的区别。</p>
  </a>

  <a href="./js-this-closure-functional">
    <h2>JavaScript this、闭包与函数技巧</h2>
    <p>this 指向、闭包、节流防抖、函数柯里化等高频主题。</p>
  </a>

  <a href="./js-collections-arrays-iteration">
    <h2>JavaScript 集合、数组与遍历</h2>
    <p>Map、Set、Object、数组方法和循环遍历。</p>
  </a>

  <a href="./lodash-practical-guide">
    <h2>Lodash 使用教程：从集合处理到防抖节流、对象操作和函数工具</h2>
    <p>围绕集合分组统计、排序去重、对象路径、深拷贝、深合并、防抖节流、按需引入和现代 JS 替代方案讲清 Lodash。</p>
  </a>

  <a href="./vue3-review">
    <h2>Vue 3 面试复习</h2>
    <p>Vue3 与 Vue2 对比、组合式 API、Hook、TypeScript 支持和生命周期。</p>
  </a>

  <a href="./vue3-vs-vue2-deep-dive">
    <h2>Vue 3 相比 Vue 2 的变化与设计思路</h2>
    <p>从设计来源、解决的问题和代码用法出发，讲清应用创建、响应式、组合式 API、TypeScript 和迁移要点。</p>
  </a>

  <a href="./vue-diff-algorithm">
    <h2>Vue Diff 算法讲解：从虚拟节点到最少 DOM 操作</h2>
    <p>通过同层比较、key、双端比较和最长递增子序列，讲清 Vue 更新列表的核心策略。</p>
  </a>

  <a href="./virtual-dom-deep-dive">
    <h2>虚拟 DOM 讲解：它解决了什么问题</h2>
    <p>从 VNode、render、patch、响应式更新和编译优化出发，理解虚拟 DOM 的真实价值。</p>
  </a>

  <a href="./vue-state-management">
    <h2>Vue 2 和 Vue 3 常用全局状态管理工具讲解</h2>
    <p>结合 Vuex、Pinia、provide/inject 和响应式单例，梳理全局状态的边界与代码组织。</p>
  </a>

  <a href="./vue-component-communication">
    <h2>Vue 2 和 Vue 3 组件通信方式讲解</h2>
    <p>围绕 props、emit、v-model、refs、provide/inject、状态管理和插槽讲清组件间数据流。</p>
  </a>

  <a href="./react-practical-guide">
    <h2>React 使用教程：从组件、Hooks 到状态管理和性能优化</h2>
    <p>系统讲解 JSX、props、state、Hooks、useEffect、表单、Context、状态管理、性能优化和错误边界。</p>
  </a>

  <a href="./nextjs-practical-guide">
    <h2>Next.js 使用教程：从 App Router 到服务端组件、数据获取和部署</h2>
    <p>围绕 App Router、布局、服务端组件、客户端组件、数据获取、缓存、Server Actions、Route Handlers 和部署讲清 Next.js。</p>
  </a>

  <a href="./nextjs-app-router-advanced-guide">
    <h2>Next.js 进阶教程：App Router、缓存、Server Actions 与生产实践</h2>
    <p>聚焦服务端/客户端边界、缓存和重新验证、Server Actions、Route Handlers、认证、安全和生产部署。</p>
  </a>

  <a href="./react-vue-comparison">
    <h2>React 与 Vue 区别讲解：从设计思想到响应式、组件和工程生态</h2>
    <p>从 JSX 与模板、响应式机制、状态更新、组件通信、Hooks 与 Composition API、性能和生态系统对比两者差异。</p>
  </a>

  <a href="./browser-render-performance">
    <h2>浏览器渲染与前端性能</h2>
    <p>渲染流程、回流重绘、transform 性能和首屏加载优化。</p>
  </a>

  <a href="./frontend-routing-seo-compat">
    <h2>前端兼容、路由与 SEO</h2>
    <p>兼容性处理、前端路由、SEO、预渲染和相关工程实践。</p>
  </a>

  <a href="./css-half-pixel-border">
    <h2>CSS 0.5px 边框实现</h2>
    <p>高清屏下 0.5px 边框的多种实现方案。</p>
  </a>

  <a href="./algorithm-coding">
    <h2>算法与手写题复习</h2>
    <p>链表、缓存高阶函数、超时请求、等价多米诺骨牌等 coding 题。</p>
  </a>

  <a href="./review-todo">
    <h2>复习待办清单</h2>
    <p>从旧笔记中整理出的后续复习方向。</p>
  </a>

  <a href="./notebook">
    <h2>旧博客笔记归档（原始）</h2>
    <p>完整保留旧 notebook 内容，作为备份和溯源入口。</p>
  </a>

  <a href="./hello-vitepress">
    <h2>开始写博客</h2>
    <p>初始化 VitePress 博客后的第一篇示例文章。</p>
  </a>
</div>
