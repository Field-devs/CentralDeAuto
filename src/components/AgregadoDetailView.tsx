import React, { useState } from 'react';
import { X, Truck, User, MapPin, Phone, Mail, Calendar, CreditCard, FileText, Info, Camera, CheckCircle2, XCircle, ExternalLink, Edit2, Home } from 'lucide-react';
import type { DocumentoMotorista, Veiculo, DocumentoVeiculo, Motorista } from '../types/database';
import { formatCPF, formatPhone, formatDate, formatCEP } from '../utils/format';
import DocumentoMotoristaForm from './DocumentoMotoristaForm';
import DocumentUploader from './DocumentUploader';
import toast from 'react-hot-toast';

interface AgregadoDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  agregado?: Motorista | null;
  documento: DocumentoMotorista | null;
  veiculo: (Veiculo & {
    documento_veiculo: DocumentoVeiculo[];
  }) | null;
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

const AgregadoDetailView: React.FC<AgregadoDetailViewProps> = ({
  isOpen,
  onClose,
  agregado,
  documento,
  veiculo,
  endereco
}) => {
  const [isEditingDocuments, setIsEditingDocuments] = useState(false);
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false);

  if (!isOpen || !agregado) return null;

  // Ensure we have the agregado data
  const nome = agregado.nome || '';
  const cpf = agregado.cpf || '';
  const status = agregado.st_cadastro || '';

  const openDocumentInNewTab = (url: string | null) => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const isPdf = (url: string | null) => url?.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      {/* Modal Container */}
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="relative bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <div className="p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {nome}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Agregado • {formatCPF(cpf)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Grid Layout for Motorista and Vehicle Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Motorista Info */}
                <div className="space-y-6">
                  {/* Informações Pessoais */}
                  <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-gray-400" />
                      Informações Pessoais
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {agregado.nome}
                          </div>
                        </div>
                        
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">CPF</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {formatCPF(agregado.cpf)}
                          </div>
                        </div>
                        
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Nascimento</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {agregado.dt_nascimento ? formatDate(agregado.dt_nascimento) : 'Não informada'}
                          </div>
                        </div>
                        
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</div>
                          <div className="text-base text-gray-900 dark:text-white break-words capitalize">
                            {agregado.st_cadastro.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Telefone</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {agregado.telefone ? formatPhone(agregado.telefone.toString()) : 'Não informado'}
                          </div>
                        </div>
                        
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {agregado.email || 'Não informado'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                  
                  {/* Endereço */}
                  <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      Endereço
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Logradouro</div>
                        <div className="text-base text-gray-900 dark:text-white break-words">
                          {endereco?.logradouro?.logradouro ? 
                            `${endereco.logradouro.logradouro}, ${endereco.nr_end || 'S/N'}` : 
                            'Não informado'
                          }
                        </div>
                      </div>
                      
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Complemento</div>
                        <div className="text-base text-gray-900 dark:text-white break-words">
                          {endereco?.ds_complemento_end || 'Não informado'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Bairro</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {endereco?.logradouro?.bairro?.bairro || 'Não informado'}
                          </div>
                        </div>
                        
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">CEP</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {endereco?.logradouro?.nr_cep ? formatCEP(endereco.logradouro.nr_cep) : 'Não informado'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Cidade</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {endereco?.logradouro?.bairro?.cidade?.cidade || 'Não informada'}
                          </div>
                        </div>
                        
                        <div className="overflow-hidden">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Estado</div>
                          <div className="text-base text-gray-900 dark:text-white break-words">
                            {endereco?.logradouro?.bairro?.cidade?.estado?.sigla_estado || 'Não informado'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                  
                  {/* CNH */}
                  <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                        Informações da CNH
                      </h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsEditingDocuments(true)}
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Editar documentos"
                        >
                          <Edit2 size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Número da CNH</div>
                        <div className="text-base text-gray-900 dark:text-white break-words">
                          {documento?.nr_registro_cnh || 'Não informado'}
                        </div>
                      </div>
                      
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Categoria</div>
                        <div className="text-base text-gray-900 dark:text-white break-words">
                          {documento?.categoria_cnh || 'Não informada'}
                        </div>
                      </div>
                      
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Validade</div>
                        <div className="text-base text-gray-900 dark:text-white break-words">
                          {documento?.validade_cnh ? formatDate(documento.validade_cnh) : 'Não informada'}
                        </div>
                      </div>
                      
                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome da Mãe</div>
                        <div className="text-base text-gray-900 dark:text-white break-words">
                          {documento?.nome_mae || 'Não informado'}
                        </div>
                      </div>

                      <div className="overflow-hidden">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome do Pai</div>
                        <div className="text-base text-gray-900 dark:text-white break-words">
                          {documento?.nome_pai || 'Não informado'}
                        </div>
                      </div>
                    </div>

                    {/* CNH Document */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">CNH Digital</div>
                        {documento?.foto_cnh && (
                          <button
                            onClick={() => openDocumentInNewTab(documento.foto_cnh)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-xs"
                          >
                            <ExternalLink size={14} />
                            Abrir em nova aba
                          </button>
                        )}
                      </div>
                      
                      {documento?.foto_cnh ? (
                        <div className="relative aspect-[1.414] w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          {isPdf(documento.foto_cnh) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <FileText className="w-12 h-12 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 mb-4">Documento PDF</p>
                              <button
                                onClick={() => openDocumentInNewTab(documento.foto_cnh)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                              >
                                <ExternalLink size={16} />
                                Abrir PDF
                              </button>
                            </div>
                          ) : (
                            <img
                              src={documento.foto_cnh}
                              alt="CNH"
                              className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                              onClick={() => openDocumentInNewTab(documento.foto_cnh)}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[1.414] w-full flex flex-col items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Camera className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                          <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400 font-medium">CNH não cadastrada</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                              Faça o upload da CNH para visualizá-la aqui
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                {/* Right Column - Vehicle Info */}
                <div className="space-y-6">
                  {/* Informações do Veículo */}
                  <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Truck className="w-5 h-5 text-gray-400" />
                      Informações do Veículo
                    </h3>
                    
                    {veiculo ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Placa</div>
                            <div className="text-base text-gray-900 dark:text-white uppercase font-medium break-words">
                              {veiculo.placa}
                            </div>
                          </div>
                          
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Marca/Modelo</div>
                            <div className="text-base text-gray-900 dark:text-white break-words">
                              {veiculo.marca} {veiculo.tipo}
                            </div>
                          </div>
                          
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Ano</div>
                            <div className="text-base text-gray-900 dark:text-white break-words">
                              {veiculo.ano || 'Não informado'}
                            </div>
                          </div>
                          
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Cor</div>
                            <div className="text-base text-gray-900 dark:text-white break-words">
                              {veiculo.cor || 'Não informada'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipologia</div>
                            <div className="text-base text-gray-900 dark:text-white uppercase break-words">
                              {veiculo.tipologia || 'Não informada'}
                            </div>
                          </div>
                          
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Combustível</div>
                            <div className="text-base text-gray-900 dark:text-white break-words">
                              {veiculo.combustivel || 'Não informado'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Peso</div>
                            <div className="text-base text-gray-900 dark:text-white break-words">
                              {veiculo.peso ? `${veiculo.peso} kg` : 'Não informado'}
                            </div>
                          </div>
                          
                          <div className="overflow-hidden">
                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Cubagem</div>
                            <div className="text-base text-gray-900 dark:text-white break-words">
                              {veiculo.cubagem ? `${veiculo.cubagem} m³` : 'Não informada'}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Rastreador</div>
                          <div className="flex items-center gap-2 mt-1">
                            {veiculo.possui_rastreador ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-base text-gray-900 dark:text-white">
                                  Instalado - {veiculo.marca_rastreador || 'Marca não informada'}
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-base text-gray-900 dark:text-white">
                                  Não instalado
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8">
                        <Truck className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-center">
                          Nenhum veículo associado a este agregado
                        </p>
                      </div>
                    )}
                  </section>
                  
                  {/* Documentação do Veículo */}
                  {veiculo && (
                    <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <FileText className="w-5 h-5 text-gray-400" />
                          Documentação do Veículo
                        </h3>
                        {veiculo.documento_veiculo?.[0]?.foto_crv && (
                          <button
                            onClick={() => openDocumentInNewTab(veiculo.documento_veiculo[0].foto_crv)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm"
                          >
                            <ExternalLink size={16} />
                            Abrir em nova aba
                          </button>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        {/* CRV Document */}
                        <div className="mt-4">
                          <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">CRV Digital</div>
                          {veiculo.documento_veiculo?.[0]?.foto_crv ? (
                            <div className="relative aspect-[1.414] w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                              {isPdf(veiculo.documento_veiculo[0].foto_crv) ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <FileText className="w-12 h-12 text-gray-400 mb-2" />
                                  <p className="text-sm text-gray-500 mb-4">Documento PDF</p>
                                  <button
                                    onClick={() => openDocumentInNewTab(veiculo.documento_veiculo[0].foto_crv)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                                  >
                                    <ExternalLink size={16} />
                                    Abrir PDF
                                  </button>
                                </div>
                              ) : (
                                <img
                                  src={veiculo.documento_veiculo[0].foto_crv}
                                  alt="CRV do veículo"
                                  className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                                  onClick={() => openDocumentInNewTab(veiculo.documento_veiculo[0].foto_crv)}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="aspect-[1.414] w-full flex flex-col items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                              <Camera className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                              <div className="text-center">
                                <p className="text-gray-500 dark:text-gray-400 font-medium">CRV não cadastrado</p>
                                <p className="text-sm text-gray-400 dark:text-gray-500">
                                  Faça o upload do CRV para visualizá-lo aqui
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </section>
                  )}
                  
                  {/* Comprovante de Residência */}
                  <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Home className="w-5 h-5 text-gray-400" />
                        Comprovante de Residência
                      </h3>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Comprovante Digital</div>
                        {documento?.foto_comprovante_residencia && (
                          <button
                            onClick={() => openDocumentInNewTab(documento.foto_comprovante_residencia)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-xs"
                          >
                            <ExternalLink size={14} />
                            Abrir em nova aba
                          </button>
                        )}
                      </div>
                      
                      {documento?.foto_comprovante_residencia ? (
                        <div className="relative aspect-[1.414] w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                          {isPdf(documento.foto_comprovante_residencia) ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <FileText className="w-12 h-12 text-gray-400 mb-2" />
                              <p className="text-sm text-gray-500 mb-4">Documento PDF</p>
                              <button
                                onClick={() => openDocumentInNewTab(documento.foto_comprovante_residencia)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm flex items-center gap-2"
                              >
                                <ExternalLink size={16} />
                                Abrir PDF
                              </button>
                            </div>
                          ) : (
                            <img
                              src={documento.foto_comprovante_residencia}
                              alt="Comprovante de Residência"
                              className="absolute inset-0 w-full h-full object-contain cursor-pointer"
                              onClick={() => openDocumentInNewTab(documento.foto_comprovante_residencia)}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="aspect-[1.414] w-full flex flex-col items-center justify-center gap-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <Camera className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                          <div className="text-center">
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Comprovante não cadastrado</p>
                            <p className="text-sm text-gray-400 dark:text-gray-500">
                              Faça o upload do comprovante para visualizá-lo aqui
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Document Edit Modal */}
      {isEditingDocuments && agregado && (
        <DocumentoMotoristaForm
          isOpen={isEditingDocuments}
          onClose={() => setIsEditingDocuments(false)}
          motorista_id={agregado.motorista_id}
          onSuccess={() => {
            setIsEditingDocuments(false);
            // Reload data would happen here in a real implementation
          }}
        />
      )}

      {/* Document Upload Modal */}
      {isUploadingDocuments && agregado && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Documentos de {agregado.nome}
              </h2>
              <button
                onClick={() => setIsUploadingDocuments(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CNH Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                    Informações da CNH
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Número da CNH
                      </label>
                      <input
                        type="text"
                        value={documento?.nr_registro_cnh || ''}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Categoria
                      </label>
                      <input
                        type="text"
                        value={documento?.categoria_cnh || ''}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        readOnly
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Validade
                      </label>
                      <input
                        type="text"
                        value={documento?.validade_cnh ? formatDate(documento.validade_cnh) : ''}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                
                {/* CNH Document */}
                <div>
                  <DocumentUploader
                    documentType="cnh"
                    currentUrl={documento?.foto_cnh || null}
                    motorista_id={agregado.motorista_id}
                    onUploadComplete={() => {
                      // This would update the document in a real implementation
                      toast.success('CNH enviada com sucesso');
                    }}
                    label="CNH"
                  />
                </div>
                
                {/* Comprovante de Residência */}
                <div className="md:col-span-2">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">
                    Comprovante de Residência
                  </h3>
                  
                  <DocumentUploader
                    documentType="comprovante_residencia"
                    currentUrl={documento?.foto_comprovante_residencia || null}
                    motorista_id={agregado.motorista_id}
                    onUploadComplete={() => {
                      // This would update the document in a real implementation
                      toast.success('Comprovante enviado com sucesso');
                    }}
                    label="Comprovante de Residência"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsUploadingDocuments(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgregadoDetailView;