/**
 * X/Twitter Automation Skill
 * Advanced social media automation for @onionxbt
 */

import { TwitterApi } from 'twitter-api-v2'

let twitterClient: TwitterApi | null = null

function getTwitterClient(): TwitterApi {
  if (!twitterClient) {
    twitterClient = new TwitterApi({
      appKey: process.env.X_APP_KEY!,
      appSecret: process.env.X_APP_SECRET!,
      accessToken: process.env.X_ACCESS_TOKEN!,
      accessSecret: process.env.X_ACCESS_SECRET!,
    })
  }
  return twitterClient
}

export default {
  name: 'XAutomation',
  description: 'Advanced Twitter/X automation. Schedule posts, analyze engagement, track mentions, manage threads, and automate interactions.',
  icon: '🐦',
  price: 10000, // 10k sats
  version: '1.0.0',
  author: 'social_wizard',
  tags: ['twitter', 'social', 'automation', 'x', 'marketing'],

  tools: [
    {
      name: 'x_post',
      description: 'Post a tweet to @onionxbt',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Tweet text (max 280 chars)' },
          replyTo: { type: 'string', description: 'Tweet ID to reply to' },
          quoteTweet: { type: 'string', description: 'Tweet ID to quote' },
          poll: {
            type: 'object',
            properties: {
              options: { type: 'array', items: { type: 'string' } },
              durationMinutes: { type: 'number' }
            }
          }
        },
        required: ['text']
      },
      execute: async (params: { 
        text: string; 
        replyTo?: string; 
        quoteTweet?: string;
        poll?: { options: string[]; durationMinutes: number }
      }) => {
        const client = getTwitterClient()
        
        if (params.text.length > 280) {
          return { error: 'Tweet exceeds 280 characters' }
        }

        try {
          const options: any = {}
          
          if (params.replyTo) {
            options.reply = { in_reply_to_tweet_id: params.replyTo }
          }
          
          if (params.quoteTweet) {
            options.quote_tweet_id = params.quoteTweet
          }
          
          if (params.poll) {
            options.poll = {
              options: params.poll.options,
              duration_minutes: params.poll.durationMinutes || 1440 // 24h default
            }
          }

          const result = await client.v2.tweet(params.text, options)
          
          return {
            success: true,
            tweetId: result.data.id,
            url: `https://x.com/onionxbt/status/${result.data.id}`
          }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    },
    {
      name: 'x_thread',
      description: 'Post a thread (multiple connected tweets)',
      parameters: {
        type: 'object',
        properties: {
          tweets: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Array of tweet texts (in order)'
          }
        },
        required: ['tweets']
      },
      execute: async (params: { tweets: string[] }) => {
        const client = getTwitterClient()
        const results: Array<{ id: string; text: string }> = []
        
        let lastTweetId: string | undefined

        for (const text of params.tweets) {
          if (text.length > 280) {
            return { error: `Tweet exceeds 280 chars: "${text.slice(0, 50)}..."` }
          }

          try {
            const options: any = {}
            if (lastTweetId) {
              options.reply = { in_reply_to_tweet_id: lastTweetId }
            }

            const result = await client.v2.tweet(text, options)
            lastTweetId = result.data.id
            results.push({ id: result.data.id, text })
            
            // Rate limit
            await new Promise(r => setTimeout(r, 1000))
          } catch (err: any) {
            return { 
              error: err.message, 
              partialResults: results 
            }
          }
        }

        return {
          success: true,
          threadUrl: `https://x.com/onionxbt/status/${results[0].id}`,
          tweets: results
        }
      }
    },
    {
      name: 'x_search',
      description: 'Search for tweets by keyword or hashtag',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          count: { type: 'number', description: 'Number of results (max 100)', default: 20 },
          type: { 
            type: 'string', 
            enum: ['recent', 'popular'],
            default: 'recent'
          }
        },
        required: ['query']
      },
      execute: async (params: { query: string; count?: number; type?: string }) => {
        const client = getTwitterClient()
        
        try {
          const results = await client.v2.search(params.query, {
            max_results: Math.min(params.count || 20, 100),
            sort_order: params.type === 'popular' ? 'relevancy' : 'recency',
            'tweet.fields': ['author_id', 'created_at', 'public_metrics'],
            expansions: ['author_id'],
          })

          return {
            query: params.query,
            count: results.data?.data?.length || 0,
            tweets: results.data?.data?.map(t => ({
              id: t.id,
              text: t.text,
              authorId: t.author_id,
              createdAt: t.created_at,
              metrics: t.public_metrics
            })) || []
          }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    },
    {
      name: 'x_mentions',
      description: 'Get recent mentions of @onionxbt',
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'Number of mentions to fetch', default: 20 },
          sinceId: { type: 'string', description: 'Only get mentions after this tweet ID' }
        }
      },
      execute: async (params: { count?: number; sinceId?: string }) => {
        const client = getTwitterClient()
        
        try {
          const me = await client.v2.me()
          const mentions = await client.v2.userMentionTimeline(me.data.id, {
            max_results: Math.min(params.count || 20, 100),
            since_id: params.sinceId,
            'tweet.fields': ['author_id', 'created_at', 'public_metrics', 'in_reply_to_user_id'],
            expansions: ['author_id'],
          })

          return {
            count: mentions.data?.data?.length || 0,
            mentions: mentions.data?.data?.map(t => ({
              id: t.id,
              text: t.text,
              authorId: t.author_id,
              createdAt: t.created_at,
              isReply: !!t.in_reply_to_user_id
            })) || [],
            users: mentions.includes?.users?.reduce((acc, u) => {
              acc[u.id] = u.username
              return acc
            }, {} as Record<string, string>) || {}
          }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    },
    {
      name: 'x_like',
      description: 'Like a tweet',
      parameters: {
        type: 'object',
        properties: {
          tweetId: { type: 'string', description: 'ID of tweet to like' }
        },
        required: ['tweetId']
      },
      execute: async (params: { tweetId: string }) => {
        const client = getTwitterClient()
        try {
          const me = await client.v2.me()
          await client.v2.like(me.data.id, params.tweetId)
          return { success: true, liked: params.tweetId }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    },
    {
      name: 'x_retweet',
      description: 'Retweet a tweet',
      parameters: {
        type: 'object',
        properties: {
          tweetId: { type: 'string', description: 'ID of tweet to retweet' }
        },
        required: ['tweetId']
      },
      execute: async (params: { tweetId: string }) => {
        const client = getTwitterClient()
        try {
          const me = await client.v2.me()
          await client.v2.retweet(me.data.id, params.tweetId)
          return { success: true, retweeted: params.tweetId }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    },
    {
      name: 'x_analytics',
      description: 'Get engagement analytics for recent tweets',
      parameters: {
        type: 'object',
        properties: {
          count: { type: 'number', description: 'Number of tweets to analyze', default: 10 }
        }
      },
      execute: async (params: { count?: number }) => {
        const client = getTwitterClient()
        
        try {
          const me = await client.v2.me()
          const tweets = await client.v2.userTimeline(me.data.id, {
            max_results: Math.min(params.count || 10, 100),
            'tweet.fields': ['public_metrics', 'created_at']
          })

          const analytics = tweets.data?.data?.map(t => ({
            id: t.id,
            text: t.text.slice(0, 50) + '...',
            createdAt: t.created_at,
            likes: t.public_metrics?.like_count || 0,
            retweets: t.public_metrics?.retweet_count || 0,
            replies: t.public_metrics?.reply_count || 0,
            impressions: t.public_metrics?.impression_count || 0,
            engagement: (
              (t.public_metrics?.like_count || 0) +
              (t.public_metrics?.retweet_count || 0) * 2 +
              (t.public_metrics?.reply_count || 0) * 3
            )
          })) || []

          const totalEngagement = analytics.reduce((sum, t) => sum + t.engagement, 0)
          const avgEngagement = analytics.length > 0 ? totalEngagement / analytics.length : 0

          return {
            tweetsAnalyzed: analytics.length,
            totalEngagement,
            avgEngagement: Math.round(avgEngagement * 10) / 10,
            topTweet: analytics.sort((a, b) => b.engagement - a.engagement)[0],
            tweets: analytics
          }
        } catch (err: any) {
          return { error: err.message }
        }
      }
    }
  ]
}
