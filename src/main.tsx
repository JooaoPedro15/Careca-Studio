import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from '@/App'

import './index.css'

// Localiza o container raiz onde o React vai montar toda a aplicacao.
const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root não encontrado.')
}

// Inicia a aplicacao no modo estrito para destacar efeitos colaterais durante o desenvolvimento.
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
