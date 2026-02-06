#!/usr/bin/env node
/**
 * OnionXBT CLI
 * Command-line interface for the uncensored AI agent
 */

import { Command } from 'commander'
import readline from 'readline'
import chalk from 'chalk'
import { OnionAgent } from '../agent/core.js'
import { OnionWallet } from '../lib/btc/wallet.js'
import { LightningClient } from '../lib/btc/lightning.js'
import { TorClient, isTorInstalled, startTor } from '../lib/tor/client.js'
import { getDB } from '../lib/db/index.js'
import { getAllSkills, executeSkillTool } from '../skills/index.js'

const VERSION = '0.1.0'

const program = new Command()

// ASCII Art Banner
const banner = `
${chalk.hex('#F7931A')(`
   ____        _             __  ______  ______
  / __ \\____  (_)___  ____  / / / / __ )/_  __/
 / / / / __ \\/ / __ \\/ __ \\/ /_/ / __  | / /   
/ /_/ / / / / / /_/ / / / / __  / /_/ / / /    
\\____/_/ /_/_/\\____/_/ /_/_/ /_/_____/ /_/     
`)}
${chalk.gray('The Uncensored BTC-Native AI Agent')}
${chalk.hex('#F7931A')('━'.repeat(50))}
`

program
  .name('onion')
  .description('OnionXBT CLI - The uncensored AI agent')
  .version(VERSION)

// ============================================
// CHAT COMMAND - Interactive AI chat
// ============================================
program
  .command('chat')
  .description('Start an interactive chat session')
  .option('-m, --model <model>', 'AI model to use', 'claude-sonnet-4-20250514')
  .option('-p, --provider <provider>', 'AI provider (anthropic|openai)', 'anthropic')
  .option('--no-stream', 'Disable streaming responses')
  .option('--system <prompt>', 'Custom system prompt')
  .action(async (options) => {
    console.log(banner)
    
    const apiKey = process.env.AGENT_API_KEY
    if (!apiKey) {
      console.error(chalk.red('Error: AGENT_API_KEY environment variable required'))
      process.exit(1)
    }

    const agent = new OnionAgent({
      provider: options.provider,
      model: options.model,
      apiKey,
      systemPrompt: options.system,
    })

    console.log(chalk.green('🧅 OnionXBT ready. Type your message (Ctrl+C to exit)\n'))
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

    const prompt = () => {
      rl.question(chalk.hex('#F7931A')('You: '), async (input) => {
        if (!input.trim()) {
          prompt()
          return
        }

        // Special commands
        if (input.startsWith('/')) {
          handleCommand(input, messages)
          prompt()
          return
        }

        messages.push({ role: 'user', content: input })

        try {
          process.stdout.write(chalk.cyan('Onion: '))
          const response = await agent.chat('cli-user', messages)
          console.log(response.content)
          console.log(chalk.gray(`\n[${response.cost} sats]`))
          
          messages.push({ role: 'assistant', content: response.content })

          if (response.toolCalls?.length) {
            console.log(chalk.yellow('\n📦 Tool calls:'))
            for (const tc of response.toolCalls) {
              console.log(chalk.gray(`  • ${tc.name}: ${JSON.stringify(tc.output).slice(0, 100)}...`))
            }
          }
        } catch (err: any) {
          console.error(chalk.red(`Error: ${err.message}`))
        }

        console.log()
        prompt()
      })
    }

    prompt()
  })

// ============================================
// SKILL COMMAND - Manage and run skills
// ============================================
program
  .command('skill')
  .description('Manage skills')
  .argument('[action]', 'Action: list, info, run')
  .argument('[name]', 'Skill name')
  .option('-t, --tool <tool>', 'Tool to run')
  .option('-i, --input <json>', 'Tool input as JSON')
  .action(async (action, name, options) => {
    const skills = getAllSkills()

    switch (action) {
      case 'list':
      default:
        console.log(banner)
        console.log(chalk.bold('\n📦 Available Skills:\n'))
        for (const skill of skills) {
          const priceTag = skill.price === 0 
            ? chalk.green('FREE') 
            : chalk.hex('#F7931A')(`${skill.price.toLocaleString()} sats`)
          console.log(`  ${skill.icon} ${chalk.bold(skill.name)} - ${priceTag}`)
          console.log(chalk.gray(`     ${skill.description.slice(0, 60)}...`))
          console.log(chalk.gray(`     Tools: ${skill.tools.map(t => t.name).join(', ')}`))
          console.log()
        }
        break

      case 'info':
        if (!name) {
          console.error(chalk.red('Usage: onion skill info <name>'))
          process.exit(1)
        }
        const skill = skills.find(s => s.name.toLowerCase() === name.toLowerCase())
        if (!skill) {
          console.error(chalk.red(`Skill not found: ${name}`))
          process.exit(1)
        }
        console.log(banner)
        console.log(`\n${skill.icon} ${chalk.bold(skill.name)} v${skill.version}`)
        console.log(chalk.gray(`by ${skill.author}`))
        console.log(`\n${skill.description}`)
        console.log(`\nPrice: ${skill.price === 0 ? chalk.green('FREE') : chalk.hex('#F7931A')(`${skill.price} sats`)}`)
        console.log(`Tags: ${skill.tags.map(t => chalk.cyan(`#${t}`)).join(' ')}`)
        console.log(chalk.bold('\n🔧 Tools:\n'))
        for (const tool of skill.tools) {
          console.log(`  ${chalk.hex('#F7931A')(tool.name)}`)
          console.log(chalk.gray(`    ${tool.description}`))
        }
        break

      case 'run':
        if (!name || !options.tool) {
          console.error(chalk.red('Usage: onion skill run <skill> -t <tool> -i \'{"param": "value"}\''))
          process.exit(1)
        }
        const input = options.input ? JSON.parse(options.input) : {}
        console.log(chalk.gray(`Running ${name}/${options.tool}...`))
        const result = await executeSkillTool(name, options.tool, input)
        console.log(JSON.stringify(result, null, 2))
        break
    }
  })

// ============================================
// WALLET COMMAND - Bitcoin wallet management
// ============================================
program
  .command('wallet')
  .description('Manage Bitcoin wallet')
  .argument('[action]', 'Action: generate, address, balance')
  .option('-n, --network <network>', 'Network (mainnet|testnet)', 'mainnet')
  .action(async (action, options) => {
    switch (action) {
      case 'generate':
        const { mnemonic, wallet } = OnionWallet.generateWallet(options.network)
        console.log(chalk.bold('\n🔐 New Wallet Generated\n'))
        console.log(chalk.yellow('⚠️  SAVE THIS MNEMONIC SECURELY - IT CANNOT BE RECOVERED!\n'))
        console.log(chalk.hex('#F7931A')(mnemonic))
        console.log(chalk.gray(`\nNetwork: ${options.network}`))
        console.log(chalk.gray(`First address: ${wallet.deriveAddress(0).address}`))
        break

      case 'address':
        if (!process.env.BTC_XPUB) {
          console.error(chalk.red('BTC_XPUB environment variable required'))
          process.exit(1)
        }
        const w = new OnionWallet({ network: options.network, xpub: process.env.BTC_XPUB })
        const { address, index } = w.deriveAddress()
        console.log(chalk.bold('\n📬 New Receiving Address\n'))
        console.log(chalk.hex('#F7931A')(address))
        console.log(chalk.gray(`Derivation index: ${index}`))
        break

      case 'balance':
      default:
        console.log(chalk.gray('Checking balance...'))
        // In production, query blockchain API
        console.log(chalk.yellow('Balance check requires blockchain API integration'))
        break
    }
  })

// ============================================
// TOR COMMAND - Tor network management
// ============================================
program
  .command('tor')
  .description('Manage Tor connection')
  .argument('[action]', 'Action: status, start, fetch, newid')
  .option('-u, --url <url>', 'URL to fetch via Tor')
  .action(async (action, options) => {
    const tor = new TorClient()

    switch (action) {
      case 'status':
        const installed = await isTorInstalled()
        const connected = installed ? await tor.isConnected() : false
        const exitIP = connected ? await tor.getExitIP() : null

        console.log(chalk.bold('\n🧅 Tor Status\n'))
        console.log(`Installed: ${installed ? chalk.green('Yes') : chalk.red('No')}`)
        console.log(`Connected: ${connected ? chalk.green('Yes') : chalk.red('No')}`)
        if (exitIP) console.log(`Exit IP: ${chalk.cyan(exitIP)}`)
        break

      case 'start':
        console.log(chalk.gray('Starting Tor daemon...'))
        const started = await startTor()
        console.log(started ? chalk.green('Tor started successfully') : chalk.red('Failed to start Tor'))
        break

      case 'fetch':
        if (!options.url) {
          console.error(chalk.red('Usage: onion tor fetch -u <url>'))
          process.exit(1)
        }
        console.log(chalk.gray(`Fetching ${options.url} via Tor...`))
        const result = await tor.fetch(options.url)
        if (result.success) {
          console.log(chalk.green(`Status: ${result.status}`))
          console.log(result.body?.slice(0, 1000))
        } else {
          console.error(chalk.red(result.error))
        }
        break

      case 'newid':
        console.log(chalk.gray('Requesting new Tor identity...'))
        const success = await tor.newCircuit()
        if (success) {
          const newIP = await tor.getExitIP()
          console.log(chalk.green(`New identity acquired. Exit IP: ${newIP}`))
        } else {
          console.error(chalk.red('Failed to get new identity'))
        }
        break

      default:
        console.log(chalk.gray('Usage: onion tor <status|start|fetch|newid>'))
    }
  })

// ============================================
// X COMMAND - Twitter/X bot management
// ============================================
program
  .command('x')
  .description('Manage X/Twitter bot')
  .argument('[action]', 'Action: post, reply, thread, mentions')
  .option('-t, --text <text>', 'Tweet text')
  .option('-r, --reply-to <id>', 'Tweet ID to reply to')
  .option('--thread <texts...>', 'Thread texts')
  .action(async (action, options) => {
    const hasCredentials = process.env.X_APP_KEY && process.env.X_ACCESS_TOKEN
    if (!hasCredentials) {
      console.error(chalk.red('X credentials required in environment'))
      process.exit(1)
    }

    const { OnionXBot } = await import('../x-bot/index.js')
    
    console.log(chalk.gray('X bot commands - implementation pending'))
    console.log(chalk.yellow('Use the X bot module directly for now'))
  })

// ============================================
// SERVER COMMAND - Start API server
// ============================================
program
  .command('server')
  .description('Start the OnionXBT API server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-H, --host <host>', 'Host to bind', '0.0.0.0')
  .action(async (options) => {
    console.log(banner)
    console.log(chalk.gray(`Starting API server on ${options.host}:${options.port}...`))
    
    // Dynamic import to avoid loading Next.js in CLI mode
    const { startServer } = await import('../api/server.js')
    await startServer(parseInt(options.port), options.host)
  })

// ============================================
// CONFIG COMMAND - Configuration management
// ============================================
program
  .command('config')
  .description('Manage configuration')
  .argument('[action]', 'Action: show, set, init')
  .option('-k, --key <key>', 'Config key')
  .option('-v, --value <value>', 'Config value')
  .action(async (action, options) => {
    switch (action) {
      case 'init':
        console.log(chalk.bold('\n⚙️ Configuration Setup\n'))
        console.log('Create a .env file with the following variables:\n')
        console.log(chalk.gray(`# AI Provider
AGENT_PROVIDER=anthropic
AGENT_MODEL=claude-sonnet-4-20250514
AGENT_API_KEY=your_api_key

# Bitcoin
BTC_NETWORK=mainnet
BTC_XPUB=your_xpub

# Lightning
LN_PROVIDER=lnbits
LN_ENDPOINT=https://your-lnbits.com
LN_API_KEY=your_api_key

# X/Twitter (optional)
X_APP_KEY=
X_APP_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_SECRET=
`))
        break

      case 'show':
      default:
        console.log(chalk.bold('\n⚙️ Current Configuration\n'))
        const configs = [
          ['AGENT_PROVIDER', process.env.AGENT_PROVIDER],
          ['AGENT_MODEL', process.env.AGENT_MODEL],
          ['AGENT_API_KEY', process.env.AGENT_API_KEY ? '***set***' : 'not set'],
          ['BTC_NETWORK', process.env.BTC_NETWORK],
          ['LN_PROVIDER', process.env.LN_PROVIDER],
          ['X credentials', process.env.X_APP_KEY ? '***set***' : 'not set'],
        ]
        for (const [key, value] of configs) {
          console.log(`${chalk.gray(key)}: ${value || chalk.yellow('not set')}`)
        }
        break
    }
  })

// Helper function for in-chat commands
function handleCommand(input: string, messages: any[]) {
  const [cmd, ...args] = input.slice(1).split(' ')
  
  switch (cmd) {
    case 'clear':
      messages.length = 0
      console.log(chalk.gray('Chat history cleared'))
      break
    case 'history':
      console.log(chalk.gray(`${messages.length} messages in history`))
      break
    case 'help':
      console.log(chalk.gray(`
Available commands:
  /clear   - Clear chat history
  /history - Show message count
  /skills  - List available skills
  /help    - Show this help
      `))
      break
    case 'skills':
      const skills = getAllSkills()
      for (const s of skills) {
        console.log(chalk.gray(`  ${s.icon} ${s.name}`))
      }
      break
    default:
      console.log(chalk.yellow(`Unknown command: ${cmd}`))
  }
}

program.parse()
