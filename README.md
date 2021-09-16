# sportsdaily
Sports Talk Social Daily Voting / Post

This tool is designed to curate content from a configurable set of tags(eg #baseball, #basketball, etc), of which the top voted (based on the Hive Engine token SPORTS) are voted on daily if they haven't already been voted in the past. It will then publish a post to the Hive blockchain detailing the top posts that were voted in that session followed by burning any SPORTS available to it for promotion of that post. Finally it will claim any Hive rewards that are available to it.

### Install

```bash
1.) git clone https://github.com/sportstalk/sportsdaily
2.) cd sportsdaily
3.) yarn
```

### Configure

Set the environment variables `POSTING_KEY` and `ACTIVE_KEY` of the bot account

.env.example file is an example.

### Execute

```bash
yarn run execute
```
