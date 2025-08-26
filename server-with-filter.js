#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Server } from './index.js'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Path to the torrent registry (shared with main app)
const REGISTRY_PATH = process.env.REGISTRY_PATH || '/app/torrent-registry.json'

console.log(`🔧 DEBUG: REGISTRY_PATH set to: ${REGISTRY_PATH}`)
console.log(`🔧 DEBUG: __dirname is: ${__dirname}`)
console.log(`🔧 DEBUG: process.cwd() is: ${process.cwd()}`)

function loadTorrentRegistry() {
  try {
    // Use absolute path directly since we know the file is at /app/torrent-registry.json
    const fullPath = REGISTRY_PATH
    console.log(`📋 DEBUG: About to load registry from: ${fullPath}`)
    console.log(`📋 DEBUG: File exists check: ${fs.existsSync(fullPath)}`)
    
    if (!fs.existsSync(fullPath)) {
      console.log('⚠️  Registry file not found, creating empty registry')
      return { torrents: [] }
    }
    
    const data = fs.readFileSync(fullPath, 'utf8')
    const registry = JSON.parse(data)
    const approvedCount = registry.torrents.filter(t => t.approved).length
    console.log(`✅ Loaded ${approvedCount} approved torrents from registry`)
    return registry
  } catch (err) {
    console.error('❌ Error loading registry:', err.message)
    return { torrents: [] }
  }
}

// Whitelist filter function
function torrentFilter(infoHash, params, cb) {
  console.log(`🔍 FILTER CHECK: Incoming request for hash: ${infoHash}`)
  console.log(`📋 Request params: peer_id=${params.peer_id}, port=${params.port}, event=${params.event}`)
  
  const registry = loadTorrentRegistry()
  console.log(`📊 Registry has ${registry.torrents.length} total torrents`)
  
  const approvedTorrents = registry.torrents.filter(t => t.approved === true)
  console.log(`✅ Approved torrents: ${approvedTorrents.length}`)
  
  // Log all approved hashes for comparison
  approvedTorrents.forEach(t => {
    console.log(`   - ${t.infoHash} (${t.name})`)
  })
  
  // Check if this info hash is in approved torrents
  const approved = registry.torrents.find(
    t => t.approved === true && t.infoHash === infoHash
  )
  
  if (approved) {
    console.log(`✅ MATCH FOUND: ${infoHash} matches ${approved.name}`)
    console.log(`🎯 ALLOWING torrent: ${approved.name}`)
    cb(null) // Allow tracking
  } else {
    console.log(`❌ NO MATCH: ${infoHash} not found in approved registry`)
    console.log(`❌ BLOCKING torrent with hash: ${infoHash}`)
    cb(new Error('Torrent not approved - AI models only'))
  }
}

// Create server with filter
const server = new Server({
  udp: true,
  http: true,
  ws: true,
  filter: torrentFilter,
  trustProxy: true
})

// Get port from command line or environment
const port = process.argv.find(arg => arg.startsWith('--port'))?.split('=')[1] || 
             process.env.PORT || 9887

// Start server
server.listen(port, () => {
  console.log(`🛡️  Secured AI Model Tracker listening on port ${port}`)
  console.log(`📊 Stats: http://localhost:${port}/stats`)
  console.log(`🎯 Announce: http://localhost:${port}/announce`)
  console.log(`🔒 Filter: Active (whitelist only)`)
})

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down tracker...')
  server.close(() => {
    console.log('✅ Tracker stopped')
    process.exit(0)
  })
})

// Error handling
server.on('error', (err) => {
  console.error('❌ Tracker error:', err.message)
})

server.on('warning', (err) => {
  console.warn('⚠️  Tracker warning:', err.message)
})

// Log successful connections
server.on('complete', (peer) => {
  console.log(`📈 Complete: ${peer.ip}:${peer.port} for ${peer.infoHash}`)
})

server.on('start', (peer) => {
  console.log(`🚀 Start: ${peer.ip}:${peer.port} for ${peer.infoHash}`)
})