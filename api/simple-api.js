#!/usr/bin/env node

// Simple API server for AI Model Tracker Admin
// Minimal, clean implementation focused on API-only approach

import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 8100

// Simple auth - just check for a header token
const ADMIN_TOKEN = 'admin123' // Change in production

// Middleware
app.use(express.json())
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`)
  next()
})

// Registry file handling
const REGISTRY_FILE = path.join(__dirname, 'torrent-registry.json')

function loadRegistry() {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) {
      return { torrents: [] }
    }
    const data = fs.readFileSync(REGISTRY_FILE, 'utf8')
    return JSON.parse(data)
  } catch (err) {
    console.error('❌ Error loading registry:', err.message)
    return { torrents: [] }
  }
}

function saveRegistry(registry) {
  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2))
    console.log('✅ Registry saved')
  } catch (err) {
    console.error('❌ Error saving registry:', err.message)
    throw err
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token !== ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Invalid admin token' })
  }
  next()
}

// Generate magnet link
function generateMagnetLink(torrent) {
  const trackerUrl = encodeURIComponent('http://localhost:9887/announce')
  const displayName = encodeURIComponent(torrent.name)
  return `magnet:?xt=urn:btih:${torrent.infoHash}&dn=${displayName}&tr=${trackerUrl}`
}

// Public API endpoints
app.get('/api/torrents', (req, res) => {
  const registry = loadRegistry()
  const approved = registry.torrents.filter(t => t.approved)
  res.json(approved)
})

app.get('/api/search', (req, res) => {
  const query = req.query.q?.toLowerCase() || ''
  const registry = loadRegistry()
  const matches = registry.torrents.filter(t => 
    t.approved && 
    (t.name.toLowerCase().includes(query) || 
     t.description.toLowerCase().includes(query) ||
     t.tags?.some(tag => tag.toLowerCase().includes(query)))
  )
  res.json(matches)
})

app.get('/api/torrent/:id', (req, res) => {
  const registry = loadRegistry()
  const torrent = registry.torrents.find(t => t.approved && t.id === req.params.id)
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' })
  }
  res.json(torrent)
})

app.get('/api/magnet/:id', (req, res) => {
  const registry = loadRegistry()
  const torrent = registry.torrents.find(t => t.approved && t.id === req.params.id)
  if (!torrent) {
    return res.status(404).json({ error: 'Torrent not found' })
  }
  res.json({
    id: torrent.id,
    name: torrent.name,
    magnetLink: torrent.magnetLink || generateMagnetLink(torrent)
  })
})

// Admin API endpoints
app.post('/admin/api/add-torrent', requireAuth, (req, res) => {
  try {
    const registry = loadRegistry()
    const {
      name,
      description = '',
      category = 'LLM',
      tags = [],
      size = 'Unknown',
      infoHash,
      sourceLinks = {},
      modelInfo = {}
    } = req.body

    // Validate required fields
    if (!name || !infoHash) {
      return res.status(400).json({ error: 'name and infoHash are required' })
    }

    // Generate clean ID
    const id = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)

    // Check if already exists
    if (registry.torrents.find(t => t.id === id || t.infoHash === infoHash)) {
      return res.status(409).json({ error: 'Torrent already exists' })
    }

    // Create new torrent
    const newTorrent = {
      id,
      name,
      description,
      category,
      tags: Array.isArray(tags) ? tags : [],
      size,
      infoHash,
      magnetLink: generateMagnetLink({ infoHash, name }),
      approved: true, // Auto-approve admin additions
      uploaded: new Date().toISOString(),
      trackerUrl: 'http://localhost:9887/announce',
      seeders: 0,
      leechers: 0,
      lastUpdated: new Date().toISOString(),
      sourceLinks,
      modelInfo
    }

    registry.torrents.push(newTorrent)
    saveRegistry(registry)

    console.log(`✅ Added torrent: ${name} (${infoHash})`)
    res.status(201).json(newTorrent)

  } catch (err) {
    console.error('❌ Error adding torrent:', err.message)
    res.status(500).json({ error: 'Failed to add torrent' })
  }
})

app.get('/admin/api/torrents', requireAuth, (req, res) => {
  const registry = loadRegistry()
  res.json(registry.torrents)
})

app.delete('/admin/api/torrent/:id', requireAuth, (req, res) => {
  try {
    const registry = loadRegistry()
    const index = registry.torrents.findIndex(t => t.id === req.params.id)
    
    if (index === -1) {
      return res.status(404).json({ error: 'Torrent not found' })
    }

    const removed = registry.torrents.splice(index, 1)[0]
    saveRegistry(registry)

    console.log(`🗑️  Removed torrent: ${removed.name}`)
    res.json({ message: 'Torrent removed', torrent: removed })

  } catch (err) {
    console.error('❌ Error removing torrent:', err.message)
    res.status(500).json({ error: 'Failed to remove torrent' })
  }
})

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    tracker: 'http://localhost:9887'
  })
})

// Proxy to tracker stats
app.get('/stats', async (req, res) => {
  try {
    const response = await fetch('http://localhost:9887/stats')
    const data = await response.text()
    res.send(data)
  } catch (err) {
    res.status(500).send('Tracker not available')
  }
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Model Tracker API running on port ${PORT}`)
  console.log(`📋 Endpoints:`)
  console.log(`   GET  /api/torrents          - List approved models`)
  console.log(`   GET  /api/search?q=query    - Search models`)
  console.log(`   GET  /api/magnet/:id        - Get magnet link`)
  console.log(`   POST /admin/api/add-torrent - Add new model (auth required)`)
  console.log(`🔑 Admin token: Bearer ${ADMIN_TOKEN}`)
  console.log(`📊 Tracker stats: http://localhost:9887/stats`)
})

// Error handling
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught exception:', err.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})