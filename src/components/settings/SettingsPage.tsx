import React, { useState, useEffect, useCallback } from 'react'
import { blink } from '../../blink/client'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Switch } from '../ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Separator } from '../ui/separator'
import { Badge } from '../ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog'
import { User, Settings, Bell, Database, Download, Trash2, Shield, Mail, Phone, Building, Calendar, Save } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

interface UserSettings {
  id?: string
  user_id: string
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  currency: string
  timezone: string
  language: string
  email_notifications: boolean
  push_notifications: boolean
  deal_reminders: boolean
  lead_auto_assignment: boolean
  data_retention_days: number
  created_at?: string
  updated_at?: string
}

export function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [settings, setSettings] = useState<UserSettings>({
    user_id: '',
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    currency: 'RUB',
    timezone: 'Europe/Moscow',
    language: 'ru',
    email_notifications: true,
    push_notifications: true,
    deal_reminders: true,
    lead_auto_assignment: false,
    data_retention_days: 365
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const { toast } = useToast()

  const loadUserAndSettings = useCallback(async () => {
    try {
      const userData = await blink.auth.me()
      setUser(userData)

      // Пытаемся загрузить настройки пользователя
      const userSettings = await blink.db.user_settings.list({
        where: { user_id: userData.id },
        limit: 1
      })

      if (userSettings.length > 0) {
        setSettings(userSettings[0])
      } else {
        // Создаем настройки по умолчанию
        setSettings(prev => ({ ...prev, user_id: userData.id }))
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      if (settings.id) {
        // Обновляем существующие настройки
        await blink.db.user_settings.update(settings.id, {
          ...settings,
          updated_at: new Date().toISOString()
        })
      } else {
        // Создаем новые настройки
        const newSettings = await blink.db.user_settings.create({
          ...settings,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        setSettings(newSettings)
      }

      toast({
        title: "Успешно",
        description: "Настройки сохранены"
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    setExportLoading(true)
    try {
      // Загружаем все данные пользователя
      const [leads, clients, deals, activities] = await Promise.all([
        blink.db.leads.list({ where: { user_id: user.id } }),
        blink.db.clients.list({ where: { user_id: user.id } }),
        blink.db.deals.list({ where: { user_id: user.id } }),
        blink.db.activities.list({ where: { user_id: user.id } })
      ])

      const exportData = {
        export_date: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          display_name: user.display_name
        },
        settings,
        data: {
          leads,
          clients,
          deals,
          activities
        },
        statistics: {
          total_leads: leads.length,
          total_clients: clients.length,
          total_deals: deals.length,
          total_activities: activities.length,
          total_deal_value: deals.reduce((sum, deal) => sum + deal.value, 0)
        }
      }

      // Создаем и скачиваем файл
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crm-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Успешно",
        description: "Данные экспортированы"
      })
    } catch (error) {
      console.error('Error exporting data:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось экспортировать данные",
        variant: "destructive"
      })
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteAllData = async () => {
    try {
      // Удаляем все данные пользователя
      const [leads, clients, deals, activities] = await Promise.all([
        blink.db.leads.list({ where: { user_id: user.id } }),
        blink.db.clients.list({ where: { user_id: user.id } }),
        blink.db.deals.list({ where: { user_id: user.id } }),
        blink.db.activities.list({ where: { user_id: user.id } })
      ])

      // Удаляем все записи
      await Promise.all([
        ...leads.map(lead => blink.db.leads.delete(lead.id)),
        ...clients.map(client => blink.db.clients.delete(client.id)),
        ...deals.map(deal => blink.db.deals.delete(deal.id)),
        ...activities.map(activity => blink.db.activities.delete(activity.id))
      ])

      toast({
        title: "Успешно",
        description: "Все данные удалены"
      })
    } catch (error) {
      console.error('Error deleting data:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить данные",
        variant: "destructive"
      })
    }
  }

  useEffect(() => {
    loadUserAndSettings()
  }, [loadUserAndSettings])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка настроек...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Настройки</h1>
        <Button onClick={handleSaveSettings} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Профиль пользователя */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Профиль пользователя
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              <div>
                <Label>Имя</Label>
                <Input value={user?.display_name || ''} disabled />
              </div>
            </div>
            <div className="text-sm text-gray-500">
              Для изменения профиля обратитесь к администратору системы
            </div>
          </CardContent>
        </Card>

        {/* Статистика аккаунта */}
        <Card>
          <CardHeader>
            <CardTitle>Статистика аккаунта</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span>Дата регистрации:</span>
              <span className="text-sm text-gray-600">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Неизвестно'}
              </span>
            </div>
            <Separator />
            <div className="text-sm text-gray-500">
              Используйте CRM систему эффективно для роста вашего бизнеса
            </div>
          </CardContent>
        </Card>

        {/* Настройки компании */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="w-5 h-5 mr-2" />
              Настройки компании
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">Название компании</Label>
                <Input
                  id="company_name"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  placeholder="ООО Моя Компания"
                />
              </div>
              <div>
                <Label htmlFor="company_email">Email компании</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                  placeholder="info@company.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_phone">Телефон компании</Label>
                <Input
                  id="company_phone"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div>
                <Label htmlFor="currency">Валюта</Label>
                <Select value={settings.currency} onValueChange={(value) => setSettings({ ...settings, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RUB">Российский рубль (₽)</SelectItem>
                    <SelectItem value="USD">Доллар США ($)</SelectItem>
                    <SelectItem value="EUR">Евро (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="company_address">Адрес компании</Label>
              <Textarea
                id="company_address"
                value={settings.company_address}
                onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                placeholder="Адрес вашей компании"
              />
            </div>
          </CardContent>
        </Card>

        {/* Региональные настройки */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Региональные настройки
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="timezone">Часовой пояс</Label>
              <Select value={settings.timezone} onValueChange={(value) => setSettings({ ...settings, timezone: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem>
                  <SelectItem value="Europe/Kiev">Киев (UTC+2)</SelectItem>
                  <SelectItem value="Asia/Almaty">Алматы (UTC+6)</SelectItem>
                  <SelectItem value="America/New_York">Нью-Йорк (UTC-5)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Язык</Label>
              <Select value={settings.language} onValueChange={(value) => setSettings({ ...settings, language: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">Русский</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="uk">Українська</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Уведомления */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Уведомления
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Email уведомления</Label>
                <p className="text-sm text-gray-500">Получать уведомления на email</p>
              </div>
              <Switch
                checked={settings.email_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Push уведомления</Label>
                <p className="text-sm text-gray-500">Уведомления в браузере</p>
              </div>
              <Switch
                checked={settings.push_notifications}
                onCheckedChange={(checked) => setSettings({ ...settings, push_notifications: checked })}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <Label>Напоминания о сделках</Label>
                <p className="text-sm text-gray-500">Напоминания о важных датах</p>
              </div>
              <Switch
                checked={settings.deal_reminders}
                onCheckedChange={(checked) => setSettings({ ...settings, deal_reminders: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Автоматизация */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              Автоматизация
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Авто-назначение лидов</Label>
                <p className="text-sm text-gray-500">Автоматически назначать новых лидов</p>
              </div>
              <Switch
                checked={settings.lead_auto_assignment}
                onCheckedChange={(checked) => setSettings({ ...settings, lead_auto_assignment: checked })}
              />
            </div>
            <Separator />
            <div>
              <Label htmlFor="data_retention">Хранение данных (дни)</Label>
              <Input
                id="data_retention"
                type="number"
                min="30"
                max="3650"
                value={settings.data_retention_days}
                onChange={(e) => setSettings({ ...settings, data_retention_days: Number(e.target.value) })}
              />
              <p className="text-sm text-gray-500 mt-1">
                Как долго хранить данные активностей
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Управление данными */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Управление данными
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Экспорт данных</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Скачайте все ваши данные в формате JSON для резервного копирования или переноса
                  </p>
                  <Button 
                    onClick={handleExportData} 
                    disabled={exportLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {exportLoading ? 'Экспорт...' : 'Экспортировать данные'}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 text-red-600">Опасная зона</h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Необратимые действия. Будьте осторожны!
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить все данные
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить все данные?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие удалит ВСЕ ваши данные: лиды, клиенты, сделки и активности. 
                          Это действие нельзя отменить. Рекомендуем сначала экспортировать данные.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAllData} className="bg-red-600 hover:bg-red-700">
                          Да, удалить все данные
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Информация о системе */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Информация о системе</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-2">Версия CRM</h4>
                <Badge variant="secondary">v1.0.0</Badge>
                <p className="text-sm text-gray-500 mt-1">
                  Последнее обновление: {new Date().toLocaleDateString()}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Поддержка</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center">
                    <Mail className="w-3 h-3 mr-1" />
                    support@crm.com
                  </div>
                  <div className="flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    +7 (999) 123-45-67
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Документация</h4>
                <div className="space-y-1">
                  <Button variant="link" className="p-0 h-auto text-sm">
                    Руководство пользователя
                  </Button>
                  <br />
                  <Button variant="link" className="p-0 h-auto text-sm">
                    API документация
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}