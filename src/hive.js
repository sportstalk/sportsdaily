import hiveClient from '@hiveio/hive-js'
import { API_URL } from './config'

hiveClient.config.set('rebranded_api', 'true')
hiveClient.api.setOptions({ url: API_URL })
hiveClient.broadcast.updateOperations()

export default hiveClient
