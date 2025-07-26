import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, MoreHorizontal, Phone, Mail, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { blink } from '@/blink/client'
import type { Lead } from '@/types'

const statusColors = {
  'новый': 'bg-blue-100 text-blue-800',
  'контакт': 'bg-yellow-100 text-yellow-800', 
  'квалифицирован': 'bg-green-100 text-green-800',
  'отклонен': 'bg-red-100 text-red-800'
}

const sourceColors = {
  'сайт': 'bg-purple-100 text-purple-800',
  'реклама': 'bg-orange-100 text-orange-800',
  'соцсети': 'bg-pink-100 text-pink-800',
  'рекомендация': 'bg-emerald-100 text-emerald-800',
  'холодный звонок': 'bg-gray-100 text-gray-800'
}

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  // Форма для нового/редактируемого лида
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'сайт',
    status: 'новый',
    notes: ''
  })

  const loadLeads = async () => {
    try {
      const user = await blink.auth.me()
      const data = await blink.db.leads.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' }
      })
      setLeads(data)
    } catch (error) {
      console.error('Ошибка загрузки лидов:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      source: 'сайт',
      status: 'новый',
      notes: ''
    })
  }

  useEffect(() => {
    loadLeads()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const user = await blink.auth.me()
      
      if (editingLead) {
        // Обновление существующего лида
        await blink.db.leads.update(editingLead.id, {
          ...formData,
          updated_at: new Date().toISOString()
        })
      } else {
        // Создание нового лида
        await blink.db.leads.create({
          ...formData,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }

      // Добавляем активность
      await blink.db.activities.create({
        user_id: user.id,
        type: editingLead ? 'lead_updated' : 'lead_created',
        description: editingLead 
          ? `Обновлен лид: ${formData.name}`
          : `Создан новый лид: ${formData.name}`,
        created_at: new Date().toISOString()
      })

      await loadLeads()
      setIsAddDialogOpen(false)
      setEditingLead(null)
      resetForm()
    } catch (error) {
      console.error('Ошибка сохранения лида:', error)
    }
  }

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead)
    setFormData({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company || '',
      position: lead.position || '',
      source: lead.source,
      status: lead.status,
      notes: lead.notes || ''
    })
    setIsAddDialogOpen(true)
  }

  const handleDelete = async (leadId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого лида?')) return
    
    try {
      await blink.db.leads.delete(leadId)
      await loadLeads()
    } catch (error) {
      console.error('Ошибка удаления лида:', error)
    }
  }

  // Фильтрация лидов
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.company && lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
    
    return matchesSearch && matchesStatus && matchesSource
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка лидов...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и кнопка добавления */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Лиды</h1>
          <p className="text-gray-600">Управление потенциальными клиентами</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingLead(null) }}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить лида
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingLead ? 'Редактировать лида' : 'Добавить нового лида'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Имя *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="company">Компания</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="position">Должность</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({...formData, position: e.target.value})}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="source">Источник</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="сайт">Сайт</SelectItem>
                      <SelectItem value="реклама">Реклама</SelectItem>
                      <SelectItem value="соцсети">Соцсети</SelectItem>
                      <SelectItem value="рекомендация">Рекомендация</SelectItem>
                      <SelectItem value="холодный звонок">Холодный звонок</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Статус</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="новый">Новый</SelectItem>
                      <SelectItem value="контакт">Контакт</SelectItem>
                      <SelectItem value="квалифицирован">Квалифицирован</SelectItem>
                      <SelectItem value="отклонен">Отклонен</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Заметки</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button type="submit">
                  {editingLead ? 'Обновить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Фильтры и поиск */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Поиск по имени, email или компании..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  <SelectItem value="новый">Новый</SelectItem>
                  <SelectItem value="контакт">Контакт</SelectItem>
                  <SelectItem value="квалифицирован">Квалифицирован</SelectItem>
                  <SelectItem value="отклонен">Отклонен</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Источник" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все источники</SelectItem>
                  <SelectItem value="сайт">Сайт</SelectItem>
                  <SelectItem value="реклама">Реклама</SelectItem>
                  <SelectItem value="соцсети">Соцсети</SelectItem>
                  <SelectItem value="рекомендация">Рекомендация</SelectItem>
                  <SelectItem value="холодный звонок">Холодный звонок</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица лидов */}
      <Card>
        <CardHeader>
          <CardTitle>Лиды ({filteredLeads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Лиды не найдены</p>
              <p className="text-sm text-gray-400 mt-1">
                {leads.length === 0 ? 'Добавьте первого лида' : 'Попробуйте изменить фильтры поиска'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Имя</TableHead>
                    <TableHead>Контакты</TableHead>
                    <TableHead>Компания</TableHead>
                    <TableHead>Источник</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{lead.name}</div>
                          {lead.position && (
                            <div className="text-sm text-gray-500">{lead.position}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="w-3 h-3 mr-1 text-gray-400" />
                            {lead.email}
                          </div>
                          {lead.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="w-3 h-3 mr-1 text-gray-400" />
                              {lead.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.company || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={sourceColors[lead.source as keyof typeof sourceColors]}>
                          {lead.source}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusColors[lead.status as keyof typeof statusColors]}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(lead.created_at).toLocaleDateString('ru-RU')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(lead)}>
                              Редактировать
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(lead.id)}
                              className="text-red-600"
                            >
                              Удалить
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}