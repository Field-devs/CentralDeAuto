import React, { useState, useEffect, useRef } from 'react';
import { FileText, Edit2, Trash2, Search, Phone, Filter, MapPin, Plus, Upload, MessageCircle, Users, Building2 } from 'lucide-react';
import { useCompanyData } from '../../hooks/useCompanyData';
import { supabase } from '../../lib/supabase';
import type { Motorista, Cliente, DocumentoMotorista } from '../../types/database';
import DocumentViewer from '../../components/DocumentViewer';
import EditMotoristaModal from '../../components/EditMotoristaModal';
import AddMotoristaModal from '../../components/AddMotoristaModal';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import { usePagination } from '../../hooks/usePagination';
import Pagination from '../../components/Pagination';
import { formatPhone, formatCPF, formatDate } from '../../utils/format';
import { useDateRange } from '../../hooks/useDateRange';
import PeriodSelector from '../../components/hodometros/PeriodSelector';
import BulkDeleteConfirmationModal from '../../components/BulkDeleteConfirmationModal';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import DocumentUploadModal from '../../components/DocumentUploadModal';
import ScrollableTableIndicator from '../../components/ScrollableTableIndicator';
import ContextMenu from '../../components/ContextMenu';
import { useFloatingChat } from '../../hooks/useFloatingChat';
import BulkActionsModal from '../../components/BulkActionsModal';

interface MotoristaWithAddress extends Motorista {
  cidade?: string;
  cidadeLowerCase?: string;
  estado?: string;
}

const MotoristasLista = () => {
  const { query, companyId } = useCompanyData();
  const { startChat } = useFloatingChat();
  const [motoristas, setMotoristas] = useState<MotoristaWithAddress[]>([]);
  const [allMotoristas, setAllMotoristas] = useState<MotoristaWithAddress[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [phoneSearch, setPhoneSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [wiseappAccountId, setWiseappAccountId] = useState<string | null>(null);
  const [cities, setCities] = useState<{ cidade: string; cidadeLowerCase: string; estado: { sigla_estado: string } }[]>([]);
  const [isDocumentViewerOpen, setIsDocumentViewerOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDocumentUploadModalOpen, setIsDocumentUploadModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
  const [isBulkClientModalOpen, setIsBulkClientModalOpen] = useState(false);
  const [selectedMotoristaEdit, setSelectedMotoristaEdit] = useState<Motorista | null>(null);
  const [selectedMotoristaDelete, setSelectedMotoristaDelete] = useState<Motorista | null>(null);
  const [selectedMotoristaUpload, setSelectedMotoristaUpload] = useState<Motorista | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  
  const [selectedDocumento, setSelectedDocumento] = useState<{
    documento: DocumentoMotorista | null;
    nome: string;
    cpf?: string;
    email?: string;
    telefone?: string;
    dt_nascimento?: string;
    endereco: any;
    st_cadastro?: string;
  }>({ documento: null, nome: '', endereco: null });
  
  const { periodType, dateRange, updatePeriod, setDateRange } = useDateRange('all');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    motorista: Motorista | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    motorista: null,
  });

  useEffect(() => {
    fetchClientes();
    fetchCities();
    fetchWiseappAccountId();
  }, []);

  useEffect(() => {
    fetchMotoristas();
  }, [currentPage, pageSize, dateRange]);

  useEffect(() => {
    // Close context menu when clicking anywhere
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu({ ...contextMenu, visible: false });
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [contextMenu.visible]);

  const fetchWiseappAccountId = async () => {
    try {
      const { data, error } = await supabase
        .from('company')
        .select('id_conta_wiseapp')
        .eq('company_id', companyId)
        .single();

      if (error) {
        console.error('Error fetching WiseApp account ID:', error);
        return;
      }

      if (data && data.id_conta_wiseapp) {
        setWiseappAccountId(data.id_conta_wiseapp);
      }
    } catch (error) {
      console.error('Error fetching WiseApp account ID:', error);
    }
  };

  const fetchMotoristas = async () => {
    try {
      setLoading(true);
      
      // Calculate pagination parameters
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      
      // First, get the total count with filters but without pagination
      let countQuery = supabase
        .from('motorista')
        .select('motorista_id', { count: 'exact', head: true })
        .eq('funcao', 'Motorista');
      
      // Apply filters to count query
      if (searchTerm) {
        countQuery = countQuery.or(`nome.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
      }
      
      if (phoneSearch) {
        // Convert phoneSearch to string to avoid numeric comparison issues
        countQuery = countQuery.filter('telefone', 'ilike', `%${phoneSearch}%`);
      }
      
      if (selectedStatus) {
        countQuery = countQuery.eq('st_cadastro', selectedStatus);
      }
      
      if (dateRange.startDate && dateRange.endDate) {
        countQuery = countQuery
          .gte('data_cadastro', dateRange.startDate)
          .lte('data_cadastro', dateRange.endDate);
      }
      
      const { count, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalCount(count || 0);
      setTotalPages(Math.max(1, Math.ceil((count || 0) / pageSize)));
      
      // Then fetch the paginated data with all needed relations
      let dataQuery = supabase
        .from('motorista')
        .select(`
          *,
          end_motorista (
            logradouro (
              bairro (
                cidade (
                  cidade,
                  estado (
                    sigla_estado
                  )
                )
              )
            )
          ),
          documento_motorista (*)
        `)
        .eq('funcao', 'Motorista');
      
      // Apply the same filters to data query
      if (searchTerm) {
        dataQuery = dataQuery.or(`nome.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`);
      }
      
      if (phoneSearch) {
        // Convert phoneSearch to string to avoid numeric comparison issues
        dataQuery = dataQuery.filter('telefone', 'ilike', `%${phoneSearch}%`);
      }
      
      if (selectedStatus) {
        dataQuery = dataQuery.eq('st_cadastro', selectedStatus);
      }
      
      if (dateRange.startDate && dateRange.endDate) {
        dataQuery = dataQuery
          .gte('data_cadastro', dateRange.startDate)
          .lte('data_cadastro', dateRange.endDate);
      }
      
      // Apply city filter if selected (case-insensitive)
      if (selectedCity) {
        // We need to handle this filter in JavaScript since we can't do case-insensitive filtering on nested fields
        // We'll fetch all results and filter them later
      }
      
      // Apply pagination and ordering
      dataQuery = dataQuery
        .order('data_cadastro', { ascending: false })
        .range(from, to);
      
      const { data: motoristasData, error: motoristasError } = await dataQuery;

      if (motoristasError) {
        throw new Error(`Error fetching motoristas: ${motoristasError.message}`);
      }

      if (!motoristasData) {
        setMotoristas([]);
        setAllMotoristas([]);
        return;
      }

      // Process and format the data
      const motoristasWithCity = motoristasData.map(motorista => {
        const cidade = motorista.end_motorista?.[0]?.logradouro?.bairro?.cidade?.cidade || 'Não informada';
        return {
          ...motorista,
          cidade,
          cidadeLowerCase: cidade.toLowerCase(),
          estado: motorista.end_motorista?.[0]?.logradouro?.bairro?.cidade?.estado?.sigla_estado || ''
        };
      });
      
      // Apply city filter if needed (case-insensitive)
      const filteredMotoristas = selectedCity 
        ? motoristasWithCity.filter(m => m.cidadeLowerCase === selectedCity.toLowerCase())
        : motoristasWithCity;

      setMotoristas(filteredMotoristas);
      
      // Fetch all motoristas for select all functionality
      const { data: allData } = await supabase
        .from('motorista')
        .select('motorista_id')
        .eq('funcao', 'Motorista');
        
      if (allData) {
        setAllMotoristas(allData as MotoristaWithAddress[]);
      }
    } catch (error) {
      console.error('Error fetching motoristas:', error);
      toast.error('Erro ao carregar motoristas');
      setMotoristas([]);
      setAllMotoristas([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await query('cliente')
        .select('*')
        .eq('st_cliente', true)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
      toast.error('Erro ao carregar clientes');
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cidade')
        .select(`
          cidade,
          estado (
            sigla_estado
          )
        `)
        .order('cidade');

      if (error) throw error;
      
      // Process cities to handle case-insensitive matching
      const uniqueCities = new Map<string, { cidade: string; estado: { sigla_estado: string } }>();
      
      data?.forEach(city => {
        const lowerCaseCity = city.cidade.toLowerCase();
        // If we already have this city (case-insensitive), keep the first occurrence
        if (!uniqueCities.has(lowerCaseCity)) {
          uniqueCities.set(lowerCaseCity, city);
        }
      });
      
      // Convert map to array with lowercase keys for filtering
      const processedCities = Array.from(uniqueCities.entries()).map(([lowerCase, city]) => ({
        ...city,
        cidadeLowerCase: lowerCase
      }));
      
      setCities(processedCities);
    } catch (error) {
      console.error('Error fetching cities:', error);
      toast.error('Erro ao carregar cidades');
    }
  };

  const handleStartChat = (motorista: Motorista) => {
    if (motorista.telefone) {
      startChat(motorista.telefone.toString());
    } else {
      toast.error('Este motorista não possui telefone cadastrado');
    }
  };

  const renderPhoneLink = (motorista: Motorista) => {
    const phoneNumber = motorista.telefone ? formatPhone(motorista.telefone.toString()) : '-';

    // If no conversation_id, just show the phone number without the "Sem conversa" text
    if (!motorista.conversation_id) {
      return (
        <div className="text-sm text-gray-900 dark:text-white">
          {phoneNumber}
        </div>
      );
    }

    if (!wiseappAccountId) {
      return (
        <div className="text-sm text-gray-900 dark:text-white">
          {phoneNumber}
          <span className="ml-1 text-xs text-red-500" title="WiseApp Account ID não disponível">
            (Conta WiseApp não configurada)
          </span>
        </div>
      );
    }

    const wiseappUrl = `https://chat.wiseapp360.com/app/accounts/${wiseappAccountId}/conversations/${motorista.conversation_id}`;

    return (
      <a 
        href={wiseappUrl} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
      >
        {phoneNumber}
      </a>
    );
  };

  const handleViewDocument = async (motorista: Motorista) => {
    try {
      setSelectedDocumento({
        documento: null,
        nome: motorista.nome,
        cpf: motorista.cpf,
        email: motorista.email,
        telefone: motorista.telefone?.toString(),
        dt_nascimento: motorista.dt_nascimento,
        endereco: null,
        st_cadastro: motorista.st_cadastro
      });
      
      setIsDocumentViewerOpen(true);

      // Fetch documento_motorista
      const { data: documentoData, error: documentoError } = await supabase
        .from('documento_motorista')
        .select('*')
        .eq('motorista_id', motorista.motorista_id)
        .maybeSingle();

      if (documentoError && documentoError.code !== 'PGRST116') {
        throw documentoError;
      }

      // Fetch endereco
      const { data: enderecoData, error: enderecoError } = await supabase
        .from('end_motorista')
        .select(`
          nr_end,
          ds_complemento_end,
          logradouro (
            logradouro,
            nr_cep,
            bairro (
              bairro,
              cidade (
                cidade,
                estado (
                  estado,
                  sigla_estado
                )
              )
            )
          )
        `)
        .eq('id_motorista', motorista.motorista_id)
        .maybeSingle();

      if (enderecoError && enderecoError.code !== 'PGRST116') {
        throw enderecoError;
      }

      setSelectedDocumento({
        documento: documentoData || null,
        nome: motorista.nome,
        cpf: motorista.cpf,
        email: motorista.email,
        telefone: motorista.telefone?.toString(),
        dt_nascimento: motorista.dt_nascimento,
        endereco: enderecoData || null,
        st_cadastro: motorista.st_cadastro
      });
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast.error('Erro ao carregar documentos');
      setIsDocumentViewerOpen(false);
    }
  };

  const handleUploadDocuments = (motorista: Motorista) => {
    setSelectedMotoristaUpload(motorista);
    setIsDocumentUploadModalOpen(true);
  };

  const handleEdit = (motorista: Motorista) => {
    setSelectedMotoristaEdit(motorista);
    setIsEditModalOpen(true);
  };

  const handleDelete = (motorista: Motorista) => {
    setSelectedMotoristaDelete(motorista);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedMotoristaDelete) return;

    try {
      const { error } = await query('motorista')
        .delete()
        .eq('motorista_id', selectedMotoristaDelete.motorista_id);

      if (error) throw error;

      setMotoristas(motoristas.filter(m => m.motorista_id !== selectedMotoristaDelete.motorista_id));
      setAllMotoristas(allMotoristas.filter(m => m.motorista_id !== selectedMotoristaDelete.motorista_id));
      toast.success('Motorista excluído com sucesso');
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting motorista:', error);
      toast.error('Erro ao excluir motorista');
    }
  };

  const handleSelectItem = (id: number) => {
    const newSelectedItems = new Set(selectedItems);
    if (selectedItems.has(id)) {
      newSelectedItems.delete(id);
    } else {
      newSelectedItems.add(id);
    }
    setSelectedItems(newSelectedItems);
    
    // Update selectAll state based on all motoristas, not just the current page
    setSelectAll(newSelectedItems.size === allMotoristas.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems(new Set());
    } else {
      // Select ALL motoristas, not just the ones on the current page
      setSelectedItems(new Set(allMotoristas.map(m => m.motorista_id)));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    try {
      // Delete all selected items
      for (const id of selectedItems) {
        const { error } = await query('motorista')
          .delete()
          .eq('motorista_id', id);

        if (error) throw error;
      }

      // Update the list
      setMotoristas(motoristas.filter(m => !selectedItems.has(m.motorista_id)));
      setAllMotoristas(allMotoristas.filter(m => !selectedItems.has(m.motorista_id)));
      toast.success(`${selectedItems.size} motorista${selectedItems.size !== 1 ? 's' : ''} excluído${selectedItems.size !== 1 ? 's' : ''} com sucesso`);
      
      // Reset selection
      setSelectedItems(new Set());
      setSelectAll(false);
      setIsBulkDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting motoristas:', error);
      toast.error('Erro ao excluir motoristas');
    }
  };

  const handleContextMenu = (e: React.MouseEvent, motorista: Motorista) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      motorista,
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  const handleSearch = () => {
    // Apply search filters and reset to page 1
    setCurrentPage(1);
    fetchMotoristas();
  };

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'cadastrado', label: 'Cadastrado' },
    { value: 'qualificado', label: 'Qualificado' },
    { value: 'documentacao', label: 'Documentação' },
    { value: 'contrato_enviado', label: 'Contrato Enviado' },
    { value: 'contratado', label: 'Contratado' },
    { value: 'repescagem', label: 'Repescagem' },
    { value: 'rejeitado', label: 'Rejeitado' }
  ];

  const getStatusStyle = (status: string) => {
    const baseStyle = "px-3 py-1 rounded-full text-sm font-medium";
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'cadastrado':
        return `${baseStyle} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case 'qualificado':
        return `${baseStyle} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`;
      case 'documentacao':
        return `${baseStyle} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'contrato_enviado':
        return `${baseStyle} bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200`;
      case 'contratado':
        return `${baseStyle} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'repescagem':
        return `${baseStyle} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`;
      case 'rejeitado':
        return `${baseStyle} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      default:
        return baseStyle;
    }
  };

  const updateStatus = async (motorista_id: number, newStatus: string) => {
    try {
      const { error } = await query('motorista')
        .update({ st_cadastro: newStatus })
        .eq('motorista_id', motorista_id);

      if (error) throw error;

      setMotoristas(motoristas.map(m => 
        m.motorista_id === motorista_id ? { ...m, st_cadastro: newStatus } : m
      ));
      
      toast.success('Status atualizado com sucesso');
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  };

  const updateCliente = async (motorista_id: number, cliente_id: number | null) => {
    try {
      const { error } = await query('motorista')
        .update({ cliente_id })
        .eq('motorista_id', motorista_id);

      if (error) throw error;

      setMotoristas(motoristas.map(m => 
        m.motorista_id === motorista_id ? { ...m, cliente_id } : m
      ));
      
      toast.success('Cliente atualizado com sucesso');
    } catch (err) {
      toast.error('Erro ao atualizar cliente');
    }
  };

  if (loading) {
    return (
      <LoadingSpinner />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          {selectedItems.size > 0 && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 rounded-full text-sm">
              {selectedItems.size} selecionado{selectedItems.size !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {selectedItems.size > 0 && (
            <>
              <button
                onClick={() => setIsBulkStatusModalOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                        transition-colors flex items-center gap-2"
              >
                <Users className="w-5 h-5" />
                Alterar Status
              </button>
              <button
                onClick={() => setIsBulkClientModalOpen(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                        focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 
                        transition-colors flex items-center gap-2"
              >
                <Building2 className="w-5 h-5" />
                Alterar Cliente
              </button>
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 
                        transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Excluir Selecionados
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 
                       dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 
                       focus:border-blue-500 text-gray-900 dark:text-gray-100"
            />
            <Search 
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 cursor-pointer" 
              onClick={handleSearch}
            />
          </div>

          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar por telefone..."
              value={phoneSearch}
              onChange={(e) => setPhoneSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 
                       dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 
                       focus:border-blue-500 text-gray-900 dark:text-gray-100"
            />
            <Phone 
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 cursor-pointer" 
              onClick={handleSearch}
            />
          </div>

          <div className="relative flex-1">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1); // Reset to first page on filter change
                handleSearch();
              }}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 
                       dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 
                       focus:border-blue-500 text-gray-900 dark:text-gray-100 appearance-none"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Filter className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="relative flex-1">
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setCurrentPage(1); // Reset to first page on filter change
                handleSearch();
              }}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 
                       dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 
                       focus:border-blue-500 text-gray-900 dark:text-gray-100 appearance-none"
            >
              <option value="">Todas as cidades</option>
              {cities.map((city, index) => (
                <option key={index} value={city.cidadeLowerCase}>
                  {city.cidade} ({city.estado.sigla_estado})
                </option>
              ))}
            </select>
            <MapPin className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="h-[42px] w-[42px] bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                       transition-colors flex items-center justify-center"
              title="Adicionar Motorista"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <PeriodSelector
            periodType={periodType}
            dateRange={dateRange}
            onPeriodChange={updatePeriod}
            onDateRangeChange={(newRange) => {
              setDateRange(newRange);
              setCurrentPage(1); // Reset to first page when date range changes
              // Don't call fetchMotoristas here as it will be triggered by the useEffect
            }}
          />
        </div>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
        <div className="overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedItems.size > 0 ? `${selectedItems.size} selecionado${selectedItems.size !== 1 ? 's' : ''}` : 'Selecionar todos'}
              </span>
            </div>
          </div>
          
          <div className="relative">
            <div ref={tableContainerRef} className="overflow-x-auto w-full">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">CPF</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Cidade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Contato</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Cadastro</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {motoristas.map((motorista) => (
                    <tr 
                      key={motorista.motorista_id} 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        selectedItems.has(motorista.motorista_id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onContextMenu={(e) => handleContextMenu(e, motorista)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(motorista.motorista_id)}
                          onChange={() => handleSelectItem(motorista.motorista_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
                              {motorista.nome.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {motorista.nome}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {formatCPF(motorista.cpf)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">{motorista.cidade}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{motorista.estado}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <select
                          value={motorista.st_cadastro}
                          onChange={(e) => updateStatus(motorista.motorista_id, e.target.value)}
                          className={getStatusStyle(motorista.st_cadastro)}
                        >
                          {statusOptions.slice(1).map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {motorista.st_cadastro === 'contratado' ? (
                          <select
                            value={motorista.cliente_id || ''}
                            onChange={(e) => updateCliente(motorista.motorista_id, e.target.value ? Number(e.target.value) : null)}
                            className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          >
                            <option value="">Sem cliente</option>
                            {clientes.map(cliente => (
                              <option key={cliente.cliente_id} value={cliente.cliente_id}>
                                {cliente.nome}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-3 py-1 bg-blue-500 text-white rounded-full text-sm inline-block">
                            {motorista.cliente_id ? 
                              clientes.find(c => c.cliente_id === motorista.cliente_id)?.nome || 'Cliente não encontrado'
                              : 'Sem cliente'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {renderPhoneLink(motorista)}
                          {motorista.telefone && (
                            <button 
                              onClick={() => handleStartChat(motorista)}
                              className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              title="Iniciar chat"
                            >
                              <MessageCircle size={16} />
                            </button>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {motorista.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200">
                        {formatDate(motorista.data_cadastro)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-3">
                          <button 
                            onClick={() => handleViewDocument(motorista)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            title="Visualizar Documentos - Visualize CNH, comprovante de residência e outros documentos do motorista"
                          >
                            <FileText size={18} />
                          </button>
                          
                          <button 
                            onClick={() => handleUploadDocuments(motorista)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                            title="Enviar Documentos - Faça upload de CNH, comprovante de residência e outros documentos"
                          >
                            <Upload size={18} />
                          </button>
                          
                          <button 
                            onClick={() => handleEdit(motorista)}
                            className="text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors"
                            title="Editar Dados do Motorista - Altere informações pessoais, contato e status"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(motorista)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                            title="Excluir Motorista - Remove permanentemente o motorista e todos seus dados"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Scroll indicators */}
            <ScrollableTableIndicator 
              containerRef={tableContainerRef} 
              className="mr-2 ml-2"
            />
          </div>

          {/* Custom Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-0">
              <span>
                Mostrando <span className="font-medium">{Math.min((currentPage - 1) * pageSize + 1, totalCount)}</span> a{' '}
                <span className="font-medium">{Math.min(currentPage * pageSize, totalCount)}</span> de{' '}
                <span className="font-medium">{totalCount}</span> resultados
              </span>
              
              <div className="ml-4">
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value={10}>10 por página</option>
                  <option value={25}>25 por página</option>
                  <option value={50}>50 por página</option>
                  <option value={100}>100 por página</option>
                  <option value={250}>250 por página</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Anterior
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Calculate page numbers to show (always show 5 pages if possible)
                let pageNum;
                if (totalPages <= 5) {
                  // If 5 or fewer pages, show all
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  // If near the start, show first 5 pages
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  // If near the end, show last 5 pages
                  pageNum = totalPages - 4 + i;
                } else {
                  // Otherwise show 2 before and 2 after current page
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm font-medium rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white border border-blue-600 dark:bg-blue-700 dark:border-blue-700'
                        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Próximo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.motorista && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
          actions={[
            {
              icon: <FileText size={16} />,
              label: 'Ver Documentos',
              onClick: () => handleViewDocument(contextMenu.motorista!),
              color: 'text-blue-600 dark:text-blue-400'
            },
            {
              icon: <MessageCircle size={16} />,
              label: 'Iniciar Chat',
              onClick: () => handleStartChat(contextMenu.motorista!),
              color: 'text-blue-600 dark:text-blue-400',
              disabled: !contextMenu.motorista?.telefone
            },
            {
              icon: <Upload size={16} />,
              label: 'Enviar Documentos',
              onClick: () => handleUploadDocuments(contextMenu.motorista!),
              color: 'text-green-600 dark:text-green-400'
            },
            {
              icon: <Edit2 size={16} />,
              label: 'Editar Motorista',
              onClick: () => handleEdit(contextMenu.motorista!),
              color: 'text-yellow-500 dark:text-yellow-400'
            },
            {
              icon: <Trash2 size={16} />,
              label: 'Excluir Motorista',
              onClick: () => handleDelete(contextMenu.motorista!),
              color: 'text-red-600 dark:text-red-400'
            }
          ]}
        />
      )}

      <BulkDeleteConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleBulkDelete}
        title="Confirmar Exclusão em Massa"
        message="Tem certeza que deseja excluir todos os motoristas selecionados? Esta ação não pode ser desfeita."
        itemCount={selectedItems.size}
        itemType="motorista"
      />

      <BulkActionsModal
        isOpen={isBulkStatusModalOpen}
        onClose={() => setIsBulkStatusModalOpen(false)}
        selectedItems={selectedItems}
        actionType="status"
        onSuccess={fetchMotoristas}
      />

      <BulkActionsModal
        isOpen={isBulkClientModalOpen}
        onClose={() => setIsBulkClientModalOpen(false)}
        selectedItems={selectedItems}
        actionType="client"
        onSuccess={fetchMotoristas}
        clientes={clientes}
      />

      <DocumentViewer
        isOpen={isDocumentViewerOpen}
        onClose={() => setIsDocumentViewerOpen(false)}
        documento={selectedDocumento.documento}
        nome={selectedDocumento.nome}
        cpf={selectedDocumento.cpf}
        email={selectedDocumento.email}
        telefone={selectedDocumento.telefone}
        dt_nascimento={selectedDocumento.dt_nascimento}
        endereco={selectedDocumento.endereco}
        isAgregado={false}
        st_cadastro={selectedDocumento.st_cadastro}
      />

      <EditMotoristaModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        motorista={selectedMotoristaEdit}
        onUpdate={fetchMotoristas}
      />

      <AddMotoristaModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchMotoristas}
      />

      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este motorista? Esta ação não pode ser desfeita."
        itemData={selectedMotoristaDelete ? [
          { label: "Nome", value: selectedMotoristaDelete.nome },
          { label: "CPF", value: formatCPF(selectedMotoristaDelete.cpf) },
          { label: "Email", value: selectedMotoristaDelete.email || 'Não informado' },
          { label: "Cadastro", value: formatDate(selectedMotoristaDelete.data_cadastro) }
        ] : []}
      />

      <DocumentUploadModal
        isOpen={isDocumentUploadModalOpen}
        onClose={() => setIsDocumentUploadModalOpen(false)}
        motorista_id={selectedMotoristaUpload?.motorista_id || 0}
        nome={selectedMotoristaUpload?.nome || ''}
        onUploadSuccess={fetchMotoristas}
      />
    </div>
  );
};

export default MotoristasLista;