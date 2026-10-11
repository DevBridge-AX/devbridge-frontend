export interface MessageCitation {
  sourceType: 'document' | 'git_commit' | 'db_schema' | 'owner_answer'
  sourceId: number | string
  title: string
  similarityScore: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  citations?: MessageCitation[]
  isError?: boolean
  isOwnerAnswer?: boolean
  ownerName?: string
}
