# AI Model Tracker - BitTorrent-based Decentralized AI Model Distribution

**Secure, whitelist-only BitTorrent tracker for legitimate AI models**

This is a specialized implementation of a BitTorrent tracker designed specifically for distributing AI models in a secure, decentralized way. Unlike traditional trackers that allow any content, this tracker only permits pre-approved AI models from trusted sources.

## 🚀 Quick Start - Ready to Use Commands

### Start the System
```bash
# 1. Start API server (manages model registry)
npm start

# 2. Build and run Docker tracker (handles BitTorrent protocol)
docker build -t ai-tracker .
docker run -d -p 9887:9887 -p 9888:9888/udp -v "$(pwd)/torrent-registry.json:/app/torrent-registry.json" ai-tracker
```

### Query Available Models
```bash
# List all approved AI models
curl http://localhost:8100/api/torrents

# Search for specific models
curl "http://localhost:8100/api/search?q=liquid"

# Get magnet link for a specific model
curl http://localhost:8100/api/magnet/liquidai-lfm2350m

# Check tracker statistics
curl http://localhost:9887/stats
```

### Admin Operations
```bash
# Add new AI model (admin only)
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer admin123" \
  http://localhost:8100/admin/api/add-torrent \
  -d '{
    "name": "Llama 2 7B Chat GGUF",
    "description": "Meta Llama 2 7B conversational model",
    "category": "LLM",
    "infoHash": "a1b2c3d4e5f6789012345678901234567890abcd",
    "sourceLinks": {
      "huggingface": "https://huggingface.co/meta-llama/Llama-2-7b-chat-hf"
    }
  }'

# List all models (including unapproved)
curl -H "Authorization: Bearer admin123" http://localhost:8100/admin/api/torrents

# Remove a model
curl -X DELETE -H "Authorization: Bearer admin123" http://localhost:8100/admin/api/torrent/model-id
```

### Health Checks
```bash
# API server health
curl http://localhost:8100/health

# Tracker stats (HTML)
curl http://localhost:9887/stats

# Tracker stats (JSON)
curl http://localhost:9887/stats.json
```

## 🔒 Security Features

- **Whitelist-only**: Only pre-approved AI models are tracked
- **Admin authentication**: Bearer token required for management
- **Source verification**: Links to original HuggingFace/GitHub sources
- **Docker isolation**: Tracker runs in secure container
- **Non-root execution**: Container runs as non-root user

## 📊 API Endpoints

### Public Endpoints (No Auth Required)
- `GET /api/torrents` - List all approved models
- `GET /api/search?q=query` - Search models by name/description/tags
- `GET /api/torrent/:id` - Get specific model details
- `GET /api/magnet/:id` - Get magnet link for model
- `GET /health` - API health check
- `GET /stats` - Proxy to tracker stats

### Admin Endpoints (Bearer Token Required)
- `POST /admin/api/add-torrent` - Add new model to registry
- `GET /admin/api/torrents` - List all models (including pending)
- `DELETE /admin/api/torrent/:id` - Remove model from registry

## 🐳 Docker Configuration

**Ports:**
- `9887` - HTTP tracker (BitTorrent announce/scrape)
- `9888/udp` - UDP tracker (optional)

**Volumes:**
- `/app/torrent-registry.json` - Shared model registry

**Environment:**
- `REGISTRY_PATH=/app/torrent-registry.json`

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   API Server    │    │ torrent-registry │    │ Docker Tracker  │
│   (port 8100)   │◄──►│     .json        │◄──►│   (port 9887)   │
│                 │    │  (shared file)   │    │                 │
│ Model Mgmt      │    │                  │    │ BitTorrent      │
│ Search/Query    │    │  Approved Models │    │ Protocol        │
│ Admin Auth      │    │  Metadata        │    │ Whitelist Filter│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 💾 Registry Format

Each model entry contains:
```json
{
  "id": "liquidai-lfm2350m",
  "name": "LiquidAI LFM2-350M",
  "description": "Language Foundation Model 2 - 350M parameters",
  "category": "LLM",
  "tags": ["liquidai", "lfm2", "350m"],
  "infoHash": "445cf3cbd272ac373d15ceed4aa525eb49ffac66",
  "magnetLink": "magnet:?xt=urn:btih:...",
  "approved": true,
  "sourceLinks": {
    "huggingface": "https://huggingface.co/LiquidAI/LFM2-350M"
  }
}
```

---

## Original BitTorrent Tracker Documentation

![tracker visualization](img/img.png)

Node.js implementation of a [BitTorrent tracker](https://wiki.theory.org/BitTorrentSpecification#Tracker_HTTP.2FHTTPS_Protocol), client and server.

A **BitTorrent tracker** is a web service which responds to requests from BitTorrent
clients. The requests include metrics from clients that help the tracker keep overall
statistics about the torrent. The response includes a peer list that helps the client
participate in the torrent swarm.

This module is used by [WebTorrent](http://webtorrent.io).

## features

- Includes client & server implementations
- Supports all mainstream tracker types:
  - HTTP trackers
  - UDP trackers ([BEP 15](http://www.bittorrent.org/beps/bep_0015.html))
  - WebTorrent trackers ([BEP forthcoming](http://webtorrent.io))
- Supports ipv4 & ipv6
- Supports tracker "scrape" extension
- Robust and well-tested
  - Comprehensive test suite (runs entirely offline, so it's reliable)
  - Used by popular clients: [WebTorrent](http://webtorrent.io), [peerflix](https://www.npmjs.com/package/peerflix), and [playback](https://mafintosh.github.io/playback/)
- Tracker statistics available via web interface at `/stats` or JSON data at `/stats.json`

Also see [bittorrent-dht](https://www.npmjs.com/package/bittorrent-dht).

### Tracker stats

![Screenshot](img/trackerStats.png)

## install

```
npm install bittorrent-tracker
```

## usage

### client

To connect to a tracker, just do this:

```js
import Client from 'bittorrent-tracker'

const requiredOpts = {
  infoHash: new Buffer('012345678901234567890'), // hex string or Buffer
  peerId: new Buffer('01234567890123456789'), // hex string or Buffer
  announce: [], // list of tracker server urls
  port: 6881 // torrent client port, (in browser, optional)
}

const optionalOpts = {
  // RTCPeerConnection config object (only used in browser)
  rtcConfig: {},
  // User-Agent header for http requests
  userAgent: '',
  // Custom webrtc impl, useful in node to specify [wrtc](https://npmjs.com/package/wrtc)
  wrtc: {},
  getAnnounceOpts: function () {
    // Provide a callback that will be called whenever announce() is called
    // internally (on timer), or by the user
    return {
      uploaded: 0,
      downloaded: 0,
      left: 0,
      customParam: 'blah' // custom parameters supported
    }
  },
  // Proxy options (used to proxy requests in node)
  proxyOpts: {
      // For WSS trackers this is always a http.Agent
      // For UDP trackers this is an object of options for the Socks Connection
      // For HTTP trackers this is either an undici Agent if using Node16 or later, or http.Agent if using versions prior to Node 16, ex:
      // import Socks from 'socks'
      // proxyOpts.socksProxy = new Socks.Agent(optionsObject, isHttps)
      // or if using Node 16 or later
      // import { socksDispatcher } from 'fetch-socks'
      // proxyOpts.socksProxy = socksDispatcher(optionsObject)
      socksProxy: new SocksProxy(socksOptionsObject),
      // Populated with socksProxy if it's provided
      httpAgent: new http.Agent(agentOptionsObject),
      httpsAgent: new https.Agent(agentOptionsObject)
  },
}

const client = new Client(requiredOpts)

client.on('error', function (err) {
  // fatal client error!
  console.log(err.message)
})

client.on('warning', function (err) {
  // a tracker was unavailable or sent bad data to the client. you can probably ignore it
  console.log(err.message)
})

// start getting peers from the tracker
client.start()

client.on('update', function (data) {
  console.log('got an announce response from tracker: ' + data.announce)
  console.log('number of seeders in the swarm: ' + data.complete)
  console.log('number of leechers in the swarm: ' + data.incomplete)
})

client.once('peer', function (addr) {
  console.log('found a peer: ' + addr) // 85.10.239.191:48623
})

// announce that download has completed (and you are now a seeder)
client.complete()

// force a tracker announce. will trigger more 'update' events and maybe more 'peer' events
client.update()

// provide parameters to the tracker
client.update({
  uploaded: 0,
  downloaded: 0,
  left: 0,
  customParam: 'blah' // custom parameters supported
})

// stop getting peers from the tracker, gracefully leave the swarm
client.stop()

// ungracefully leave the swarm (without sending final 'stop' message)
client.destroy()

// scrape
client.scrape()

client.on('scrape', function (data) {
  console.log('got a scrape response from tracker: ' + data.announce)
  console.log('number of seeders in the swarm: ' + data.complete)
  console.log('number of leechers in the swarm: ' + data.incomplete)
  console.log('number of total downloads of this torrent: ' + data.downloaded)
})
```

### server

To start a BitTorrent tracker server to track swarms of peers:

```js
import { Server } from 'bittorrent-tracker'
// Or import Server from 'bittorrent-tracker/server'

const server = new Server({
  udp: true, // enable udp server? [default=true]
  http: true, // enable http server? [default=true]
  ws: true, // enable websocket server? [default=true]
  stats: true, // enable web-based statistics? [default=true]
  trustProxy: false, // enable trusting x-forwarded-for header for remote IP [default=false]
  filter: function (infoHash, params, cb) {
    // Blacklist/whitelist function for allowing/disallowing torrents. If this option is
    // omitted, all torrents are allowed. It is possible to interface with a database or
    // external system before deciding to allow/deny, because this function is async.

    // It is possible to block by peer id (whitelisting torrent clients) or by secret
    // key (private trackers). Full access to the original HTTP/UDP request parameters
    // are available in `params`.

    // This example only allows one torrent.

    const allowed = (infoHash === 'aaa67059ed6bd08362da625b3ae77f6f4a075aaa')
    if (allowed) {
      // If the callback is passed `null`, the torrent will be allowed.
      cb(null)
    } else {
      // If the callback is passed an `Error` object, the torrent will be disallowed
      // and the error's `message` property will be given as the reason.
      cb(new Error('disallowed torrent'))
    }
  }
})

// Internal http, udp, and websocket servers exposed as public properties.
server.http
server.udp
server.ws

server.on('error', function (err) {
  // fatal server error!
  console.log(err.message)
})

server.on('warning', function (err) {
  // client sent bad data. probably not a problem, just a buggy client.
  console.log(err.message)
})

server.on('listening', function () {
  // fired when all requested servers are listening

  // HTTP
  const httpAddr = server.http.address()
  const httpHost = httpAddr.address !== '::' ? httpAddr.address : 'localhost'
  const httpPort = httpAddr.port
  console.log(`HTTP tracker: http://${httpHost}:${httpPort}/announce`)

  // UDP
  const udpAddr = server.udp.address()
  const udpHost = udpAddr.address
  const udpPort = udpAddr.port
  console.log(`UDP tracker: udp://${udpHost}:${udpPort}`)

  // WS
  const wsAddr = server.ws.address()
  const wsHost = wsAddr.address !== '::' ? wsAddr.address : 'localhost'
  const wsPort = wsAddr.port
  console.log(`WebSocket tracker: ws://${wsHost}:${wsPort}`)

})


// start tracker server listening! Use 0 to listen on a random free port.
const port = 0
const hostname = "localhost"
server.listen(port, hostname, () => {
  // Do something on listening...
})

// listen for individual tracker messages from peers:

server.on('start', function (addr) {
  console.log('got start message from ' + addr)
})

server.on('complete', function (addr) {})
server.on('update', function (addr) {})
server.on('stop', function (addr) {})

// get info hashes for all torrents in the tracker server
Object.keys(server.torrents)

// get the number of seeders for a particular torrent
server.torrents[infoHash].complete

// get the number of leechers for a particular torrent
server.torrents[infoHash].incomplete

// get the peers who are in a particular torrent swarm
server.torrents[infoHash].peers
```

The http server will handle requests for the following paths: `/announce`, `/scrape`. Requests for other paths will not be handled.

## multi scrape

Scraping multiple torrent info is possible with a static `Client.scrape` method:

```js
import Client from 'bittorrent-tracker'
// Or import Client from 'bittorrent-tracker/client'

Client.scrape({ announce: announceUrl, infoHash: [ infoHash1, infoHash2 ]}, function (err, results) {
  results[infoHash1].announce
  results[infoHash1].infoHash
  results[infoHash1].complete
  results[infoHash1].incomplete
  results[infoHash1].downloaded

  // ...
})
````

## command line

Install `bittorrent-tracker` globally:

```sh
$ npm install -g bittorrent-tracker
```

Easily start a tracker server:

```sh
$ bittorrent-tracker
http server listening on 8000
udp server listening on 8000
ws server listening on 8000
```

Lots of options:

```sh
$ bittorrent-tracker --help
  bittorrent-tracker - Start a bittorrent tracker server

  Usage:
    bittorrent-tracker [OPTIONS]

  If no --http, --udp, or --ws option is supplied, all tracker types will be started.

  Options:
    -p, --port [number]  change the port [default: 8000]
        --trust-proxy    trust 'x-forwarded-for' header from reverse proxy
        --interval       client announce interval (ms) [default: 600000]
        --http           enable http server
        --udp            enable udp server
        --ws             enable websocket server
    -q, --quiet          only show error output
    -s, --silent         show no output
    -v, --version        print the current version
```

## license

MIT. Copyright (c) [Feross Aboukhadijeh](https://feross.org) and [WebTorrent, LLC](https://webtorrent.io).
