import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { api } from '../services/api';
import { DailyReport, RoleLogin } from '../types';
import { Users, ShoppingCart, DollarSign, Package, AlertTriangle, MessageSquare, LogIn } from 'lucide-react';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';

const ReportStat: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
    <div className="bg-gray-100 p-3 sm:p-4 rounded-lg flex flex-col sm:flex-row sm:items-center items-start gap-3">
        <div className="p-2 sm:p-3 bg-brand-primary/20 text-brand-primary rounded-full">
            {icon}
        </div>
        <div className="space-y-1">
            <p className="text-xs sm:text-sm text-gray-500 font-semibold">{label}</p>
            <p className="font-bold text-gray-800 text-[clamp(1.1rem,2.5vw,1.5rem)]">{value}</p>
        </div>
    </div>
);

const ReportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [report, setReport] = useState<DailyReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [reportError, setReportError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            const fetchReport = async () => {
                setLoading(true);
                setReportError(null);
                try {
                    const data = await api.generateDailyReport();
                    setReport(data);
                } catch (error) {
                    console.error('Error al generar el informe diario', error);
                    setReport(null);
                    setReportError('No fue posible generar el informe diario. Intenta nuevamente más tarde.');
                } finally {
                    setLoading(false);
                }
            };
            fetchReport();
        }
    }, [isOpen]);

    const formatLoginsByRole = (logins: RoleLogin[]) => {
        const grouped = new Map<string, string[]>();
        logins.forEach(login => {
            const time = new Date(login.loginAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
            const existing = grouped.get(login.roleName) ?? [];
            existing.push(time);
            grouped.set(login.roleName, existing);
        });
        return grouped;
    };

    const formatReportForWhatsApp = (reportData: DailyReport): string => {
        const parts: string[] = [];
        parts.push(`*REPORTE OUIOUITACOS*`);
        parts.push(`Generado el: ${new Date(reportData.generatedAt).toLocaleString('es-CO')}`);
        parts.push(`Periodo: desde ${new Date(reportData.startDate).toLocaleString('es-CO')}`);
        parts.push('---');

        parts.push(`*Estadísticas del día*`);
        parts.push(`- Ventas: *${formatCurrencyCOP(reportData.ventesDuJour)}*`);
        parts.push(`- Clientes: *${reportData.clientsDuJour}*`);
        parts.push(`- Ticket promedio: *${formatCurrencyCOP(reportData.panierMoyen)}*`);
        parts.push('---');

        parts.push(`*Productos vendidos*`);
        if (reportData.soldProducts.length === 0) {
          parts.push('Ningún producto vendido.');
        } else {
          reportData.soldProducts.forEach(category => {
            parts.push(`\n_${category.categoryName}_`);
            category.products.forEach(product => {
              parts.push(`  - ${product.quantity}x ${product.name} (${formatCurrencyCOP(product.totalSales)})`);
            });
          });
        }
        parts.push('---');

        parts.push(`*Inicios de sesión desde las 05:00*`);
        if (reportData.roleLoginsUnavailable) {
          parts.push('Inicios de sesión no disponibles en este dispositivo.');
        } else {
          const groupedLogins = formatLoginsByRole(reportData.roleLogins);
          if (groupedLogins.size === 0) {
            parts.push('No hay inicios de sesión registrados.');
          } else {
            groupedLogins.forEach((times, roleName) => {
              parts.push(`- ${roleName}: ${times.join(', ')}`);
            });
          }
        }
        parts.push('---');

        parts.push(`*Inventario bajo*`);
        if (reportData.lowStockIngredients.length === 0) {
          parts.push('No hay ingredientes con inventario bajo.');
        } else {
          reportData.lowStockIngredients.forEach(ing => {
            parts.push(`- ${ing.nom} (${ing.stock_actuel} / ${ing.stock_minimum} ${ing.unite})`);
          });
        }
    
        return encodeURIComponent(parts.join('\n'));
      };

    const handleSendToWhatsApp = () => {
        if (!report) return;
        const message = formatReportForWhatsApp(report);
        const whatsappUrl = `https://wa.me/?text=${message}`;
        window.open(whatsappUrl, '_blank');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Reporte diario" size="xl">
            <>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                     {loading && <p>Generando el reporte...</p>}
                     {!loading && reportError && (
                        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {reportError}
                        </div>
                     )}
                     {!loading && !report && !reportError && (
                        <p className="text-red-500">No fue posible generar el reporte.</p>
                     )}
                     {!loading && report && (
                         <div className="space-y-6">
                            {report.roleLoginsUnavailable && (
                                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800 flex items-start gap-2">
                                    <AlertTriangle className="mt-0.5 h-4 w-4" />
                                    <span>
                                        Los inicios de sesión de los roles no están disponibles en este dispositivo (almacenamiento local inaccesible).
                                    </span>
                                </div>
                            )}
                            <div className="text-center border-b pb-4">
                                 <h2 className="font-bold text-brand-secondary text-[clamp(1.75rem,4vw,2.75rem)]">Reporte OUIOUITACOS</h2>
                                 <p className="text-gray-500">
                                     Generado el {new Date(report.generatedAt).toLocaleString('es-CO')}
                                 </p>
                                 <p className="text-sm text-gray-500">
                                     Datos desde {new Date(report.startDate).toLocaleString('es-CO')}
                                 </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                <ReportStat icon={<DollarSign/>} label="Ventas del día" value={formatCurrencyCOP(report.ventesDuJour)} />
                                <ReportStat icon={<Users/>} label="Clientes del día" value={report.clientsDuJour} />
                                <ReportStat icon={<ShoppingCart/>} label="Ticket promedio" value={formatCurrencyCOP(report.panierMoyen)} />
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-gray-800"><Package/> Productos vendidos</h3>
                                <div className="space-y-4">
                                    {report.soldProducts.map(category => (
                                        <div key={category.categoryName}>
                                            <h4 className="font-bold text-brand-primary">{category.categoryName}</h4>
                                            <ul className="list-disc list-inside pl-2 text-gray-700">
                                                {category.products.map(product => (
                                                    <li key={product.id}>
                                                        {product.quantity}x {product.name} - <span className="font-semibold">{formatCurrencyCOP(product.totalSales)}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-gray-800"><LogIn/> Inicios de sesión desde las 05:00</h3>
                                {report.roleLoginsUnavailable ? (
                                    <p className="text-gray-500">Inicios de sesión no disponibles: no es posible acceder al almacenamiento local.</p>
                                ) : (
                                    (() => {
                                        const grouped = formatLoginsByRole(report.roleLogins);
                                        if (grouped.size === 0) {
                                            return <p className="text-gray-500">No hay inicios de sesión registrados desde las 05:00.</p>;
                                        }
                                        return (
                                            <ul className="space-y-2">
                                                {Array.from(grouped.entries()).map(([roleName, times]) => (
                                                    <li key={roleName} className="flex justify-between items-center bg-slate-100 p-2 rounded-md">
                                                        <span className="font-semibold text-gray-800">{roleName}</span>
                                                        <span className="text-sm text-gray-600">{times.join(', ')}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    })()
                                )}
                            </div>

                            <div>
                                 <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-gray-800"><AlertTriangle className="text-orange-500"/> Ingredientes con inventario bajo</h3>
                                 {report.lowStockIngredients.length > 0 ? (
                                    <ul className="space-y-1">
                                        {report.lowStockIngredients.map(ing => (
                                            <li key={ing.id} className="flex justify-between items-center bg-orange-50 p-2 rounded-md text-orange-800">
                                                <span>{ing.nom}</span>
                                                <span className="font-bold">{ing.stock_actuel} / {ing.stock_minimum} {ing.unite}</span>
                                            </li>
                                        ))}
                                    </ul>
                                 ) : (
                                    <p className="text-gray-500">No hay ingredientes con inventario bajo.</p>
                                 )}
                            </div>
                         </div>
                     )}
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 border-t">
                    <button onClick={onClose} className="w-full sm:w-auto bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition">
                        Cerrar
                    </button>
                    <button
                        onClick={handleSendToWhatsApp}
                        disabled={loading || !report}
                        className="w-full sm:w-auto bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition flex items-center justify-center gap-2 disabled:bg-gray-400"
                    >
                        <MessageSquare size={20}/> Enviar por WhatsApp
                    </button>
                </div>
            </>
        </Modal>
    );
};

export default ReportModal;
