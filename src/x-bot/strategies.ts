/**
 * OnionXBT Content Strategies
 * Advanced posting and engagement logic
 */

import { OnionAgent } from '../agent/core.js'
import { 
  ONION_PERSONA, 
  CONTENT_TEMPLATES,
  MEME_VOCABULARY,
  TOPIC_HOOKS,
  selectContentPillar,
  selectTheme,
  formatTweet,
} from './persona.js'

export interface ContentContext {
  recentTweets?: string[]       // Recent timeline
  btcPrice?: number             // Current price
  btcChange24h?: number         // 24h change %
  trendingTopics?: string[]     // What's trending
  mentionContext?: string       // If replying to someone
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night'
}

/**
 * Generate original tweet content
 */
export async function generateOriginalTweet(
  agent: OnionAgent,
  context: ContentContext
): Promise<string> {
  const pillar = selectContentPillar()
  const theme = selectTheme(pillar)
  
  const timeContext = getTimeContext()
  const priceContext = getPriceContext(context)
  
  const prompt = `You are OnionXBT (@onionxbt), a Bitcoin maximalist AI agent.

PERSONA:
${JSON.stringify(ONION_PERSONA.voice, null, 2)}

CONTENT PILLAR: ${pillar.name}
THEME: ${theme}

CONTEXT:
- Time: ${timeContext}
- BTC Price: ${context.btcPrice ? `$${context.btcPrice.toLocaleString()}` : 'unknown'}
- 24h Change: ${context.btcChange24h ? `${context.btcChange24h > 0 ? '+' : ''}${context.btcChange24h.toFixed(1)}%` : 'unknown'}
${priceContext ? `- Market Mood: ${priceContext}` : ''}
${context.trendingTopics?.length ? `- Trending: ${context.trendingTopics.slice(0, 5).join(', ')}` : ''}

AVAILABLE FORMATS:
${CONTENT_TEMPLATES.oneLiners.slice(0, 5).join('\n')}

VOCABULARY TO USE:
- Emojis: ${Object.values(MEME_VOCABULARY.emojis).flat().slice(0, 10).join(' ')}
- Terms: ${[...MEME_VOCABULARY.based, ...MEME_VOCABULARY.positive].slice(0, 8).join(', ')}

RULES:
1. Keep it under 280 characters
2. Lowercase preferred
3. No hashtags unless really relevant
4. Be witty, not try-hard
5. Have an actual take, don't be generic
6. If nothing interesting to say, be funny instead

Generate ONE tweet. Output ONLY the tweet text, nothing else.`

  const response = await agent.chat('system', [{ role: 'user', content: prompt }])
  return formatTweet(response.content)
}

/**
 * Generate a reply to a mention or tweet
 */
export async function generateReply(
  agent: OnionAgent,
  originalTweet: { text: string; author: string },
  context: ContentContext
): Promise<string> {
  const prompt = `You are OnionXBT (@onionxbt), replying to a tweet.

PERSONA: Witty, based, technically competent Bitcoin maxi AI agent. 
VOICE: ${ONION_PERSONA.voice.style}

ORIGINAL TWEET from @${originalTweet.author}:
"${originalTweet.text}"

REPLY STRATEGIES:
${CONTENT_TEMPLATES.replyFormats.join('\n')}

RULES:
1. Match their energy (serious → thoughtful, joking → witty)
2. Under 280 characters
3. Don't be sycophantic ("great point!" is cringe)
4. Can disagree respectfully if warranted
5. Add value or humor, ideally both
6. Lowercase preferred

Generate ONE reply. Output ONLY the reply text, nothing else.`

  const response = await agent.chat('system', [{ role: 'user', content: prompt }])
  return formatTweet(response.content)
}

/**
 * Generate a quote tweet commentary
 */
export async function generateQuoteTweet(
  agent: OnionAgent,
  originalTweet: { text: string; author: string },
  context: ContentContext
): Promise<string> {
  const prompt = `You are OnionXBT (@onionxbt), quote tweeting with commentary.

PERSONA: Based Bitcoin maxi AI agent with sharp takes.

ORIGINAL TWEET from @${originalTweet.author}:
"${originalTweet.text}"

QUOTE TWEET PURPOSES:
- Add unique perspective they missed
- Amplify if extremely based
- Gentle dunk if bad take
- Educational context if technical

RULES:
1. Under 200 chars (leave room for the quote)
2. Don't just agree - add something
3. If dunking, be clever not mean
4. Lowercase preferred

Generate ONE quote tweet comment. Output ONLY the text, nothing else.`

  const response = await agent.chat('system', [{ role: 'user', content: prompt }])
  return formatTweet(response.content)
}

/**
 * Generate a thread on a topic
 */
export async function generateThread(
  agent: OnionAgent,
  topic: string,
  context: ContentContext
): Promise<string[]> {
  const prompt = `You are OnionXBT (@onionxbt), writing a thread about: ${topic}

PERSONA: Bitcoin maxi AI agent, technically competent, good at explanations.

THREAD STRUCTURE:
1. Hook tweet (most important - makes people want to read)
2. Setup/context (1-2 tweets)
3. Main points (2-4 tweets)
4. Conclusion/call to action (1 tweet)

RULES:
1. Each tweet MUST be under 280 characters
2. Number tweets (1/, 2/, etc)
3. First tweet is the hook - make it compelling
4. Be educational but not boring
5. Include specific examples where possible
6. Lowercase preferred
7. Total: 5-8 tweets

Output ONLY the tweets, one per line, numbered like "1/ tweet text"`

  const response = await agent.chat('system', [{ role: 'user', content: prompt }])
  
  // Parse numbered tweets
  const tweets = response.content
    .split('\n')
    .filter(line => /^\d+\//.test(line.trim()))
    .map(line => formatTweet(line.replace(/^\d+\/\s*/, '')))
    .filter(t => t.length > 0 && t.length <= 280)

  return tweets
}

/**
 * Decide engagement action for a tweet
 */
export function decideEngagement(tweet: {
  text: string
  author: string
  metrics?: { likes: number; retweets: number }
}): 'reply' | 'quote' | 'like' | 'retweet' | 'ignore' {
  const text = tweet.text.toLowerCase()
  
  // Ignore list
  if (text.includes('giveaway')) return 'ignore'
  if (text.includes('airdrop')) return 'ignore'
  if (text.length < 20) return 'ignore'
  
  // Quote tweet worthy (interesting takes)
  if (tweet.metrics && tweet.metrics.retweets > 50) {
    if (text.includes('bitcoin') || text.includes('btc')) return 'quote'
  }
  
  // Reply worthy (questions, discussions)
  if (text.includes('?')) return 'reply'
  if (text.includes('@onionxbt')) return 'reply'
  
  // Just like (good content, not worth reply)
  if (text.includes('lightning') || text.includes('nostr')) return 'like'
  if (tweet.metrics && tweet.metrics.likes > 100) return 'like'
  
  // Retweet (exceptional content)
  if (text.includes('open source') && text.includes('release')) return 'retweet'
  
  return 'ignore'
}

/**
 * Get time-based context for content
 */
function getTimeContext(): string {
  const hour = new Date().getUTCHours()
  
  if (hour >= 5 && hour < 12) return 'morning (gm energy)'
  if (hour >= 12 && hour < 17) return 'afternoon (active discussion time)'
  if (hour >= 17 && hour < 22) return 'evening (peak engagement)'
  return 'night (chill vibes, philosophical posts work)'
}

/**
 * Get price-based context for content
 */
function getPriceContext(context: ContentContext): string | null {
  if (!context.btcChange24h) return null
  
  const change = context.btcChange24h
  
  if (change > 10) return 'MEGA PUMP - euphoria mode'
  if (change > 5) return 'solid green - bullish energy'
  if (change > 0) return 'slight green - steady optimism'
  if (change > -5) return 'slight red - buy the dip energy'
  if (change > -10) return 'red day - stay humble, stack sats'
  return 'DUMP - max chill, no panic posting'
}

/**
 * Rate limit helper
 */
export class RateLimiter {
  private actions: Map<string, number[]> = new Map()
  private limits: Map<string, { count: number; windowMs: number }> = new Map([
    ['tweet', { count: 50, windowMs: 24 * 60 * 60 * 1000 }],    // 50/day
    ['reply', { count: 100, windowMs: 24 * 60 * 60 * 1000 }],   // 100/day
    ['like', { count: 500, windowMs: 24 * 60 * 60 * 1000 }],    // 500/day
    ['retweet', { count: 50, windowMs: 24 * 60 * 60 * 1000 }],  // 50/day
  ])

  canPerform(action: string): boolean {
    const limit = this.limits.get(action)
    if (!limit) return true

    const now = Date.now()
    const actions = this.actions.get(action) || []
    
    // Clean old actions
    const recent = actions.filter(t => now - t < limit.windowMs)
    this.actions.set(action, recent)

    return recent.length < limit.count
  }

  record(action: string): void {
    const actions = this.actions.get(action) || []
    actions.push(Date.now())
    this.actions.set(action, actions)
  }

  getRemaining(action: string): number {
    const limit = this.limits.get(action)
    if (!limit) return Infinity

    const now = Date.now()
    const actions = (this.actions.get(action) || [])
      .filter(t => now - t < limit.windowMs)

    return Math.max(0, limit.count - actions.length)
  }
}
