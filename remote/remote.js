;(function () {
  'use strict'

  // ── SVG Icon Data ──
  // Each entry: [elementType, attributes] tuples from Lucide icons
  var ICONS = {
    // Climate icons (20)
    Swords: [
      ['polyline', { points: '14.5 17.5 3 6 3 3 6 3 17.5 14.5' }],
      ['line', { x1: '13', x2: '19', y1: '19', y2: '13' }],
      ['line', { x1: '16', x2: '20', y1: '16', y2: '20' }],
      ['line', { x1: '19', x2: '21', y1: '21', y2: '19' }],
      ['polyline', { points: '14.5 6.5 18 3 21 3 21 6 17.5 9.5' }],
      ['line', { x1: '5', x2: '9', y1: '14', y2: '18' }],
      ['line', { x1: '7', x2: '4', y1: '17', y2: '20' }],
      ['line', { x1: '3', x2: '5', y1: '19', y2: '21' }],
    ],
    Shield: [
      [
        'path',
        {
          d: 'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z',
        },
      ],
    ],
    Skull: [
      ['path', { d: 'm12.5 17-.5-1-.5 1h1z' }],
      [
        'path',
        {
          d: 'M15 22a1 1 0 0 0 1-1v-1a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20v1a1 1 0 0 0 1 1z',
        },
      ],
      ['circle', { cx: '15', cy: '12', r: '1' }],
      ['circle', { cx: '9', cy: '12', r: '1' }],
    ],
    TreePine: [
      [
        'path',
        {
          d: 'm17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z',
        },
      ],
      ['path', { d: 'M12 22v-3' }],
    ],
    Mountain: [['path', { d: 'm8 3 4 8 5-5 5 15H2L8 3z' }]],
    Castle: [
      ['path', { d: 'M10 5V3' }],
      ['path', { d: 'M14 5V3' }],
      ['path', { d: 'M15 21v-3a3 3 0 0 0-6 0v3' }],
      ['path', { d: 'M18 3v8' }],
      ['path', { d: 'M18 5H6' }],
      ['path', { d: 'M22 11H2' }],
      ['path', { d: 'M22 9v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9' }],
      ['path', { d: 'M6 3v8' }],
    ],
    Flame: [
      [
        'path',
        {
          d: 'M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4',
        },
      ],
    ],
    Waves: [
      [
        'path',
        {
          d: 'M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
        },
      ],
      [
        'path',
        {
          d: 'M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
        },
      ],
      [
        'path',
        {
          d: 'M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1',
        },
      ],
    ],
    Moon: [
      [
        'path',
        {
          d: 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401',
        },
      ],
    ],
    Sun: [
      ['circle', { cx: '12', cy: '12', r: '4' }],
      ['path', { d: 'M12 2v2' }],
      ['path', { d: 'M12 20v2' }],
      ['path', { d: 'm4.93 4.93 1.41 1.41' }],
      ['path', { d: 'm17.66 17.66 1.41 1.41' }],
      ['path', { d: 'M2 12h2' }],
      ['path', { d: 'M20 12h2' }],
      ['path', { d: 'm6.34 17.66-1.41 1.41' }],
      ['path', { d: 'm19.07 4.93-1.41 1.41' }],
    ],
    Beer: [
      ['path', { d: 'M17 11h1a3 3 0 0 1 0 6h-1' }],
      ['path', { d: 'M9 12v6' }],
      ['path', { d: 'M13 12v6' }],
      [
        'path',
        {
          d: 'M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z',
        },
      ],
      ['path', { d: 'M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8' }],
    ],
    BookOpen: [
      ['path', { d: 'M12 7v14' }],
      [
        'path',
        {
          d: 'M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
        },
      ],
    ],
    Eye: [
      [
        'path',
        {
          d: 'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
        },
      ],
      ['circle', { cx: '12', cy: '12', r: '3' }],
    ],
    Ghost: [
      ['path', { d: 'M9 10h.01' }],
      ['path', { d: 'M15 10h.01' }],
      [
        'path',
        {
          d: 'M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z',
        },
      ],
    ],
    Crown: [
      [
        'path',
        {
          d: 'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z',
        },
      ],
      ['path', { d: 'M5 21h14' }],
    ],
    CloudLightning: [
      ['path', { d: 'M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973' }],
      ['path', { d: 'm13 12-3 5h4l-3 5' }],
    ],
    Heart: [
      [
        'path',
        {
          d: 'M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5',
        },
      ],
    ],
    Tent: [
      ['path', { d: 'M3.5 21 14 3' }],
      ['path', { d: 'M20.5 21 10 3' }],
      ['path', { d: 'M15.5 21 12 15l-3.5 6' }],
      ['path', { d: 'M2 21h20' }],
    ],
    DoorOpen: [
      ['path', { d: 'M11 20H2' }],
      [
        'path',
        {
          d: 'M11 4.562v16.157a1 1 0 0 0 1.242.97L19 20V5.562a2 2 0 0 0-1.515-1.94l-4-1A2 2 0 0 0 11 4.561z',
        },
      ],
      ['path', { d: 'M11 4H8a2 2 0 0 0-2 2v14' }],
      ['path', { d: 'M14 12h.01' }],
      ['path', { d: 'M22 20h-3' }],
    ],
    Sparkles: [
      [
        'path',
        {
          d: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z',
        },
      ],
      ['path', { d: 'M20 2v4' }],
      ['path', { d: 'M22 4h-4' }],
      ['circle', { cx: '4', cy: '20', r: '2' }],
    ],

    // UI icons (6)
    SkipForward: [
      ['path', { d: 'M21 4v16' }],
      [
        'path',
        {
          d: 'M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z',
        },
      ],
    ],
    Play: [
      [
        'path',
        {
          d: 'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z',
        },
      ],
    ],
    Pause: [
      ['rect', { x: '14', y: '3', width: '5', height: '18', rx: '1' }],
      ['rect', { x: '5', y: '3', width: '5', height: '18', rx: '1' }],
    ],
    Volume2: [
      [
        'path',
        {
          d: 'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z',
        },
      ],
      ['path', { d: 'M16 9a5 5 0 0 1 0 6' }],
      ['path', { d: 'M19.364 18.364a9 9 0 0 0 0-12.728' }],
    ],
    VolumeX: [
      [
        'path',
        {
          d: 'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z',
        },
      ],
      ['line', { x1: '22', x2: '16', y1: '9', y2: '15' }],
      ['line', { x1: '16', x2: '22', y1: '9', y2: '15' }],
    ],
    WifiOff: [
      ['path', { d: 'M12 20h.01' }],
      ['path', { d: 'M8.5 16.429a5 5 0 0 1 7 0' }],
      ['path', { d: 'M5 12.859a10 10 0 0 1 5.17-2.69' }],
      ['path', { d: 'M19 12.859a10 10 0 0 0-2.007-1.523' }],
      ['path', { d: 'M2 8.82a15 15 0 0 1 4.177-2.643' }],
      ['path', { d: 'M22 8.82a15 15 0 0 0-11.288-3.764' }],
      ['path', { d: 'm2 2 20 20' }],
    ],
  }

  // ── Icon Renderer ──
  function icon(name, size) {
    var s = size || 24
    var nodes = ICONS[name]
    if (!nodes) return ''
    var inner = ''
    for (var i = 0; i < nodes.length; i++) {
      var tag = nodes[i][0]
      var attrs = nodes[i][1]
      var attrStr = ''
      for (var key in attrs) {
        if (Object.prototype.hasOwnProperty.call(attrs, key)) {
          attrStr += ' ' + key + '="' + attrs[key] + '"'
        }
      }
      if (tag === 'circle' || tag === 'line') {
        inner += '<' + tag + attrStr + '/>'
      } else {
        inner += '<' + tag + attrStr + '></' + tag + '>'
      }
    }
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      s +
      '" height="' +
      s +
      '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      inner +
      '</svg>'
    )
  }

  // ── State ──
  var state = {
    campaigns: [],
    activeCampaignId: null,
    playback: {
      activeCampaignId: null,
      activeClimateId: null,
      activeTrackId: null,
      isPlaying: false,
      volume: 80,
      isFadingToSilence: false,
      fadeAnimations: [],
    },
    connected: false,
  }

  // ── DOM Cache ──
  var dom = {}

  function cacheDom() {
    dom.campaignName = document.getElementById('campaign-name')
    dom.connectionDot = document.getElementById('connection-dot')
    dom.climateGrid = document.getElementById('climate-grid')
    dom.trackTitle = document.getElementById('track-title')
    dom.nowPlayingDot = document.getElementById('now-playing-dot')
    dom.btnSkip = document.getElementById('btn-skip')
    dom.btnPlayPause = document.getElementById('btn-play-pause')
    dom.btnMute = document.getElementById('btn-mute')
    dom.volumeSlider = document.getElementById('volume-slider')
    dom.disconnectedOverlay = document.getElementById('disconnected-overlay')
    dom.wifiOffIcon = document.getElementById('wifi-off-icon')
  }

  // ── WebSocket ──
  var ws = null
  var reconnectDelay = 1000
  var maxReconnectDelay = 30000
  var reconnectTimer = null

  function connect() {
    var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    var url = protocol + '//' + location.host

    try {
      ws = new WebSocket(url)
    } catch (e) {
      scheduleReconnect()
      return
    }

    ws.onopen = function () {
      state.connected = true
      reconnectDelay = 1000
      renderConnectionStatus()
    }

    ws.onmessage = function (event) {
      try {
        var msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch (e) {
        // Ignore malformed messages
      }
    }

    ws.onclose = function () {
      state.connected = false
      renderConnectionStatus()
      scheduleReconnect()
    }

    ws.onerror = function () {
      // onclose will fire after this
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null
      connect()
    }, reconnectDelay)
    reconnectDelay = Math.min(reconnectDelay * 2, maxReconnectDelay)
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  // ── Message Handlers ──
  function handleMessage(msg) {
    switch (msg.type) {
      case 'full-state':
        state.campaigns = msg.payload.campaigns || []
        state.activeCampaignId = msg.payload.activeCampaignId
        state.playback = msg.payload.playback || state.playback
        if (!state.playback.fadeAnimations) {
          state.playback.fadeAnimations = []
        }
        renderAll()
        break

      case 'playback-update':
        var prevTrackId = state.playback.activeTrackId
        var prevClimateId = state.playback.activeClimateId
        state.playback = msg.payload
        if (!state.playback.fadeAnimations) {
          state.playback.fadeAnimations = []
        }
        if (msg.payload.activeClimateId !== prevClimateId) {
          updateActiveClimateCard()
        }
        if (msg.payload.activeTrackId !== prevTrackId) {
          animateTrackChange()
        } else {
          renderPlaybackState()
        }
        updateFadeAnimations()
        break

      case 'campaigns-update':
        state.campaigns = msg.payload.campaigns || []
        renderCampaignName()
        renderClimateGrid()
        renderPlaybackState()
        break
    }
  }

  // ── Render Functions ──
  function renderAll() {
    renderConnectionStatus()
    renderCampaignName()
    renderClimateGrid()
    renderPlaybackState()
    updateFadeAnimations()
  }

  function renderConnectionStatus() {
    if (state.connected) {
      dom.connectionDot.classList.add('connected')
      dom.disconnectedOverlay.classList.remove('visible')
    } else {
      dom.connectionDot.classList.remove('connected')
      dom.disconnectedOverlay.classList.add('visible')
    }
  }

  function renderCampaignName() {
    var campaign = getActiveCampaign()
    dom.campaignName.textContent = campaign ? campaign.name : 'No campaign selected'
  }

  function getActiveCampaign() {
    if (!state.activeCampaignId) return null
    for (var i = 0; i < state.campaigns.length; i++) {
      if (state.campaigns[i].id === state.activeCampaignId) {
        return state.campaigns[i]
      }
    }
    return null
  }

  function getActiveClimate() {
    var campaign = getActiveCampaign()
    if (!campaign || !state.playback.activeClimateId) return null
    for (var i = 0; i < campaign.climates.length; i++) {
      if (campaign.climates[i].id === state.playback.activeClimateId) {
        return campaign.climates[i]
      }
    }
    return null
  }

  function getActiveTrack() {
    var climate = getActiveClimate()
    if (!climate || !state.playback.activeTrackId) return null
    for (var i = 0; i < climate.tracks.length; i++) {
      if (climate.tracks[i].id === state.playback.activeTrackId) {
        return climate.tracks[i]
      }
    }
    return null
  }

  function renderClimateGrid() {
    var campaign = getActiveCampaign()
    if (!campaign || campaign.climates.length === 0) {
      dom.climateGrid.innerHTML =
        '<div class="climate-grid__empty">' +
        (campaign ? 'No climates yet' : 'No campaign selected') +
        '</div>'
      return
    }

    var climates = campaign.climates.slice().sort(function (a, b) {
      return a.order - b.order
    })

    var html = ''
    for (var i = 0; i < climates.length; i++) {
      var cl = climates[i]
      var isActive = cl.id === state.playback.activeClimateId
      var cardClass = 'climate-card' + (isActive ? ' active' : '')
      var bgColor = hexToRgba(cl.color, 0.18)
      var borderColor = isActive ? cl.color : 'transparent'

      html +=
        '<button class="' +
        cardClass +
        '" data-climate-id="' +
        cl.id +
        '" style="background:' +
        bgColor +
        ';--card-color:' +
        cl.color +
        ';border-color:' +
        borderColor +
        '">' +
        '<span class="climate-card__icon">' +
        icon(cl.icon, 28) +
        '</span>' +
        '<span class="climate-card__name">' +
        escapeHtml(cl.name) +
        '</span>' +
        '</button>'
    }
    dom.climateGrid.innerHTML = html
  }

  function renderPlaybackState() {
    var pb = state.playback
    var hasClimate = !!pb.activeClimateId

    // Play/pause button
    dom.btnPlayPause.innerHTML = pb.isPlaying ? icon('Pause', 22) : icon('Play', 22)
    dom.btnPlayPause.disabled = !hasClimate
    dom.btnPlayPause.setAttribute('aria-label', pb.isPlaying ? 'Pause' : 'Play')

    // Skip button
    dom.btnSkip.innerHTML = icon('SkipForward', 20)
    dom.btnSkip.disabled = !hasClimate

    // Volume
    dom.btnMute.innerHTML = pb.volume === 0 ? icon('VolumeX', 20) : icon('Volume2', 20)
    if (!volumeDragging) {
      dom.volumeSlider.value = pb.volume
    }

    // Track title
    var track = getActiveTrack()
    dom.trackTitle.textContent = track ? track.title : 'No track playing'

    // Now playing dot color
    var climate = getActiveClimate()
    dom.nowPlayingDot.style.background = climate ? climate.color : ''
  }

  function updateActiveClimateCard() {
    var cards = dom.climateGrid.querySelectorAll('.climate-card')
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i]
      var id = card.getAttribute('data-climate-id')
      var isActive = id === state.playback.activeClimateId

      if (isActive) {
        card.classList.add('active')
        var color = card.style.getPropertyValue('--card-color')
        card.style.borderColor = color
      } else {
        card.classList.remove('active')
        card.style.borderColor = 'transparent'
      }
    }

    // Also update playback UI (track, buttons, dot)
    renderPlaybackState()
  }

  function updateFadeAnimations() {
    var animations = state.playback.fadeAnimations || []
    var cards = dom.climateGrid.querySelectorAll('.climate-card')

    for (var i = 0; i < cards.length; i++) {
      var card = cards[i]
      var climateId = card.getAttribute('data-climate-id')
      var fa = null
      for (var j = 0; j < animations.length; j++) {
        if (animations[j].climateId === climateId) {
          fa = animations[j]
          break
        }
      }

      var existing = card.querySelector('.climate-card__fade-bar')

      if (fa) {
        // Check if we need a fresh bar (new animation or different startedAt)
        if (existing && existing.getAttribute('data-started-at') === String(fa.startedAt)) {
          continue // Same animation, already rendering
        }
        // Remove old bar if any
        if (existing) {
          existing.parentNode.removeChild(existing)
        }
        // Create new bar
        var bar = document.createElement('span')
        bar.className = 'climate-card__fade-bar'
        bar.setAttribute('data-started-at', String(fa.startedAt))
        var animName = fa.direction === 'in' ? 'bar-fill' : 'bar-drain'
        var color = card.style.getPropertyValue('--card-color')
        bar.style.cssText =
          'background:' +
          color +
          'CC;box-shadow:0 0 6px ' +
          color +
          '80;animation:' +
          animName +
          ' ' +
          fa.durationMs +
          'ms linear forwards'
        card.appendChild(bar)
      } else if (existing) {
        existing.parentNode.removeChild(existing)
      }
    }
  }

  function animateTrackChange() {
    dom.trackTitle.classList.add('fade-out')
    setTimeout(function () {
      renderPlaybackState()
      dom.trackTitle.classList.remove('fade-out')
      dom.trackTitle.classList.add('fade-in')
      setTimeout(function () {
        dom.trackTitle.classList.remove('fade-in')
      }, 300)
    }, 200)
  }

  // ── Helpers ──
  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16)
    var g = parseInt(hex.slice(3, 5), 16)
    var b = parseInt(hex.slice(5, 7), 16)
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')'
  }

  function escapeHtml(str) {
    var div = document.createElement('div')
    div.appendChild(document.createTextNode(str))
    return div.innerHTML
  }

  // ── Volume Slider Interaction Guard ──
  var volumeDragging = false
  var volumeThrottleTimer = null
  var prevVolumeBeforeMute = 80

  // ── Event Handlers ──
  function bindEvents() {
    // Climate grid — event delegation
    dom.climateGrid.addEventListener('click', function (e) {
      var card = e.target.closest('.climate-card')
      if (!card) return
      var climateId = card.getAttribute('data-climate-id')
      if (!climateId) return

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(40)
      }

      send({ type: 'activate-climate', payload: { climateId: climateId } })
    })

    // Play/pause
    dom.btnPlayPause.addEventListener('click', function () {
      send({ type: 'play-pause' })
    })

    // Skip
    dom.btnSkip.addEventListener('click', function () {
      send({ type: 'skip-track' })
    })

    // Volume slider — instant visual, throttled send
    dom.volumeSlider.addEventListener('input', function () {
      var vol = parseInt(dom.volumeSlider.value, 10)
      state.playback.volume = vol
      dom.btnMute.innerHTML = vol === 0 ? icon('VolumeX', 20) : icon('Volume2', 20)

      if (!volumeThrottleTimer) {
        volumeThrottleTimer = setTimeout(function () {
          volumeThrottleTimer = null
          send({ type: 'set-volume', payload: { volume: parseInt(dom.volumeSlider.value, 10) } })
        }, 100)
      }
    })

    // Volume slider — ensure final value sent
    dom.volumeSlider.addEventListener('change', function () {
      var vol = parseInt(dom.volumeSlider.value, 10)
      send({ type: 'set-volume', payload: { volume: vol } })
    })

    // Volume slider — drag guard
    dom.volumeSlider.addEventListener('pointerdown', function () {
      volumeDragging = true
    })

    dom.volumeSlider.addEventListener('pointerup', function () {
      volumeDragging = false
    })

    dom.volumeSlider.addEventListener('pointercancel', function () {
      volumeDragging = false
    })

    // Mute toggle
    dom.btnMute.addEventListener('click', function () {
      if (state.playback.volume > 0) {
        prevVolumeBeforeMute = state.playback.volume
        dom.volumeSlider.value = 0
        state.playback.volume = 0
        send({ type: 'set-volume', payload: { volume: 0 } })
      } else {
        var restore = prevVolumeBeforeMute || 80
        dom.volumeSlider.value = restore
        state.playback.volume = restore
        send({ type: 'set-volume', payload: { volume: restore } })
      }
      dom.btnMute.innerHTML =
        state.playback.volume === 0 ? icon('VolumeX', 20) : icon('Volume2', 20)
    })
  }

  // ── Init ──
  document.addEventListener('DOMContentLoaded', function () {
    cacheDom()

    // Set initial icons
    dom.btnPlayPause.innerHTML = icon('Play', 22)
    dom.btnSkip.innerHTML = icon('SkipForward', 20)
    dom.btnMute.innerHTML = icon('Volume2', 20)
    dom.wifiOffIcon.innerHTML = icon('WifiOff', 48)

    bindEvents()
    renderAll()
    connect()
  })
})()
