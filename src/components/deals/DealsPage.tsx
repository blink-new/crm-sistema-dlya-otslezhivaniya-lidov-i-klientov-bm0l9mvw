import React, { useState, useEffect, useCallback } from 'react'
import { blink } from '../../blink/client'
import { Deal, Lead, Client } from '../../types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog'
import { Plus, Search, Edit, Trash2, DollarSign, Calendar, User, Building, Phone, Mail } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

const DEAL_STAGES = [
  { id: 'new', label: 'Новые', color: 'bg-blue-100 text-blue-800' },
  { id: 'qualified', label: 'Квалифицированы', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'proposal', label: 'Предложение', color: 'bg-purple-100 text-purple-800' },
  { id: 'negotiation', label: 'Переговоры', color: 'bg-orange-100 text-orange-800' },
  { id: 'closed_won', label: 'Закрыты (выиграны)', color: 'bg-green-100 text-green-800' },
  { id: 'closed_lost', label: 'Закрыты (проиграны)', color: 'bg-red-100 text-red-800' }
]

export function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    value: 0,
    stage: 'new' as Deal['stage'],
    probability: 50,
    expected_close_date: '',
    lead_id: '',
    client_id: '',
    notes: ''
  })

  const loadData = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      
      // Загружаем сделки, лиды и клиентов параллельно
      const [dealsData, leadsData, clientsData] = await Promise.all([
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
        })
      ])

      setDeals(dealsData)
      setLeads(leadsData)
      setClients(clientsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      value: 0,
      stage: 'new',
      probability: 50,
      expected_close_date: '',
      lead_id: '',
      client_id: '',
      notes: ''
    })
  }

  const handleCreate = async () => {
    try {
      const user = await blink.auth.me()
      const newDeal = await blink.db.deals.create({
        ...formData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      // Логируем активность
      await blink.db.activities.create({
        user_id: user.id,
        type: 'deal_created',
        description: `Создана новая сделка: ${formData.title}`,
        entity_type: 'deal',
        entity_id: newDeal.id,
        created_at: new Date().toISOString()
      })

      setDeals([newDeal, ...deals])
      setIsCreateDialogOpen(false)
      resetForm()
      toast({
        title: "Успешно",
        description: "Сделка создана"
      })
    } catch (error) {
      console.error('Error creating deal:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать сделку",
        variant: "destructive"
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedDeal) return

    try {
      const user = await blink.auth.me()
      await blink.db.deals.update(selectedDeal.id, {
        ...formData,
        updated_at: new Date().toISOString()
      })

      // Логируем активность
      await blink.db.activities.create({
        user_id: user.id,
        type: 'deal_updated',
        description: `Обновлена сделка: ${formData.title}`,
        entity_type: 'deal',
        entity_id: selectedDeal.id,
        created_at: new Date().toISOString()
      })

      setDeals(deals.map(deal =>
        deal.id === selectedDeal.id
          ? { ...deal, ...formData, updated_at: new Date().toISOString() }
          : deal
      ))
      setIsEditDialogOpen(false)
      setSelectedDeal(null)
      resetForm()
      toast({
        title: "Успешно",
        description: "Сделка обновлена"
      })
    } catch (error) {
      console.error('Error updating deal:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить сделку",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (deal: Deal) => {
    try {
      const user = await blink.auth.me()
      await blink.db.deals.delete(deal.id)

      // Логируем активность
      await blink.db.activities.create({
        user_id: user.id,
        type: 'deal_deleted',
        description: `Удалена сделка: ${deal.title}`,
        entity_type: 'deal',
        entity_id: deal.id,
        created_at: new Date().toISOString()
      })

      setDeals(deals.filter(d => d.id !== deal.id))
      toast({
        title: "Успешно",
        description: "Сделка удалена"
      })
    } catch (error) {
      console.error('Error deleting deal:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить сделку",
        variant: "destructive"
      })
    }
  }

  const handleStageChange = async (dealId: string, newStage: Deal['stage']) => {
    try {
      const user = await blink.auth.me()
      await blink.db.deals.update(dealId, {
        stage: newStage,
        updated_at: new Date().toISOString()
      })

      // Логируем активность
      const deal = deals.find(d => d.id === dealId)
      const stageLabel = DEAL_STAGES.find(s => s.id === newStage)?.label
      await blink.db.activities.create({
        user_id: user.id,
        type: 'deal_stage_changed',
        description: `Сделка "${deal?.title}" перемещена в "${stageLabel}"`,
        entity_type: 'deal',
        entity_id: dealId,
        created_at: new Date().toISOString()
      })

      setDeals(deals.map(deal =>
        deal.id === dealId
          ? { ...deal, stage: newStage, updated_at: new Date().toISOString() }
          : deal
      ))

      toast({
        title: "Успешно",
        description: `Сделка перемещена в "${stageLabel}"`
      })
    } catch (error) {
      console.error('Error updating deal stage:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить этап сделки",
        variant: "destructive"
      })
    }
  }

  const openEditDialog = (deal: Deal) => {
    setSelectedDeal(deal)
    setFormData({
      title: deal.title,
      description: deal.description,
      value: deal.value,
      stage: deal.stage,
      probability: deal.probability,
      expected_close_date: deal.expected_close_date,
      lead_id: deal.lead_id || '',
      client_id: deal.client_id || '',
      notes: deal.notes
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (deal: Deal) => {
    setSelectedDeal(deal)
    setIsViewDialogOpen(true)
  }

  const getRelatedContact = (deal: Deal) => {
    if (deal.client_id) {
      return clients.find(c => c.id === deal.client_id)
    }
    if (deal.lead_id) {
      return leads.find(l => l.id === deal.lead_id)
    }
    return null
  }

  const filteredDeals = deals.filter(deal =>
    deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    deal.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const dealsByStage = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage.id] = filteredDeals.filter(deal => deal.stage === stage.id)
    return acc
  }, {} as Record<string, Deal[]>)

  const totalValue = filteredDeals.reduce((sum, deal) => sum + deal.value, 0)
  const wonDeals = dealsByStage.closed_won || []
  const wonValue = wonDeals.reduce((sum, deal) => sum + deal.value, 0)

  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка сделок...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Сделки</h1>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
            <span>Всего: {filteredDeals.length}</span>
            <span>Общая стоимость: {totalValue.toLocaleString()} ₽</span>
            <span>Выиграно: {wonValue.toLocaleString()} ₽</span>
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить сделку
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Новая сделка</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Название сделки"
                />
              </div>
              <div>
                <Label htmlFor="value">Стоимость (₽) *</Label>
                <Input
                  id="value"
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="stage">Этап</Label>
                <Select value={formData.stage} onValueChange={(value: Deal['stage']) => setFormData({ ...formData, stage: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_STAGES.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="probability">Вероятность (%)</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                  placeholder="50"
                />
              </div>
              <div>
                <Label htmlFor="expected_close_date">Ожидаемая дата закрытия</Label>
                <Input
                  id="expected_close_date"
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lead_id">Лид</Label>
                <Select value={formData.lead_id} onValueChange={(value) => setFormData({ ...formData, lead_id: value, client_id: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите лид" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Не выбран</SelectItem>
                    {leads.map(lead => (
                      <SelectItem key={lead.id} value={lead.id}>{lead.name} ({lead.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="client_id">Клиент</Label>
                <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value, lead_id: '' })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите клиента" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Не выбран</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name} ({client.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Описание сделки"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Заметки</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Дополнительные заметки"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={!formData.title || formData.value <= 0}>
                Создать
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Поиск */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Поиск по названию или описанию..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Канбан доска */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {DEAL_STAGES.map((stage) => (
          <Card key={stage.id} className="min-h-[500px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{stage.label}</span>
                <Badge variant="secondary" className="text-xs">
                  {dealsByStage[stage.id]?.length || 0}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dealsByStage[stage.id]?.map((deal) => {
                const contact = getRelatedContact(deal)
                return (
                  <Card
                    key={deal.id}
                    className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                    onClick={() => openViewDialog(deal)}
                  >
                    <div className="space-y-2">
                      <div className="font-medium text-sm">{deal.title}</div>
                      <div className="flex items-center text-green-600 font-semibold">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {deal.value.toLocaleString()} ₽
                      </div>
                      {contact && (
                        <div className="text-xs text-gray-600 flex items-center">
                          <User className="w-3 h-3 mr-1" />
                          {contact.name}
                        </div>
                      )}
                      {deal.probability > 0 && (
                        <div className="text-xs text-gray-500">
                          Вероятность: {deal.probability}%
                        </div>
                      )}
                      {deal.expected_close_date && (
                        <div className="text-xs text-gray-500 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(deal.expected_close_date).toLocaleDateString()}
                        </div>
                      )}
                      <div className="flex justify-between items-center pt-2">
                        <Select
                          value={deal.stage}
                          onValueChange={(value: Deal['stage']) => handleStageChange(deal.id, value)}
                        >
                          <SelectTrigger className="h-6 text-xs" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DEAL_STAGES.map(s => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => openEditDialog(deal)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить сделку?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Вы уверены, что хотите удалить сделку "{deal.title}"? Это действие нельзя отменить.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(deal)}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать сделку</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-title">Название *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Название сделки"
              />
            </div>
            <div>
              <Label htmlFor="edit-value">Стоимость (₽) *</Label>
              <Input
                id="edit-value"
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div>
              <Label htmlFor="edit-stage">Этап</Label>
              <Select value={formData.stage} onValueChange={(value: Deal['stage']) => setFormData({ ...formData, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEAL_STAGES.map(stage => (
                    <SelectItem key={stage.id} value={stage.id}>{stage.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-probability">Вероятность (%)</Label>
              <Input
                id="edit-probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                placeholder="50"
              />
            </div>
            <div>
              <Label htmlFor="edit-expected_close_date">Ожидаемая дата закрытия</Label>
              <Input
                id="edit-expected_close_date"
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-lead_id">Лид</Label>
              <Select value={formData.lead_id} onValueChange={(value) => setFormData({ ...formData, lead_id: value, client_id: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите лид" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не выбран</SelectItem>
                  {leads.map(lead => (
                    <SelectItem key={lead.id} value={lead.id}>{lead.name} ({lead.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-client_id">Клиент</Label>
              <Select value={formData.client_id} onValueChange={(value) => setFormData({ ...formData, client_id: value, lead_id: '' })}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите клиента" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Не выбран</SelectItem>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name} ({client.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-description">Описание</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание сделки"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-notes">Заметки</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительные заметки"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEdit} disabled={!formData.title || formData.value <= 0}>
              Сохранить
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Диалог просмотра */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Детали сделки
            </DialogTitle>
          </DialogHeader>
          {selectedDeal && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedDeal.title}</h3>
                  <p className="text-gray-600">{selectedDeal.description}</p>
                  <div className="mt-2">
                    <Badge className={DEAL_STAGES.find(s => s.id === selectedDeal.stage)?.color}>
                      {DEAL_STAGES.find(s => s.id === selectedDeal.stage)?.label}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedDeal.value.toLocaleString()} ₽
                  </div>
                  {selectedDeal.probability > 0 && (
                    <div className="text-sm text-gray-600">
                      Вероятность: {selectedDeal.probability}%
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Контакт</h4>
                  {(() => {
                    const contact = getRelatedContact(selectedDeal)
                    if (!contact) {
                      return <p className="text-gray-500">Не указан</p>
                    }
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{contact.name}</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-gray-400" />
                          <span>{contact.email}</span>
                        </div>
                        {contact.phone && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.company && (
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                            <span>{contact.company}</span>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>

                <div>
                  <h4 className="font-medium mb-3">Информация</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    {selectedDeal.expected_close_date && (
                      <div>
                        <span className="font-medium">Ожидаемое закрытие:</span> {new Date(selectedDeal.expected_close_date).toLocaleDateString()}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Создана:</span> {new Date(selectedDeal.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Обновлена:</span> {new Date(selectedDeal.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {selectedDeal.notes && (
                <div>
                  <h4 className="font-medium mb-2">Заметки</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{selectedDeal.notes}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Закрыть
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false)
                  openEditDialog(selectedDeal)
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Редактировать
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}