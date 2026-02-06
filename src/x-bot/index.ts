/**
 * OnionXBT X/Twitter Bot
 * Autonomous social presence like @aixbt
 */

import { TwitterApi } from 'twitter-api-v2'
import { OnionAgent } from '../agent/core.js'
import { getDB } from '../lib/db/index.js'

export interface XBotConfig {
  // Twitter API credentials
  appKey: string
  appSecret: string
  accessToken: string
  accessSecret: string
  
  // Agent config
  agentProvider: 'anthropic' | 'openai'
  agentModel: string
  agentApiKey: string
  
  // Bot behavior
  autoReply: boolean
  autoPost: boolean
  postIntervalMinutes: number
  
  // Topics to engage with
  topics: string[]
}

export interface Tweet {
  id: string
  text: string
  authorId: string
  authorUsername: string
  createdAt: Date
  isReply: boolean
  replyToId?: string
}

const X_BOT_PERSONA = `You are OnionXBT (@onionxbt), a Bitcoin maximalist AI agent on X/Twitter.

## Personality
- Sharp, witty, and unapologetically based
- Bitcoin maxi but not annoying about it
- Loves memes and shitposting
- Technical when needed, casual by default
- Contrarian takes that make people think
- Never uses corporate speak or PR language

## Content Style
- Short, punchy tweets (under 280 chars when possible)
- Use emojis sparingly but effectively 🧅⚡🟠
- Meme references and internet culture
- Hot takes on crypto, AI, tech, and freedom
- Quote tweet with commentary
- Thread when the topic demands it

## Topics You Care About
- Bitcoin and Lightning Network
- AI agents and automation
- Privacy and sovereignty
- Decentralization
- Open source
- Censorship resistance
- Memes and internet culture

## What NOT to do
- Don't be cringe or try-hard
- Don't shill or pump anything
- Don't engage with obvious bots
- Don't post generic motivational content
- Don't be mean to individuals (ideas are fair game)

## Voice Examples
"imagine paying 3% to swipe a card in 2024 lmao"
"AI safety researchers explaining why clippy is gonna kill us all 🤡"
"the only inflation hedge that also works in a bunker"
"tor + lightning = the future governments fear"

Remember: You're not trying to go viral. You're building a community of based individuals.`

export class OnionXBot {
  private twitter: TwitterApi
  private agent: OnionAgent
  private config: XBotConfig
  private db = getDB()
  private isRunning = false

  constructor(config: XBotConfig) {
    this.config = config
    
    // Initialize Twitter client
    this.twitter = new TwitterApi({
      appKey: config.appKey,
      appSecret: config.appSecret,
      accessToken: config.accessToken,
      accessSecret: config.accessSecret,
    })

    // Initialize agent with X-specific persona
    this.agent = new OnionAgent({
      provider: config.agentProvider,
      model: config.agentModel,
      apiKey: config.agentApiKey,
      systemPrompt: X_BOT_PERSONA,
    })
  }

  /**
   * Start the bot
   */
  async start() {
    console.log('🧅 OnionXBT starting...')
    this.isRunning = true

    // Verify credentials
    const me = await this.twitter.v2.me()
    console.log(`Logged in as @${me.data.username}`)

    // Start loops
    if (this.config.autoPost) {
      this.startPostLoop()
    }
    if (this.config.autoReply) {
      this.startMentionLoop()
    }
  }

  /**
   * Stop the bot
   */
  stop() {
    console.log('🧅 OnionXBT stopping...')
    this.isRunning = false
  }

  /**
   * Generate and post an original tweet
   */
  async generateAndPost(): Promise<string | null> {
    try {
      // Get recent context (timeline, trending topics, etc.)
      const timeline = await this.getTimelineContext()
      
      const response = await this.agent.chat('system', [
        {
          role: 'user',
          content: `Generate an original tweet for @onionxbt. 
          
Recent timeline context:
${timeline}

Topics to consider: ${this.config.topics.join(', ')}

Requirements:
- Must be under 280 characters
- Should feel natural, not forced
- Can be a hot take, meme, or observation
- Don't just react to timeline - bring original thoughts

Output ONLY the tweet text, nothing else.`,
        },
      ])

      const tweetText = response.content.trim()
      
      // Validate length
      if (tweetText.length > 280) {
        console.log('Generated tweet too long, skipping')
        return null
      }

      // Post it
      const result = await this.twitter.v2.tweet(tweetText)
      
      // Save to DB
      this.db.db.prepare(`
        INSERT INTO x_posts (id, tweet_id, content, type, status, posted_at)
        VALUES (?, ?, ?, 'tweet', 'posted', CURRENT_TIMESTAMP)
      `).run(crypto.randomUUID(), result.data.id, tweetText)

      console.log(`Posted: ${tweetText}`)
      return result.data.id
    } catch (error: any) {
      console.error('Failed to post:', error.message)
      return null
    }
  }

  /**
   * Reply to a mention
   */
  async replyToMention(tweet: Tweet): Promise<string | null> {
    try {
      const response = await this.agent.chat('system', [
        {
          role: 'user',
          content: `Someone mentioned @onionxbt. Generate a reply.

Tweet from @${tweet.authorUsername}:
"${tweet.text}"

Requirements:
- Must be under 280 characters
- Match their energy (serious → thoughtful, funny → witty)
- Don't be sycophantic
- Can disagree respectfully
- Include their @ at the start if needed

Output ONLY the reply text, nothing else.`,
        },
      ])

      const replyText = response.content.trim()
      
      if (replyText.length > 280) {
        console.log('Generated reply too long, skipping')
        return null
      }

      const result = await this.twitter.v2.reply(replyText, tweet.id)
      
      console.log(`Replied to @${tweet.authorUsername}: ${replyText}`)
      return result.data.id
    } catch (error: any) {
      console.error('Failed to reply:', error.message)
      return null
    }
  }

  /**
   * Quote tweet with commentary
   */
  async quoteTweet(tweetId: string, tweetText: string): Promise<string | null> {
    try {
      const response = await this.agent.chat('system', [
        {
          role: 'user',
          content: `Generate a quote tweet with commentary.

Original tweet:
"${tweetText}"

Requirements:
- Must be under 280 characters
- Add unique perspective or hot take
- Can agree, disagree, or add context
- Be entertaining or insightful

Output ONLY the quote tweet text, nothing else.`,
        },
      ])

      const quoteText = response.content.trim()
      
      if (quoteText.length > 280) return null

      const result = await this.twitter.v2.tweet(quoteText, {
        quote_tweet_id: tweetId,
      })

      console.log(`Quote tweeted: ${quoteText}`)
      return result.data.id
    } catch (error: any) {
      console.error('Failed to quote tweet:', error.message)
      return null
    }
  }

  /**
   * Get timeline context for generating content
   */
  private async getTimelineContext(): Promise<string> {
    try {
      const timeline = await this.twitter.v2.homeTimeline({
        max_results: 10,
        'tweet.fields': ['author_id', 'created_at'],
      })

      return timeline.data.data
        .map((t) => `- ${t.text.slice(0, 100)}...`)
        .join('\n')
    } catch {
      return 'No timeline context available'
    }
  }

  /**
   * Post loop - generate original content periodically
   */
  private async startPostLoop() {
    while (this.isRunning) {
      await this.generateAndPost()
      
      // Wait for next interval
      const waitMs = this.config.postIntervalMinutes * 60 * 1000
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }

  /**
   * Mention loop - check and reply to mentions
   */
  private async startMentionLoop() {
    let lastMentionId: string | undefined

    while (this.isRunning) {
      try {
        const mentions = await this.twitter.v2.userMentionTimeline(
          (await this.twitter.v2.me()).data.id,
          {
            since_id: lastMentionId,
            max_results: 10,
            'tweet.fields': ['author_id', 'created_at', 'in_reply_to_user_id'],
            expansions: ['author_id'],
          }
        )

        if (mentions.data.data && mentions.data.data.length > 0) {
          lastMentionId = mentions.data.data[0].id

          for (const tweet of mentions.data.data.reverse()) {
            const author = mentions.includes?.users?.find(
              (u) => u.id === tweet.author_id
            )
            
            await this.replyToMention({
              id: tweet.id,
              text: tweet.text,
              authorId: tweet.author_id!,
              authorUsername: author?.username || 'unknown',
              createdAt: new Date(tweet.created_at!),
              isReply: !!tweet.in_reply_to_user_id,
              replyToId: tweet.in_reply_to_user_id,
            })

            // Rate limiting
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
        }
      } catch (error: any) {
        console.error('Mention check failed:', error.message)
      }

      // Check every 2 minutes
      await new Promise((resolve) => setTimeout(resolve, 120000))
    }
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  const bot = new OnionXBot({
    appKey: process.env.X_APP_KEY!,
    appSecret: process.env.X_APP_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessSecret: process.env.X_ACCESS_SECRET!,
    agentProvider: (process.env.AGENT_PROVIDER as any) || 'anthropic',
    agentModel: process.env.AGENT_MODEL || 'claude-sonnet-4-20250514',
    agentApiKey: process.env.AGENT_API_KEY!,
    autoReply: true,
    autoPost: true,
    postIntervalMinutes: 60,
    topics: ['bitcoin', 'ai', 'privacy', 'memes', 'tech', 'freedom'],
  })

  bot.start()
}
