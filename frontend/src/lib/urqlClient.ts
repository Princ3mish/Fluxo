import { Client, fetchExchange, subscriptionExchange } from 'urql'
import { createClient as createWSClient } from 'graphql-ws'
import nhost from './nhost'

const httpUrl = import.meta.env.VITE_HASURA_GRAPHQL_ENDPOINT || ''
const wsUrl = httpUrl.replace(/^http/, 'ws')

const wsClient = typeof window !== 'undefined'
  ? createWSClient({
      url: wsUrl,
      connectionParams: () => {
        const token = nhost.auth.getAccessToken()
        return {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      },
    })
  : null

export const urqlClient = new Client({
  url: httpUrl,
  exchanges: [
    fetchExchange,
    ...(wsClient
      ? [
          subscriptionExchange({
            forwardSubscription(request) {
              const input = { ...request, query: request.query || '' }
              return {
                subscribe(sink) {
                  const unsubscribe = wsClient.subscribe(input, sink)
                  return { unsubscribe }
                },
              }
            },
          }),
        ]
      : []),
  ],
  fetchOptions: () => {
    const token = nhost.auth.getAccessToken()
    return {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  },
})
