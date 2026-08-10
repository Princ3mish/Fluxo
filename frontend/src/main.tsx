import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { NhostProvider } from '@nhost/react'
import { Provider as UrqlProvider } from 'urql'
import nhost from './lib/nhost'
import { urqlClient } from './lib/urqlClient'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NhostProvider nhost={nhost}>
      <UrqlProvider value={urqlClient}>
        <App />
      </UrqlProvider>
    </NhostProvider>
  </StrictMode>,
)
