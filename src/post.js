import hiveClient from './hive'
import axios from 'axios'
import { SCOT_API_HOST } from './config'

export function getPosts(token, filter, tag, limit = 50) {
  const url = `${SCOT_API_HOST}/get_discussions_by_${filter}?token=${token}&tag=${tag}&limit=${limit}`
  return axios.get(url)
}

export function hasVotedBy(post, account) {
  const voters = post.active_votes.map(v => v.voter)
  return voters.includes(account)
}

export function deduplicate(posts) {
  let uniqPosts = []
  for (const post of posts) {
    const authorperms = uniqPosts.map(p => p.authorperm)
    if (!authorperms.includes(post.authorperm)) {
      uniqPosts.push(post)
    }
  }
  return uniqPosts
}

export function votePost(wif, voter, author, permlink, weight) {
  return new Promise((resolve, reject) => {
    hiveClient.broadcast.vote(wif, voter, author, permlink, parseInt(weight), function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    });
  })
}

export function writePost(wif, author, permlink, title, body, app, tags) {
  const json = {
    app,
    tags,
    "format": "markdown"
  }
  const jsonMetadata = JSON.stringify(json)
  return new Promise((resolve, reject) => {
    hiveClient.broadcast.comment(wif, '', tags[0], author, permlink, title, body, jsonMetadata, function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    });
  })
}

export function getPostContent(author, permlink) {
  const url = `${SCOT_API_HOST}/@${author}/${permlink}?hive=1`
  return axios.get(url)
}

export function refreshPosts(posts, token) {
  return Promise.all(posts.map(async p => {
    const { data } = await getPostContent(p.author, p.permlink)
    return data[token]
  }))
}

export function promotePost(wif, sender, author, permlink, token, amount) {
  const json = {
    contractName: "tokens",
    contractAction: "transfer",
    contractPayload: {
      symbol: token,
      to: "null",
      quantity: '' + amount,  // the quantity needs to be a string
      memo: `@${author}/${permlink}`
    }
  }
  return new Promise((resolve, reject) => {
    hiveClient.broadcast.customJson(wif, [sender], [], 'ssc-mainnet-hive', JSON.stringify(json), function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    });
  })
}
