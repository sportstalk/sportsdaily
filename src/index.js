// implement the voter bot according to the description in the post:
// https://www.sportstalksocial.com/hive-101690/@sportsbene/500-hive-bounty-automate-sportstalksocial-voting-daily-post

import { getPosts, hasVotedBy, deduplicate, votePost, writePost, refreshPosts, promotePost } from './post'
import { getMutedAccounts, getAccountBalance, claimRewards } from './account'
import { sleep } from './helper'

const TOKEN = 'SPORTS'
const QUERY_LIMIT = 50 // the posts to query under each tag
const POSTS_UNDER_TAG = 5 // only return the posts within the limit for each tag
const TAGS = [
  'football',
  'americanfootball',
  'baseball',
  'basketball',
  'golf',
  'tennis',
  'hockey',
  'cricket',
  'mma',
  'boxing'
]
const COMMUNITY_TAG = 'sportstalk'  // #sportstalk or #hive-101690
const ADMIN_ACCOUNT = 'hivesports'
const VOTER_ACCOUNT = 'sportstalksocial'
const TOTAL_VOTER_WEIGHT = 10 // total weight which will be divided by the number of posts
const NOW = new Date()

async function searchPostsByTag(tag, blacklist = []) {
  // 1. search posts by tag
  const { data } = await getPosts(TOKEN, 'trending', tag, QUERY_LIMIT)
  let posts = data
  if (posts && Array.isArray(posts)) {
    // 2. authors not muted
    posts = posts.filter(p => !blacklist.includes(p.author))
    // 3. posts not voted
    posts = posts.filter(p => !hasVotedBy(p, VOTER_ACCOUNT))
    // 4. posts within cashout time (within 7 days)
    posts = posts.filter(p => p.cashout_time && NOW < new Date(p.cashout_time + 'Z'))
    // 5. only return the top ones
    posts = posts.slice(0, POSTS_UNDER_TAG)
    console.log(`\t#${tag}: ${posts.length} posts`)
    return posts
  } else {
    return []
  }
}

async function searchPosts() {
  const blacklist = await getMutedAccounts(ADMIN_ACCOUNT)
  let posts = {}
  console.log('search posts under tags: ', TAGS)
  await Promise.all(TAGS.map(async tag => {
    const postsUnderTag = await searchPostsByTag(tag, blacklist)
    posts[tag] = postsUnderTag
  }))
  return posts
}

async function votePosts(posts) {
  let allPosts = []
  for (const tag in posts) {
    for (let p of posts[tag]) {
      p.topic = tag
    }
    allPosts = allPosts.concat(posts[tag])
  }
  allPosts = deduplicate(allPosts)

  console.log(`start voting ${allPosts.length} posts`)
  const weight = parseInt(Math.min(TOTAL_VOTER_WEIGHT * 10000 / allPosts.length, 10000))
  for (const post of allPosts) {
    await votePost(process.env.POSTING_KEY, VOTER_ACCOUNT, post.author, post.permlink, weight)
    console.log(`\tVoted post @${post.author}/${post.permlink} under tag #${post.topic} with weight [${weight / 100}%]`)
    await sleep(5000) // avoid vote too frequently
  }
}

async function publishDailyPost(posts) {
  console.log('Publishing daily post ......')
  const topPosts = await searchPostsByTag(COMMUNITY_TAG)
  const getTopicSummary = async (tagPosts, tag = null) => {
    if (tagPosts && tagPosts.length > 0) {
      let md = tag ? `## ${tag}\n\n` : ''
      md += "|Author|Post|Rewards|\n|-|-|-|\n"

      tagPosts = await refreshPosts(tagPosts, TOKEN)
      for (const p of tagPosts) {
        const url = `https://www.sportstalksocial.com/${p.authorperm}`
        const title = p.title.replace(/\|/g, '&#124;') // replace pipe (|) with &#124;
        const rewards = p.pending_token / Math.pow(10, p.precision)
        md += `|@${p.author}|[${title}](${url})|${rewards}|\n`
      }
      md += '\n'
      return md
    } else {
      return ''
    }
  }

  let body = "Here's the top new posts from Sports Talk Social today!\n\n" // header
  body += await getTopicSummary(topPosts)
  body += "These were the top posts from the selected #sportstalk tags that were curated based on their total SPORTS rewards.\n\n"
  for (const tag of TAGS) {
    body += await getTopicSummary(posts[tag], tag)
  }
  body += "This report is automatically generated from SPORTS data at the time of posting. Any SPORTS earned from these daily curation posts will be burned on future curation reports.\n\n" 
  body += "<center>![sportstalkbreak.png](https://images.hive.blog/DQmZxqFcWKskAqEdGwDeiVdCiuswqeHDm17CWSgfkhavfoY/image.png)<br><br>[![SportsTalk.png](https://images.hive.blog/DQmPX8z8yHFCqiK4Pw6F8pLX5ppmvcx25tv9h4Z7tvs7xd1/image.png)](https://www.sportstalksocial.com) | [![dTube.png](https://images.hive.blog/DQmSWx1ovfh1wzCa8FECT165QM9ABx9wm4XRsSJqGMTaiQh/image.png)](https://video.sportstalksocial.com/) | [![Discord.png](https://images.hive.blog/DQmSWjgG8hgH7nXLTfMGXKtm5q6pPUS2YVDy4T296mQLvVX/image.png)](http://discord.sportstalk.social) | [![Twitter.png](https://images.hive.blog/DQmZXgbqnAVPoWhRPBXpysGbKxo9mGjmmz8UndyZ3kHGfQQ/image.png)](https://twitter.com/sportstalkhive) | [![Facebook.png](https://images.hive.blog/DQmU8ZgZdBWneCiswAzAs2tjYvU5YRc1qwmMaW94FimdCuj/image.png)](https://www.facebook.com/sportstalksocial) | [![StateoftheDapps.png](https://images.hive.blog/DQmUedcvsmFwgK58ePcE5H6sEQSufpfrD417hWXDxNJpWBJ/image.png)](https://www.stateofthedapps.com/dapps/sportstalksocial)</center>"  // footer

  const date = new Date().toISOString().substring(0, 10)
  const author = VOTER_ACCOUNT
  const permlink = `sports-curation-report-${date}`
  const title = `SPORTS Curation Report - [${date}]`
  const app = 'sportsbot/v1.0'
  const tags = ['hive-101690', 'sportstalk', 'sports', 'curation', 'archon', 'curationreport']
  writePost(process.env.POSTING_KEY, author, permlink, title, body, app, tags)
  const url = `https://www.sportstalksocial.com/@${author}/${permlink}`
  console.log(`Published post [${title}] to ${url}`)
  return { author, permlink }
}

async function promotePublishedPost(post) {
  const { balance } = await getAccountBalance(VOTER_ACCOUNT, TOKEN)
  if (balance > 0) {
    // promote with all the balances
    await promotePost(process.env.ACTIVE_KEY, VOTER_ACCOUNT, post.author, post.permlink, TOKEN, balance)
    console.log(`Promoted post @${post.author}/${post.permlink} with ${balance} ${TOKEN}`)
  } else {
    console.log('No balance to promote the post')
  }
}

async function claimAccountRewards() {
  await claimRewards(process.env.POSTING_KEY, VOTER_ACCOUNT)
}

async function main() {
  const posts = await searchPosts()
  await claimAccountRewards() // claim rewards before voting
  await votePosts(posts)
  const publishedPost = await publishDailyPost(posts)
  await promotePublishedPost(publishedPost)
}

main()
