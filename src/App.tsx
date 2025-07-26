import { useState, useEffect } from 'react'
import { Sidebar } from './components/layout/Sidebar'
import { Dashboard } from './components/dashboard/Dashboard'
import { LeadsPage } from './components/leads/LeadsPage'
import { ClientsPage } from './components/clients/ClientsPage'
import { DealsPage } from './components/deals/DealsPage'
import { AnalyticsPage } from './components/analytics/AnalyticsPage'
import { SettingsPage } from './components/settings/SettingsPage'
import { blink } from './blink/client'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">CRM Система</h1>
          <p className="text-gray-600 mb-6">Войдите в систему для продолжения</p>
          <button
            onClick={() => blink.auth.login()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Войти
          </button>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />
      case 'leads':
        return (
          <div className="p-6">
            <LeadsPage />
          </div>
        )
      case 'clients':
        return (
          <div className="p-6">
            <ClientsPage />
          </div>
        )
      case 'deals':
        return (
          <div className="p-6">
            <DealsPage />
          </div>
        )
      case 'analytics':
        return (
          <div className="p-6">
            <AnalyticsPage />
          </div>
        )
      case 'settings':
        return (
          <div className="p-6">
            <SettingsPage />
          </div>
        )
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 lg:ml-64">
        {renderContent()}
      </main>
    </div>
  )
}

export default App