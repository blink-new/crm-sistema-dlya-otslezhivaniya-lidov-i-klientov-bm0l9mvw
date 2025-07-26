import React, { useState, useEffect, useCallback } from 'react'
import { blink } from '../../blink/client'
import { Client } from '../../types'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { Plus, Search, Edit, Trash2, Phone, Mail, Building, Calendar, User, DollarSign } from 'lucide-react'
import { useToast } from '../../hooks/use-toast'

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    status: 'active' as Client['status'],
    address: '',
    notes: '',
    total_value: 0
  })

  const loadClients = useCallback(async () => {
    try {
      const user = await blink.auth.me()
      const data = await blink.db.clients.list({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' }
      })
      setClients(data)
    } catch (error) {
      console.error('Error loading clients:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить клиентов",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const filterClients = useCallback(() => {
    let filtered = clients

    if (searchTerm) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.company.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(client => client.status === statusFilter)
    }

    setFilteredClients(filtered)
  }, [clients, searchTerm, statusFilter])

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      status: 'active',
      address: '',
      notes: '',
      total_value: 0
    })
  }

  const handleCreate = async () => {
    try {
      const user = await blink.auth.me()
      const newClient = await blink.db.clients.create({
        ...formData,
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      // Логируем активность
      await blink.db.activities.create({
        user_id: user.id,
        type: 'client_created',
        description: `Создан новый клиент: ${formData.name}`,
        entity_type: 'client',
        entity_id: newClient.id,
        created_at: new Date().toISOString()
      })

      setClients([newClient, ...clients])
      setIsCreateDialogOpen(false)
      resetForm()
      toast({
        title: "Успешно",
        description: "Клиент создан"
      })
    } catch (error) {
      console.error('Error creating client:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось создать клиента",
        variant: "destructive"
      })
    }
  }

  const handleEdit = async () => {
    if (!selectedClient) return

    try {
      const user = await blink.auth.me()
      await blink.db.clients.update(selectedClient.id, {
        ...formData,
        updated_at: new Date().toISOString()
      })

      // Логируем активность
      await blink.db.activities.create({
        user_id: user.id,
        type: 'client_updated',
        description: `Обновлен клиент: ${formData.name}`,
        entity_type: 'client',
        entity_id: selectedClient.id,
        created_at: new Date().toISOString()
      })

      setClients(clients.map(client =>
        client.id === selectedClient.id
          ? { ...client, ...formData, updated_at: new Date().toISOString() }
          : client
      ))
      setIsEditDialogOpen(false)
      setSelectedClient(null)
      resetForm()
      toast({
        title: "Успешно",
        description: "Клиент обновлен"
      })
    } catch (error) {
      console.error('Error updating client:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось обновить клиента",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (client: Client) => {
    try {
      const user = await blink.auth.me()
      await blink.db.clients.delete(client.id)

      // Логируем активность
      await blink.db.activities.create({
        user_id: user.id,
        type: 'client_deleted',
        description: `Удален клиент: ${client.name}`,
        entity_type: 'client',
        entity_id: client.id,
        created_at: new Date().toISOString()
      })

      setClients(clients.filter(c => c.id !== client.id))
      toast({
        title: "Успешно",
        description: "Клиент удален"
      })
    } catch (error) {
      console.error('Error deleting client:', error)
      toast({
        title: "Ошибка",
        description: "Не удалось удалить клиента",
        variant: "destructive"
      })
    }
  }

  const openEditDialog = (client: Client) => {
    setSelectedClient(client)
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone,
      company: client.company,
      position: client.position,
      status: client.status,
      address: client.address,
      notes: client.notes,
      total_value: client.total_value
    })
    setIsEditDialogOpen(true)
  }

  const openViewDialog = (client: Client) => {
    setSelectedClient(client)
    setIsViewDialogOpen(true)
  }

  const getStatusBadge = (status: Client['status']) => {
    const statusConfig = {
      active: { label: 'Активный', className: 'bg-green-100 text-green-800' },
      inactive: { label: 'Неактивный', className: 'bg-gray-100 text-gray-800' },
      potential: { label: 'Потенциальный', className: 'bg-blue-100 text-blue-800' }
    }
    const config = statusConfig[status]
    return <Badge className={config.className}>{config.label}</Badge>
  }

  useEffect(() => {
    loadClients()
  }, [loadClients])

  useEffect(() => {
    filterClients()
  }, [filterClients])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Загрузка клиентов...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Клиенты</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить клиента
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Новый клиент</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Имя *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Введите имя"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
              <div>
                <Label htmlFor="company">Компания</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Название компании"
                />
              </div>
              <div>
                <Label htmlFor="position">Должность</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Должность"
                />
              </div>
              <div>
                <Label htmlFor="status">Статус</Label>
                <Select value={formData.status} onValueChange={(value: Client['status']) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Активный</SelectItem>
                    <SelectItem value="inactive">Неактивный</SelectItem>
                    <SelectItem value="potential">Потенциальный</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="total_value">Общая стоимость (₽)</Label>
                <Input
                  id="total_value"
                  type="number"
                  value={formData.total_value}
                  onChange={(e) => setFormData({ ...formData, total_value: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="address">Адрес</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Адрес клиента"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="notes">Заметки</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Дополнительная информация о клиенте"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.email}>
                Создать
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Фильтры */}
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Фильтр по статусу" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="active">Активные</SelectItem>
                <SelectItem value="inactive">Неактивные</SelectItem>
                <SelectItem value="potential">Потенциальные</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Таблица клиентов */}
      <Card>
        <CardHeader>
          <CardTitle>Список клиентов ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {clients.length === 0 ? 'Нет клиентов' : 'Клиенты не найдены'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Клиент</TableHead>
                    <TableHead>Контакты</TableHead>
                    <TableHead>Компания</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Стоимость</TableHead>
                    <TableHead>Создан</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openViewDialog(client)}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{client.name}</div>
                          {client.position && <div className="text-sm text-gray-500">{client.position}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="w-3 h-3 mr-1" />
                            {client.email}
                          </div>
                          {client.phone && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Phone className="w-3 h-3 mr-1" />
                              {client.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.company && (
                          <div className="flex items-center">
                            <Building className="w-4 h-4 mr-2 text-gray-400" />
                            {client.company}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell>
                        {client.total_value > 0 && (
                          <div className="flex items-center">
                            <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                            {client.total_value.toLocaleString()} ₽
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(client.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(client)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить клиента?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Вы уверены, что хотите удалить клиента "{client.name}"? Это действие нельзя отменить.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(client)}>
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Редактировать клиента</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-name">Имя *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Введите имя"
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <Label htmlFor="edit-phone">Телефон</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div>
              <Label htmlFor="edit-company">Компания</Label>
              <Input
                id="edit-company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Название компании"
              />
            </div>
            <div>
              <Label htmlFor="edit-position">Должность</Label>
              <Input
                id="edit-position"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                placeholder="Должность"
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Статус</Label>
              <Select value={formData.status} onValueChange={(value: Client['status']) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="inactive">Неактивный</SelectItem>
                  <SelectItem value="potential">Потенциальный</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-total_value">Общая стоимость (₽)</Label>
              <Input
                id="edit-total_value"
                type="number"
                value={formData.total_value}
                onChange={(e) => setFormData({ ...formData, total_value: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-address">Адрес</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Адрес клиента"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-notes">Заметки</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Дополнительная информация о клиенте"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name || !formData.email}>
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
              <User className="w-5 h-5 mr-2" />
              Профиль клиента
            </DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedClient.name}</h3>
                  {selectedClient.position && <p className="text-gray-600">{selectedClient.position}</p>}
                  <div className="mt-2">{getStatusBadge(selectedClient.status)}</div>
                </div>
                <div className="text-right">
                  {selectedClient.total_value > 0 && (
                    <div className="text-2xl font-bold text-green-600">
                      {selectedClient.total_value.toLocaleString()} ₽
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Контактная информация</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span>{selectedClient.email}</span>
                    </div>
                    {selectedClient.phone && (
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{selectedClient.phone}</span>
                      </div>
                    )}
                    {selectedClient.company && (
                      <div className="flex items-center">
                        <Building className="w-4 h-4 mr-2 text-gray-400" />
                        <span>{selectedClient.company}</span>
                      </div>
                    )}
                    {selectedClient.address && (
                      <div className="flex items-start">
                        <div className="w-4 h-4 mr-2 mt-0.5 text-gray-400">📍</div>
                        <span>{selectedClient.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Информация</h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Создан:</span> {new Date(selectedClient.created_at).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Обновлен:</span> {new Date(selectedClient.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {selectedClient.notes && (
                <div>
                  <h4 className="font-medium mb-2">Заметки</h4>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded">{selectedClient.notes}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Закрыть
                </Button>
                <Button onClick={() => {
                  setIsViewDialogOpen(false)
                  openEditDialog(selectedClient)
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