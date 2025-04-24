import React, { useState, useEffect } from 'react';
import { 
  Users, Truck, FileText, Award, CheckCircle2, XCircle, 
  Calendar, MapPin, BarChart2, TrendingUp, AlertTriangle 
} from 'lucide-react';
import { useCompanyData } from '../../hooks/useCompanyData';
import toast from 'react-hot-toast';
import { useDateRange } from '../../hooks/useDateRange';
import PeriodSelector from '../../components/hodometros/PeriodSelector';
import LoadingSpinner from '../../components/LoadingSpinner';

interface DashboardStats {
  totalChecklists: number;
  totalMensal: number;
  totalSemanal: number;
  totalVerificados: number;
  totalPendentes: number;
  totalProblemas: number;
  problemasPorCategoria: {
    categoria: string;
    total: number;
    percentual: number;
  }[];
  veiculosComProblemas: {
    placa: string;
    marca: string;
    tipo: string;
    problemas: {
      categoria: string;
      item: string;
      status: string;
    }[];
  }[];
  checklistsPorMotorista: {
    nome: string;
    total: number;
    verificados: number;
    pendentes: number;
  }[];
}

const ChecklistDashboard = () => {
  const { query } = useCompanyData();
  const [stats, setStats] = useState<DashboardStats>({
    totalChecklists: 0,
    totalMensal: 0,
    totalSemanal: 0,
    totalVerificados: 0,
    totalPendentes: 0,
    totalProblemas: 0,
    problemasPorCategoria: [],
    veiculosComProblemas: [],
    checklistsPorMotorista: []
  });
  const [loading, setLoading] = useState(true);
  const { periodType, dateRange, updatePeriod, setDateRange } = useDateRange('all');

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all checklists within date range with related data
      const { data: checklists, error: checklistError } = await query('checklist')
        .select(`
          *,
          motorista:motorista_id (nome),
          veiculo:veiculo_id (placa, marca, tipo),
          acessorios_veiculos!checklist_id(*),
          componentes_gerais!checklist_id(*),
          farol_veiculo!checklist_id(*),
          fluido_veiculo!checklist_id(*)
        `)
        .gte('data', dateRange.startDate)
        .lte('data', dateRange.endDate);

      if (checklistError) throw checklistError;

      if (checklists) {
        // Basic stats
        const totalMensal = checklists.filter(c => c.id_tipo_checklist === 1).length;
        const totalSemanal = checklists.filter(c => c.id_tipo_checklist === 2).length;
        const totalVerificados = checklists.filter(c => c.verificacao === true).length;
        const totalPendentes = checklists.filter(c => c.verificacao === false).length;

        // Process problems by category
        const problemasPorCategoria = processProblemasPorCategoria(checklists);
        
        // Process vehicles with problems
        const veiculosComProblemas = processVeiculosComProblemas(checklists);

        // Process checklists by motorista
        const checklistsPorMotorista = processChecklistsPorMotorista(checklists);

        setStats({
          totalChecklists: checklists.length,
          totalMensal,
          totalSemanal,
          totalVerificados,
          totalPendentes,
          totalProblemas: problemasPorCategoria.reduce((acc, cat) => acc + cat.total, 0),
          problemasPorCategoria,
          veiculosComProblemas,
          checklistsPorMotorista
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const processProblemasPorCategoria = (checklists: any[]) => {
    const categorias = {
      'Acessórios': 0,
      'Componentes': 0,
      'Iluminação': 0,
      'Fluidos': 0
    };

    let totalProblemas = 0;

    checklists.forEach(checklist => {
      // Check acessorios
      const acessorios = checklist.acessorios_veiculos?.[0];
      if (acessorios) {
        Object.entries(acessorios).forEach(([key, value]) => {
          if (!key.includes('id_') && value === 2) {
            categorias['Acessórios']++;
            totalProblemas++;
          }
        });
      }

      // Check componentes
      const componentes = checklist.componentes_gerais?.[0];
      if (componentes) {
        Object.entries(componentes).forEach(([key, value]) => {
          if (!key.includes('id_') && value === 2) {
            categorias['Componentes']++;
            totalProblemas++;
          }
        });
      }

      // Check iluminação
      const farol = checklist.farol_veiculo?.[0];
      if (farol) {
        Object.entries(farol).forEach(([key, value]) => {
          if (!key.includes('id_') && value === 2) {
            categorias['Iluminação']++;
            totalProblemas++;
          }
        });
      }

      // Check fluidos
      const fluidos = checklist.fluido_veiculo?.[0];
      if (fluidos) {
        Object.entries(fluidos).forEach(([key, value]) => {
          if (!key.includes('id_') && value === 2) {
            categorias['Fluidos']++;
            totalProblemas++;
          }
        });
      }
    });

    return Object.entries(categorias).map(([categoria, total]) => ({
      categoria,
      total,
      percentual: totalProblemas > 0 ? (total / totalProblemas) * 100 : 0
    }));
  };

  const processVeiculosComProblemas = (checklists: any[]) => {
    const veiculosMap = new Map();

    checklists.forEach(checklist => {
      const veiculo = checklist.veiculo;
      if (!veiculo) return;

      const problemas: any[] = [];

      // Check each section for problems
      const sections = {
        'Acessórios': checklist.acessorios_veiculos?.[0],
        'Componentes': checklist.componentes_gerais?.[0],
        'Iluminação': checklist.farol_veiculo?.[0],
        'Fluidos': checklist.fluido_veiculo?.[0]
      };

      Object.entries(sections).forEach(([categoria, section]) => {
        if (!section) return;

        Object.entries(section).forEach(([key, value]) => {
          if (!key.includes('id_') && value === 2) {
            problemas.push({
              categoria,
              item: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              status: 'Não OK'
            });
          }
        });
      });

      if (problemas.length > 0) {
        veiculosMap.set(veiculo.placa, {
          placa: veiculo.placa,
          marca: veiculo.marca,
          tipo: veiculo.tipo,
          problemas
        });
      }
    });

    return Array.from(veiculosMap.values());
  };

  const processChecklistsPorMotorista = (checklists: any[]) => {
    const motoristasMap = new Map();

    checklists.forEach(checklist => {
      const motorista = checklist.motorista;
      if (!motorista) return;

      const current = motoristasMap.get(motorista.nome) || {
        nome: motorista.nome,
        total: 0,
        verificados: 0,
        pendentes: 0
      };

      current.total++;
      if (checklist.verificacao === true) {
        current.verificados++;
      } else {
        current.pendentes++;
      }

      motoristasMap.set(motorista.nome, current);
    });

    return Array.from(motoristasMap.values())
      .sort((a, b) => b.total - a.total);
  };

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
        <PeriodSelector
          periodType={periodType}
          dateRange={dateRange}
          onPeriodChange={updatePeriod}
          onDateRangeChange={setDateRange}
        />
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="Total de Checklists"
          value={stats.totalChecklists}
          icon={FileText}
        />
        <StatCard
          title="Checklists Mensais"
          value={stats.totalMensal}
          icon={Calendar}
        />
        <StatCard
          title="Checklists Semanais"
          value={stats.totalSemanal}
          icon={FileText}
        />
        <StatCard
          title="Verificados"
          value={stats.totalVerificados}
          icon={CheckCircle2}
        />
        <StatCard
          title="Pendentes"
          value={stats.totalPendentes}
          icon={XCircle}
        />
        <StatCard
          title="Problemas"
          value={stats.totalProblemas}
          icon={AlertTriangle}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Problems by Category */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="text-blue-500 dark:text-blue-400" size={20} />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Problemas por Categoria
            </h3>
          </div>
          <div className="space-y-4">
            {stats.problemasPorCategoria.map((categoria, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {categoria.categoria}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {categoria.total} problemas
                  </span>
                </div>
                <div className="h-2 bg-blue-100 dark:bg-blue-900/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all duration-300"
                    style={{ width: `${categoria.percentual}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Checklists by Driver */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md">
          <div className="flex items-center gap-2 mb-6">
            <Users className="text-blue-500 dark:text-blue-400" size={20} />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Checklists por Motorista
            </h3>
          </div>
          <div className="space-y-6">
            {stats.checklistsPorMotorista.slice(0, 5).map((motorista, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {motorista.nome}
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Total: {motorista.total}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-gray-500 dark:text-gray-400">Verificados:</span>
                    <div className="flex-1 h-2 bg-green-100 dark:bg-green-900/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 dark:bg-green-400 rounded-full"
                        style={{ width: `${(motorista.verificados / motorista.total) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm">{motorista.verificados}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-gray-500 dark:text-gray-400">Pendentes:</span>
                    <div className="flex-1 h-2 bg-red-100 dark:bg-red-900/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 dark:bg-red-400 rounded-full"
                        style={{ width: `${(motorista.pendentes / motorista.total) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm">{motorista.pendentes}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicles with Problems */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md lg:col-span-2">
          <div className="flex items-center gap-2 mb-6">
            <Truck className="text-blue-500 dark:text-blue-400" size={20} />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Veículos com Problemas
            </h3>
          </div>
          <div className="space-y-6">
            {stats.veiculosComProblemas.map((veiculo, index) => (
              <div key={index} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {veiculo.placa} - {veiculo.marca} {veiculo.tipo}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {veiculo.problemas.length} {veiculo.problemas.length === 1 ? 'problema' : 'problemas'} encontrado{veiculo.problemas.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200">
                      Requer Atenção
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {veiculo.problemas.map((problema, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {problema.item}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {problema.categoria}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ 
  title, 
  value, 
  icon: Icon
}: { 
  title: string;
  value: number;
  icon: any;
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-md">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-4">
        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20">
          <Icon className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        </div>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <span className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </span>
    </div>
  );
};

export default ChecklistDashboard;