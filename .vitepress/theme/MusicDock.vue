<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const defaultPlaylistId = '19723756'
const desktopPlayerHeight = 430
const dockStorageKey = 'vitepress-blog-music-dock-open'
const playlistStorageKey = 'vitepress-blog-music-playlist-id'
const compactViewportMedia = '(max-width: 640px), (hover: none) and (pointer: coarse)'

const isOpen = ref(false)
const hasOpened = ref(false)
const isCompactViewport = ref(false)
const activePlaylistId = ref(defaultPlaylistId)
const playlistInput = ref('')
const playlistMessage = ref('')
const playlistError = ref('')
let compactViewportQuery: MediaQueryList | undefined

const desktopPlayerSrc = computed(() => {
  const params = new URLSearchParams({
    type: '0',
    id: activePlaylistId.value,
    auto: '0',
    height: String(desktopPlayerHeight)
  })

  return `https://music.163.com/outchain/player?${params.toString()}`
})

const mobilePlaylistSrc = computed(() => {
  const params = new URLSearchParams({
    id: activePlaylistId.value
  })

  return `https://music.163.com/m/playlist?${params.toString()}`
})

const playerSrc = computed(() => {
  return isCompactViewport.value ? mobilePlaylistSrc.value : desktopPlayerSrc.value
})

const playlistUrl = computed(() => {
  return `https://music.163.com/playlist?id=${activePlaylistId.value}`
})

const playlistLabel = computed(() => {
  return activePlaylistId.value === defaultPlaylistId ? '默认歌单' : `歌单 ${activePlaylistId.value}`
})

onMounted(() => {
  compactViewportQuery = window.matchMedia(compactViewportMedia)
  isCompactViewport.value = compactViewportQuery.matches
  addCompactViewportListener(compactViewportQuery)

  const savedPlaylistId = window.localStorage.getItem(playlistStorageKey)
  const savedOpenState = window.localStorage.getItem(dockStorageKey)

  if (savedPlaylistId && /^\d+$/.test(savedPlaylistId)) {
    activePlaylistId.value = savedPlaylistId
  }

  if (savedOpenState === 'true') {
    isOpen.value = true
    hasOpened.value = true
  }
})

onUnmounted(() => {
  if (compactViewportQuery) {
    removeCompactViewportListener(compactViewportQuery)
  }
})

watch(isOpen, (open) => {
  if (open) {
    hasOpened.value = true
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(dockStorageKey, String(open))
  }
})

function toggleDock() {
  isOpen.value = !isOpen.value
}

function addCompactViewportListener(query: MediaQueryList) {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', syncCompactViewport)
  } else {
    query.addListener(syncCompactViewport)
  }
}

function removeCompactViewportListener(query: MediaQueryList) {
  if (typeof query.removeEventListener === 'function') {
    query.removeEventListener('change', syncCompactViewport)
  } else {
    query.removeListener(syncCompactViewport)
  }
}

function syncCompactViewport(event: MediaQueryListEvent | MediaQueryList) {
  isCompactViewport.value = event.matches
}

function extractPlaylistId(value: string) {
  const text = value.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')

  if (/^\d+$/.test(text)) {
    return text
  }

  return text.match(/[?&]id=(\d+)/)?.[1]
    ?? text.match(/\/outchain\/0\/(\d+)/)?.[1]
    ?? null
}

function applyPlaylist(playlistId: string) {
  activePlaylistId.value = playlistId
  hasOpened.value = true

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(playlistStorageKey, playlistId)
  }
}

function updatePlaylist() {
  const playlistId = extractPlaylistId(playlistInput.value)

  if (!playlistId) {
    playlistError.value = '没有识别到歌单 ID'
    playlistMessage.value = ''
    return
  }

  applyPlaylist(playlistId)
  playlistInput.value = ''
  playlistError.value = ''
  playlistMessage.value = `已切换到 ${playlistId}`
}

function resetPlaylist() {
  activePlaylistId.value = defaultPlaylistId
  hasOpened.value = true
  playlistInput.value = ''
  playlistError.value = ''
  playlistMessage.value = '已恢复默认歌单'

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(playlistStorageKey)
  }
}
</script>

<template>
  <aside class="music-dock" :class="{ 'is-open': isOpen, 'is-spinning': hasOpened }" aria-label="网易云音乐">
    <section id="music-dock-panel" class="music-dock__panel" :aria-hidden="String(!isOpen)">
      <div class="music-dock__header">
        <div class="music-dock__heading">
          <span class="music-dock__title">网易云音乐</span>
          <span class="music-dock__subtitle">歌单播放器</span>
        </div>
        <a class="music-dock__link" :href="playlistUrl" target="_blank" rel="noreferrer">
          打开
        </a>
      </div>

      <div class="music-dock__controls">
        <form class="music-dock__form" @submit.prevent="updatePlaylist">
          <input
            v-model="playlistInput"
            class="music-dock__input"
            type="text"
            inputmode="url"
            autocomplete="off"
            placeholder="粘贴歌单链接或 ID"
            aria-label="网易云歌单链接或 ID"
          >
          <button class="music-dock__action" type="submit">应用</button>
          <button class="music-dock__action music-dock__action--secondary" type="button" @click="resetPlaylist">
            默认
          </button>
        </form>
        <div class="music-dock__meta">
          <span>{{ playlistLabel }}</span>
          <span v-if="playlistError" class="music-dock__error">{{ playlistError }}</span>
          <span v-else-if="playlistMessage" class="music-dock__message">{{ playlistMessage }}</span>
        </div>
      </div>

      <div class="music-dock__body">
        <iframe v-if="hasOpened" :key="playerSrc" class="music-dock__iframe" :src="playerSrc" title="网易云音乐歌单播放器"
          allow="autoplay; encrypted-media" loading="eager" />
        <div v-else class="music-dock__placeholder">打开后加载歌单</div>
      </div>
    </section>

    <button class="music-dock__toggle" type="button" :aria-expanded="String(isOpen)" aria-controls="music-dock-panel"
      :title="isOpen ? '收起音乐播放器' : '打开音乐播放器'" @click="toggleDock">
      <span class="music-dock__record" aria-hidden="true">
        <span class="music-dock__record-surface">
          <span class="music-dock__record-label"></span>
          <span class="music-dock__record-hole"></span>
        </span>
        <span class="music-dock__record-gloss"></span>
      </span>
    </button>
  </aside>
</template>
