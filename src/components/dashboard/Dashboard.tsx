import { useState, useEffect, useCallback } from 'react'
import { StatsCard } from './StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, UserCheck, Target, TrendingUp, Phone, Mail, Calendar, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { blink } from '@/blink/client'
import type { Lead, Client, Deal, Activity } from '@/types'

export function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    totalClients: 0,
    totalDeals: 0,
    totalRevenue: 0
  })
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const loadDashboardData = useCallback(async () => {
    try {
      // For demo purposes, use demo_user data
      const [leads, clients, deals, activities] = await Promise.all([
        blink.db.leads.list({ where: { userId: 'demo_user' }, limit: 1000 }),
        blink.db.clients.list({ where: { userId: 'demo_user' }, limit: 1000 }),
        blink.db.deals.list({ where: { userId: 'demo_user' }, limit: 1000 }),
        blink.db.activities.list({ 
          where: { userId: 'demo_user' }, 
          orderBy: { createdAt: 'desc' },
          limit: 10 
        })
      ])

      const totalRevenue = deals
        .filter(deal => deal.stage === 'closed_won')
        .reduce((sum, deal) => sum + (deal.value || 0), 0)

      setStats({
        totalLeads: leads.length,
        totalClients: clients.length,
        totalDeals: deals.length,
        totalRevenue
      })

      setRecentActivities(activities)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone
      case 'email': return Mail
      case 'meeting': return Calendar
      default: return Plus
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Дашборд</h1>
        <p className="text-gray-600 mt-1">Обзор вашей CRM системы</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Всего лидов"
          value={stats.totalLeads}
          change="+12% за месяц"
          changeType="positive"
          icon={Users}
        />
        <StatsCard
          title="Клиенты"
          value={stats.totalClients}
          change="+8% за месяц"
          changeType="positive"
          icon={UserCheck}
        />
        <StatsCard
          title="Активные сделки"
          value={stats.totalDeals}
          change="+5% за месяц"
          changeType="positive"
          icon={Target}
        />
        <StatsCard
          title="Общая выручка"
          value={`₽${stats.totalRevenue.toLocaleString()}`}
          change="+15% за месяц"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Последние активности</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет активностей</p>
              ) : (
                recentActivities.map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                        {activity.description && (
                          <p className="text-sm text-gray-500 mt-1">{activity.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(activity.createdAt).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Быстрые действия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start gap-3" variant="outline">
                <Plus className="h-4 w-4" />
                Добавить лида
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <Plus className="h-4 w-4" />
                Создать сделку
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <Plus className="h-4 w-4" />
                Добавить клиента
              </Button>
              <Button className="w-full justify-start gap-3" variant="outline">
                <Calendar className="h-4 w-4" />
                Запланировать встречу
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}