import React, { useState, useEffect, useCallback } from 'react'
import { blink } from '../../blink/client'
import { Deal, Lead, Client, Activity } from '../../types'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Badge } from '../ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts'
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Activity as ActivityIcon, Calendar, Award } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const DEAL_STAGES = [
  { id: 'new', label: 'Новые' },
  { id: 'qualified', label: 'Квалифицированы' },
  { id: 'proposal', label: 'Предложение' },
  { id: 'negotiation', label: 'Переговоры' },
  { id: 'closed_won', label: 'Закрыты (выиграны)' },
  { id: 'closed_lost', label: 'Закрыты (проиграны)' }
]

export function AnalyticsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [timeRange, setTimeRange] = useState('30') // дни
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      
      // Загружаем все данные параллельно
      const [dealsData, leadsData, clientsData, activitiesData] = await Promise.all([
        blink.db.deals.list({
          where: { user_id: user.id },
          orderBy: { created_at: 'desc' }
        }),
        blink.db.leads.list({
          where: { user_id: user.id },
          orderBy: { created_at: 'desc' }
        }),
        blink.db.clients.list({
          where: { user_id: user.id },
          orderBy: { created_at: 'desc' }
        }),
        blink.db.activities.list({
          where: { user_id: user.id },
          orderBy: { created_at: 'desc' },
          limit: 100
        })
      ])

      setDeals(dealsData)
      setLeads(leadsData)
      setClients(clientsData)
      setActivities(activitiesData)
    } catch (error) {
      console.error('Error loading analytics data:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные аналитики",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Фильтрация данных по временному диапазону
  const filterByTimeRange = (items: any[]) => {
    const days = parseInt(timeRange)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return items.filter(item => new Date(item.created_at) >= cutoffDate)
  }

  // Основные метрики
  const filteredDeals = filterByTimeRange(deals)
  const filteredLeads = filterByTimeRange(leads)
  const filteredClients = filterByTimeRange(clients)

  const totalDealsValue = filteredDeals.reduce((sum, deal) => sum + deal.value, 0)
  const wonDeals = filteredDeals.filter(deal => deal.stage === 'closed_won')
  const wonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0)
  const lostDeals = filteredDeals.filter(deal => deal.stage === 'closed_lost')
  const winRate = filteredDeals.length > 0 ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100 : 0

  const averageDealValue = filteredDeals.length > 0 ? totalDealsValue / filteredDeals.length : 0
  const conversionRate = filteredLeads.length > 0 ? (filteredClients.length / filteredLeads.length) * 100 : 0

  // Данные для графиков
  const dealsByStage = DEAL_STAGES.map(stage => ({
    name: stage.label,
    count: filteredDeals.filter(deal => deal.stage === stage.id).length,
    value: filteredDeals.filter(deal => deal.stage === stage.id).reduce((sum, deal) => sum + deal.value, 0)
  }))

  const leadsBySource = leads.reduce((acc, lead) => {
    const source = lead.source || 'Неизвестно'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const leadSourceData = Object.entries(leadsBySource).map(([source, count]) => ({
    name: source,
    value: count
  }))

  const leadsByStatus = leads.reduce((acc, lead) => {
    const status = lead.status || 'Неизвестно'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const leadStatusData = Object.entries(leadsByStatus).map(([status, count]) => ({
    name: status,
    value: count
  }))

  // Временная динамика (по дням за выбранный период)
  const getTimeSeriesData = () => {
    const days = parseInt(timeRange)
    const data = []
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      const dayDeals = deals.filter(deal => 
        deal.created_at.split('T')[0] === dateStr
      )
      const dayLeads = leads.filter(lead => 
        lead.created_at.split('T')[0] === dateStr
      )
      const dayClients = clients.filter(client => 
        client.created_at.split('T')[0] === dateStr
      )
      
      data.push({
        date: date.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
        deals: dayDeals.length,
        leads: dayLeads.length,
        clients: dayClients.length,
        revenue: dayDeals.filter(d => d.stage === 'closed_won').reduce((sum, d) => sum + d.value, 0)
      })
    }
    
    return data
  }

  const timeSeriesData = getTimeSeriesData()

  // Активность по типам
  const activityData = activities.reduce((acc, activity) => {
    const type = activity.type || 'other'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const activityChartData = Object.entries(activityData).map(([type, count]) => ({
    name: type.replace('_', ' '),
    value: count
  }))

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка аналитики...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Аналитика</h1>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Последние 7 дней</SelectItem>
            <SelectItem value="30">Последние 30 дней</SelectItem>
            <SelectItem value="90">Последние 90 дней</SelectItem>
            <SelectItem value="365">Последний год</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Общая выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {wonValue.toLocaleString()} ₽
            </div>
            <p className="text-xs text-muted-foreground">
              из {totalDealsValue.toLocaleString()} ₽ общей стоимости
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Коэффициент выигрыша</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {wonDeals.length} из {wonDeals.length + lostDeals.length} закрытых сделок
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Средняя сделка</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageDealValue.toLocaleString()} ₽
            </div>
            <p className="text-xs text-muted-foreground">
              по {filteredDeals.length} сделкам
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Конверсия лидов</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredClients.length} клиентов из {filteredLeads.length} лидов
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Динамика по времени */}
        <Card>
          <CardHeader>
            <CardTitle>Динамика активности</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.6} />
                <Area type="monotone" dataKey="clients" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="deals" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Выручка по времени */}
        <Card>
          <CardHeader>
            <CardTitle>Выручка по дням</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ₽`, 'Выручка']} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Сделки по этапам */}
        <Card>
          <CardHeader>
            <CardTitle>Сделки по этапам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dealsByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Стоимость сделок по этапам */}
        <Card>
          <CardHeader>
            <CardTitle>Стоимость по этапам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dealsByStage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ₽`, 'Стоимость']} />
                <Bar dataKey="value" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Источники лидов */}
        <Card>
          <CardHeader>
            <CardTitle>Источники лидов</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadSourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Статусы лидов */}
        <Card>
          <CardHeader>
            <CardTitle>Статусы лидов</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {leadStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Детальная статистика */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Лиды
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Всего лидов:</span>
              <Badge variant="secondary">{leads.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>За период:</span>
              <Badge variant="secondary">{filteredLeads.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Новые:</span>
              <Badge className="bg-blue-100 text-blue-800">
                {leads.filter(l => l.status === 'new').length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Квалифицированы:</span>
              <Badge className="bg-green-100 text-green-800">
                {leads.filter(l => l.status === 'qualified').length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Отклонены:</span>
              <Badge className="bg-red-100 text-red-800">
                {leads.filter(l => l.status === 'rejected').length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Сделки
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Всего сделок:</span>
              <Badge variant="secondary">{deals.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>За период:</span>
              <Badge variant="secondary">{filteredDeals.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Активные:</span>
              <Badge className="bg-blue-100 text-blue-800">
                {deals.filter(d => !['closed_won', 'closed_lost'].includes(d.stage)).length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Выиграны:</span>
              <Badge className="bg-green-100 text-green-800">
                {wonDeals.length}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Проиграны:</span>
              <Badge className="bg-red-100 text-red-800">
                {lostDeals.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ActivityIcon className="w-5 h-5 mr-2" />
              Активность
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Всего активностей:</span>
              <Badge variant="secondary">{activities.length}</Badge>
            </div>
            {activityChartData.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex justify-between">
                <span className="capitalize">{activity.name}:</span>
                <Badge variant="outline">{activity.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Последние активности */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Последние активности
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.slice(0, 10).map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{activity.description}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">
                  {activity.type.replace('_', ' ')}
                </Badge>
              </div>
            ))}
            {activities.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Нет активностей
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}