export interface Lead {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  source: string
  value?: number
  notes?: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  status: 'active' | 'inactive' | 'prospect'
  totalValue: number
  lastContact?: string
  notes?: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface Deal {
  id: string
  title: string
  clientId: string
  clientName: string
  value: number
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  probability: number
  expectedCloseDate?: string
  notes?: string
  createdAt: string
  updatedAt: string
  userId: string
}

export interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'task'
  title: string
  description?: string
  leadId?: string
  clientId?: string
  dealId?: string
  createdAt: string
  userId: string
}