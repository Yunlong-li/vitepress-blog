<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useData } from 'vitepress'

const props = defineProps<{
  code: string
}>()

const { isDark } = useData()
const html = ref('')
const error = ref('')

const decodedCode = computed(() => decodeURIComponent(props.code))

async function renderDiagram() {
  if (typeof window === 'undefined') return

  error.value = ''

  try {
    const mermaid = (await import('mermaid')).default
    const id = `mermaid-${Math.random().toString(36).slice(2)}`

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: isDark.value ? 'dark' : 'default',
      flowchart: {
        htmlLabels: true
      }
    })

    await nextTick()

    const result = await mermaid.render(id, decodedCode.value)
    html.value = result.svg
  } catch (err) {
    html.value = ''
    error.value = err instanceof Error ? err.message : String(err)
  }
}

onMounted(renderDiagram)

watch(
  () => [props.code, isDark.value],
  () => {
    renderDiagram()
  }
)
</script>

<template>
  <div class="mermaid-diagram">
    <div v-if="html" class="mermaid-diagram__svg" v-html="html" />
    <div v-else class="mermaid-diagram__error">
      <p v-if="error">Mermaid 图表渲染失败：{{ error }}</p>
      <slot />
    </div>
  </div>
</template>
