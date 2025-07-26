import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
}

export function StatsCard({ title, value, change, changeType = 'neutral', icon: Icon }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {change && (
          <p className={`text-xs mt-1 ${
            changeType === 'positive' ? 'text-green-600' : 
            changeType === 'negative' ? 'text-red-600' : 
            'text-gray-500'
          }`}>
            {change}
          </p>
        )}
      </CardContent>
    </Card>
  )
}