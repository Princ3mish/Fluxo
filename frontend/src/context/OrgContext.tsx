import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from 'urql'
import { useAuthenticationStatus, useUserId } from '@nhost/react'

export interface OrgMember {
  org_id: string
  role: string
  organization: {
    name: string
  }
}

interface OrgContextType {
  currentOrgId: string | null
  setCurrentOrgId: (id: string | null) => void
  myOrgs: OrgMember[]
}

const GET_MY_ORGS_QUERY = `
  query GetMyOrgs($user_id: uuid!) {
    org_members(where: {user_id: {_eq: $user_id}}) {
      org_id
      role
      organization {
        name
      }
    }
  }
`

const OrgContext = createContext<OrgContextType>({
  currentOrgId: null,
  setCurrentOrgId: () => {},
  myOrgs: [],
})

export function OrgProvider({ children }: { children: ReactNode }) {
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const { isAuthenticated } = useAuthenticationStatus()
  const userId = useUserId()

  const [{ data }, reexecuteQuery] = useQuery({
    query: GET_MY_ORGS_QUERY,
    variables: { user_id: userId ?? '' },
    pause: !isAuthenticated || !userId,
    requestPolicy: 'network-only',
  })

  const myOrgs: OrgMember[] = data?.org_members || []

  useEffect(() => {
    if (isAuthenticated && userId && myOrgs.length === 0) {
      reexecuteQuery({ requestPolicy: 'network-only' })
    }
  }, [isAuthenticated, userId, myOrgs.length])

  useEffect(() => {
    if (myOrgs.length > 0 && !currentOrgId) {
      const ownerRow = myOrgs.find((o) => o.role === 'owner')
      const editorRow = myOrgs.find((o) => o.role === 'editor')
      const best = ownerRow ?? editorRow ?? myOrgs[0]
      setCurrentOrgId(best.org_id)
    }
  }, [myOrgs, currentOrgId])

  return (
    <OrgContext.Provider value={{ currentOrgId, setCurrentOrgId, myOrgs }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  return useContext(OrgContext)
}
