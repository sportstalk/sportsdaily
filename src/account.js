import hiveClient from './hive'
import axios from 'axios'
import { SCOT_API_HOST, HIVE_ENGINE_API_HOST } from './config'
import { parseNumber } from './helper'

export async function getAccount(account) {
  return new Promise((resolve, reject) => {
    hiveClient.api.getAccounts([account], function (err, res) {
      if (err) {
        reject(err)
      } else {
        if (res && res.length > 0) {
          resolve(res[0])
        } else {
          resolve({})
        }
      }
    });
  })
}

export async function getAccountInfo(account, token) {
  const url = `${SCOT_API_HOST}/@${account}?token=${token}&hive=1`
  const { data }  = await axios.get(url)
  return data[token]
}

export async function getAccountBalance(account, token) {
  const url = HIVE_ENGINE_API_HOST
  const params = {
    "jsonrpc": "2.0",
    "id": 1,
    "method": "find",
    "params": {
      "contract": "tokens",
      "table": "balances",
      "query": { "account": account },
      "limit": 1000,
      "offset": 0,
      "indexes": []
    }
  }
  const { data } = await axios.post(url, params)
  const token_balances = data.result.filter(d => d.symbol === token)
  if (token_balances && token_balances.length > 0) {
    return token_balances[0]
  } else {
    return {}
  }
}

export async function getMutedAccounts(account, limit = 200) {
  return new Promise((resolve, reject) => {
    hiveClient.api.getFollowing(account, '', 'ignore', limit, function (err, res) {
      if (err) {
        reject(err)
      } else {
        const accounts = res.map(a => a.following)
        // console.log(`${accounts.length} accounts are muted by @${account}`, accounts)
        resolve(accounts)
      }
    });
  })
}

export async function claimTokenRewards(wif, account, token) {
  const json = [{ symbol: token }]
  return new Promise((resolve, reject) => {
    hiveClient.broadcast.customJson(wif, [], [account], 'scot_claim_token', JSON.stringify(json), function (err, res) {
      if (err) {
        reject(err)
      } else {
        resolve(res)
      }
    });
  })
}

export async function claimRewards(wif, account) {
  const info = await getAccount(account)
  return new Promise((resolve, reject) => {
    if (parseNumber(info.reward_hive_balance) > 0
      || parseNumber(info.reward_hbd_balance) > 0
      || parseNumber(info.reward_vesting_balance) > 0
    ) {
      console.log(`Claim rewards for @${account}:`,
        info.reward_hive_balance,
        info.reward_hbd_balance,
        info.reward_vesting_balance
      )
      hiveClient.broadcast.claimRewardBalance(wif, account, info.reward_hive_balance, info.reward_hbd_balance, info.reward_vesting_balance, function (err, res) {
        if (err) {
          reject(err)
        } else {
          resolve(res)
        }
      });
    } else {
      console.log(`No rewards to claim for @${account}:`,
        info.reward_hive_balance,
        info.reward_hbd_balance,
        info.reward_vesting_balance
      )
      resolve('no rewards to claim')
    }
  })
}
