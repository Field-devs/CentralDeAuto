import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Upload, FileText, AlertCircle, Loader2, ChevronDown, ChevronUp, Plus, MapPin, ChevronRight, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { useCompanyData } from '../hooks/useCompanyData';
import type { Cliente } from '../types/database';
import toast from 'react-hot-toast';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';
import AddClienteModal from '../components/AddClienteModal';
import BulkDeleteConfirmationModal from '../components/BulkDeleteConfirmationModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { supabase } from '../lib/supabase';
import ScrollableTableIndicator from '../components/ScrollableTableIndicator';
import ContextMenu from '../components/ContextMenu';
import EditClienteModal from '../components/EditClienteModal';

interface ClienteWithAddress extends Cliente {
    isExpanded?: boolean;
    endereco?: {
        logradouro?: {
            logradouro?: string;
            nr_cep?: string;
            bairro?: {
                bairro?: string;
                cidade?: {
                    cidade?: string;
                    estado?: {
                        sigla_estado?: string;
                    };
                };
            };
        };
        nr_end?: number;
        ds_complemento_end?: string;
    } | null;
}

interface DeleteClienteModalProps {
    isOpen: boolean;
    onClose: () => void;
    cliente: Cliente | null;
    onConfirm: () => void;
}

const DeleteClienteModal = ({ isOpen, onClose, cliente, onConfirm }: DeleteClienteModalProps) => {
    if (!isOpen || !cliente) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertCircle className="text-red-500" size={20} />
                        Confirmar Exclusão
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 space-y-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                        Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md space-y-1.5">
                        {cliente && (
                            <>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Nome:</span> {cliente.nome}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">CNPJ:</span> {cliente.cnpj}
                                </p>
                                {cliente.email && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">Email:</span> {cliente.email}
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};

const Clientes = () => {
    const { query, companyId } = useCompanyData();
    const [clientes, setClientes] = useState<ClienteWithAddress[]>([]);
    const [allClientes, setAllClientes] = useState<ClienteWithAddress[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Cliente;
        direction: 'asc' | 'desc';
    }>({ key: 'nome', direction: 'asc' });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [contextMenu, setContextMenu] = useState<{
        visible: boolean;
        x: number;
        y: number;
        cliente: Cliente | null;
    }>({
        visible: false,
        x: 0,
        y: 0,
        cliente: null,
    });

    useEffect(() => {
        if (companyId) {
            fetchClientes();
        }
    }, [companyId]);

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

    const fetchClientes = async () => {
        if (!companyId) return;
        
        try {
            setLoading(true);
            const { data, error } = await query('cliente')
                .select('*')
                .eq('company_id', companyId);

            if (error) {
                throw error;
            }

            const clientesData = data || [];
            
            // Fetch addresses for each client
            const clientesWithAddress = await Promise.all(
                clientesData.map(async (cliente) => {
                    try {
                        const { data: enderecoData, error: enderecoError } = await supabase
                            .from('end_cliente')
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
                                                sigla_estado
                                            )
                                        )
                                    )
                                )
                            `)
                            .eq('cliente_id', cliente.cliente_id)
                            .maybeSingle();

                        if (enderecoError && enderecoError.code !== 'PGRST116') {
                            console.error('Error fetching address:', enderecoError);
                        }

                        return {
                            ...cliente,
                            isExpanded: false,
                            endereco: enderecoData || null
                        };
                    } catch (error) {
                        console.error('Error processing client address:', error);
                        return {
                            ...cliente,
                            isExpanded: false,
                            endereco: null
                        };
                    }
                })
            );

            setClientes(clientesWithAddress);
            setAllClientes(clientesWithAddress);
        } catch (error) {
            console.error('Error fetching clientes:', error);
            toast.error('Erro ao carregar clientes');
            setClientes([]);
            setAllClientes([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (cliente: Cliente) => {
        setSelectedCliente(cliente);
        setIsEditModalOpen(true);
    };

    const handleDelete = (cliente: Cliente) => {
        setSelectedCliente(cliente);
        setIsDeleteModalOpen(true);
    };
    
    const toggleExpand = (clienteId: number) => {
        setClientes(prevClientes => 
            prevClientes.map(cliente => 
                cliente.cliente_id === clienteId 
                    ? { ...cliente, isExpanded: !cliente.isExpanded } 
                    : cliente
            )
        );
    };

    const handleToggleStatus = async (cliente: Cliente) => {
        if (!companyId) return;
        
        try {
            setUpdatingStatus(cliente.cliente_id);
            const { error } = await query('cliente')
                .update({
                    st_cliente: !cliente.st_cliente
                })
                .eq('cliente_id', cliente.cliente_id)
                .eq('company_id', companyId);

            if (error) {
                console.error('Error updating client status:', error);
                toast.error('Erro ao atualizar status do cliente');
                return;
            }

            setClientes(prevClientes =>
                prevClientes.map(c =>
                    c.cliente_id === cliente.cliente_id ? { ...c, st_cliente: !cliente.st_cliente } : c
                ) 
            );

            toast.success(`Cliente ${!cliente.st_cliente ? 'ativado' : 'desativado'} com sucesso`);
        } catch (error) {
            console.error('Error updating client status:', error);
            toast.error('Erro ao atualizar status do cliente');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const confirmDelete = async () => {
        if (!selectedCliente || !companyId) return;

        try {
            const { error } = await query('cliente')
                .delete()
                .eq('cliente_id', selectedCliente.cliente_id)
                .eq('company_id', companyId);

            if (error) throw error;

            setClientes(clientes.filter(c => c.cliente_id !== selectedCliente.cliente_id));
            setAllClientes(allClientes.filter(c => c.cliente_id !== selectedCliente.cliente_id));
            toast.success('Cliente excluído com sucesso');
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting cliente:', error);
            toast.error('Erro ao excluir cliente');
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
        
        // Update selectAll state
        setSelectAll(newSelectedItems.size === allClientes.length);
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(allClientes.map(c => c.cliente_id)));
        }
        setSelectAll(!selectAll);
    };

    const handleBulkDelete = async () => {
        if (!companyId) return;
        
        try {
            // Delete all selected items
            for (const id of selectedItems) {
                const { error } = await query('cliente')
                    .delete()
                    .eq('cliente_id', id)
                    .eq('company_id', companyId);

                if (error) throw error;
            }

            // Update the list
            setClientes(clientes.filter(c => !selectedItems.has(c.cliente_id)));
            setAllClientes(allClientes.filter(c => !selectedItems.has(c.cliente_id)));
            toast.success(`${selectedItems.size} cliente${selectedItems.size !== 1 ? 's' : ''} excluído${selectedItems.size !== 1 ? 's' : ''} com sucesso`);
            
            // Reset selection
            setSelectedItems(new Set());
            setSelectAll(false);
            setIsBulkDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting clientes:', error);
            toast.error('Erro ao excluir clientes');
        }
    };

    const handleSort = (key: keyof Cliente) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleContextMenu = (e: React.MouseEvent, cliente: Cliente) => {
        e.preventDefault();
        setContextMenu({
            visible: true,
            x: e.clientX,
            y: e.clientY,
            cliente,
        });
    };

    const handleSearch = () => {
        if (!searchTerm.trim()) {
            setClientes(allClientes);
            return;
        }
        
        const searchString = searchTerm.toLowerCase();
        const filtered = allClientes.filter(cliente => {
            return (
                cliente.nome.toLowerCase().includes(searchString) ||
                cliente.cnpj.includes(searchString) ||
                (cliente.email && cliente.email.toLowerCase().includes(searchString)) ||
                (cliente.telefone && cliente.telefone?.toString().includes(searchString))
            );
        });
        
        setClientes(filtered);
    };

    const formatCNPJ = (cnpj: string | undefined | null) => {
        if (!cnpj) return '';
        const cleanedCNPJ = cnpj.replace(/\D/g, '');

        if (cleanedCNPJ.length !== 14) {
            return cnpj;
        }
        return cleanedCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

    const formatTelefone = (telefone: string | undefined | null) => {
        if (!telefone) return '';

        const cleanedTelefone = telefone.replace(/\D/g, '');

        if (cleanedTelefone.length < 10 || cleanedTelefone.length > 11) {
            return telefone;
        }

        return cleanedTelefone.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
    };

    const filteredClientes = clientes
        .sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === null && bValue === null) return 0;
            if (aValue === null) return 1;
            if (bValue === null) return -1;

            const aStr = String(aValue);
            const bStr = String(bValue);

            const comparison = aStr.localeCompare(bStr);
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        });

    const {
        currentPage,
        pageSize,
        totalPages,
        totalItems,
        paginatedData,
        handlePageChange,
        handlePageSizeChange
    } = usePagination({
        data: filteredClientes,
        initialPageSize: 10
    });

    if (loading) {
        return (
            <LoadingSpinner />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Clientes</h1>
                <div className="flex gap-2">
                    {selectedItems.size > 0 && (
                        <button
                            onClick={() => setIsBulkDeleteModalOpen(true)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                                    focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 
                                    transition-colors flex items-center gap-2"
                        >
                            <X size={16} />
                            Excluir Selecionados
                        </button>
                    )}
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
                                transition-colors flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Novo Cliente
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 relative">
                <div className="overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar por nome, CNPJ, email ou telefone..."
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
                            <svg
                                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 cursor-pointer"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                                onClick={handleSearch}
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="relative">
                        <div ref={tableContainerRef} className="overflow-x-auto w-full">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead>
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectAll}
                                                    onChange={handleSelectAll}
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                />
                                             </div>
                                        </th>
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer"
                                            onClick={() => handleSort('nome')}
                                        >
                                            <div className="flex items-center gap-2">
                                                Nome
                                                {sortConfig.key === 'nome' && (
                                                    sortConfig.direction === 'asc' ?
                                                        <ChevronUp className="w-4 h-4" /> :
                                                        <ChevronDown className="w-4 h-4" />
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            CNPJ
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Telefone
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Ações
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {paginatedData.map((cliente) => (
                                        <React.Fragment key={cliente.cliente_id}>
                                            <tr
                                                className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-opacity duration-200 cursor-pointer ${
                                                    selectedItems.has(cliente.cliente_id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                                }
                                                ${cliente.st_cliente ? 'opacity-100' : 'opacity-50'}`}
                                                onClick={() => toggleExpand(cliente.cliente_id)}
                                                onContextMenu={(e) => handleContextMenu(e, cliente)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedItems.has(cliente.cliente_id)}
                                                            onChange={() => handleSelectItem(cliente.cliente_id)}
                                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                            {cliente.nome}
                                                         </div>
                                                        <button 
                                                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleExpand(cliente.cliente_id);
                                                            }}
                                                        >
                                                            {cliente.isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {formatCNPJ(cliente.cnpj)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {cliente.email || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {cliente.telefone ? formatTelefone(cliente.telefone.toString()) : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleToggleStatus(cliente);
                                                        }}
                                                        disabled={updatingStatus === cliente.cliente_id}
                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                                            cliente.st_cliente 
                                                                ? 'bg-green-500 dark:bg-green-600' 
                                                                : 'bg-red-500 dark:bg-red-600'
                                                        } ${updatingStatus === cliente.cliente_id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        role="switch"
                                                        aria-checked={cliente.st_cliente}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                                cliente.st_cliente ? 'translate-x-5' : 'translate-x-0'
                                                            }`}
                                                        />
                                                        {updatingStatus === cliente.cliente_id && (
                                                            <Loader2 
                                                                className="absolute inset-0 m-auto w-4 h-4 text-white animate-spin" 
                                                            />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end space-x-3">
                                                        <button
                                                            onClick={() => handleEdit(cliente)}
                                                            className="text-yellow-500 hover:text-yellow-600 dark:text-yellow-400 dark:hover:text-yellow-300 transition-colors"
                                                            title="Editar"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>
                                                                <path d="m15 5 4 4"></path>
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(cliente)}
                                                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M3 6h18"></path>
                                                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                                <line x1="10" x2="10" y1="11" y2="17"></line>
                                                                <line x1="14" x2="14" y1="11" y2="17"></line>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            
                                            {/* Address Dropdown */}
                                            {cliente.isExpanded && (
                                                <tr className="bg-gray-50 dark:bg-gray-700/30">
                                                    <td colSpan={7} className="px-6 py-4">
                                                        <div className="flex items-start gap-3">
                                                            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                                            <div>
                                                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                                                                    Endereço
                                                                </h4>
                                                                {cliente.endereco ? (
                                                                    <div className="space-y-1">
                                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                            {cliente.endereco.logradouro?.logradouro}, {cliente.endereco.nr_end || 'S/N'}
                                                                            {cliente.endereco.ds_complemento_end && ` - ${cliente.endereco.ds_complemento_end}`}
                                                                        </p>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                            {cliente.endereco.logradouro?.bairro?.bairro} - {cliente.endereco.logradouro?.nr_cep}
                                                                        </p>
                                                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                                                            {cliente.endereco.logradouro?.bairro?.cidade?.cidade}/{cliente.endereco.logradouro?.bairro?.cidade?.estado?.sigla_estado}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                                        Nenhum endereço cadastrado
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
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
                    
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        pageSize={pageSize}
                        totalItems={totalItems}
                        onPageChange={handlePageChange}
                        onPageSizeChange={handlePageSizeChange}
                    />
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu.visible && contextMenu.cliente && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onClose={() => setContextMenu({ ...contextMenu, visible: false })}
                    actions={[
                        {
                            icon: <Edit2 size={16} />,
                            label: 'Editar Cliente',
                            onClick: () => handleEdit(contextMenu.cliente!),
                            color: 'text-yellow-500 dark:text-yellow-400'
                        },
                        {
                            icon: <Trash2 size={16} />,
                            label: 'Excluir Cliente',
                            onClick: () => handleDelete(contextMenu.cliente!),
                            color: 'text-red-600 dark:text-red-400'
                        },
                        {
                            icon: contextMenu.cliente!.st_cliente ? <X size={16} /> : <CheckCircle2 size={16} />,
                            label: contextMenu.cliente!.st_cliente ? 'Desativar Cliente' : 'Ativar Cliente',
                            onClick: () => handleToggleStatus(contextMenu.cliente!),
                            color: contextMenu.cliente!.st_cliente ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }
                    ]}
                />
            )}

            <EditClienteModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                cliente={selectedCliente}
                onSuccess={fetchClientes}
            />

            <DeleteClienteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                cliente={selectedCliente}
                onConfirm={confirmDelete}
            />

            <BulkDeleteConfirmationModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleBulkDelete}
                title="Confirmar Exclusão em Massa"
                message="Tem certeza que deseja excluir todos os clientes selecionados? Esta ação não pode ser desfeita."
                itemCount={selectedItems.size}
                itemType="cliente"
            />

            <AddClienteModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchClientes}
            />
        </div>
    );
};

export default Clientes;