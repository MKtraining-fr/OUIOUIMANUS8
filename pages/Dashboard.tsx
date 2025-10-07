import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Users, Armchair, AlertTriangle, Soup, BarChart2, Shield } from 'lucide-react';
import { api, getBusinessDayStart } from '../services/api';
import { DashboardStats, SalesDataPoint, DashboardPeriod } from '../types';
import Modal from '../components/Modal';
import RoleManager from '../components/role-manager';
import { formatCurrencyCOP } from '../utils/formatIntegerAmount';

const MainStatCard: React.FC<{ title: string; value: string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="ui-card p-6 flex flex-col items-center justify-center text-center gap-4 min-w-0">
        <div className="p-4 bg-brand-primary/20 text-brand-primary rounded-full">
            {icon}
        </div>
        <div className="w-full space-y-2">
            <p className="text-sm font-semibold text-gray-500 text-center">{title}</p>
            <div className="w-full flex justify-center">
                <p
                    className="font-bold text-gray-800 leading-none text-center break-words"
                    style={{ fontSize: 'clamp(1.25rem, 3vw, 2rem)', letterSpacing: '-0.01em' }}
                >
                    {value}
                </p>
            </div>
        </div>
    </div>
);

const OpStatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; onClick?: () => void }> = ({ title, value, icon, onClick }) => (
    <div className={`ui-card p-4 flex items-center space-x-3 min-w-0 ${onClick ? 'cursor-pointer hover:bg-gray-50' : ''}`} onClick={onClick}>
        <div className="p-3 bg-gray-100 text-gray-600 rounded-lg">
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">{title}</p>
            <p className="text-lg sm:text-xl xl:text-2xl font-bold text-gray-800 break-words leading-tight">{value}</p>
        </div>
    </div>
);


const PERIOD_CONFIG: Record<DashboardPeriod, { label: string; days: number }> = {
    week: { label: 'Últimos 7 días', days: 7 },
    month: { label: 'Últimos 30 días', days: 30 },
};

const resolvePeriodBounds = (period: DashboardPeriod) => {
    const { days } = PERIOD_CONFIG[period];
    const end = new Date(getBusinessDayStart());
    end.setDate(end.getDate() + 1);
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    return { start, end };
};

const Dashboard: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [salesByProduct, setSalesByProduct] = useState<SalesDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [pieChartMode, setPieChartMode] = useState<'category' | 'product'>('category');
    const [isLowStockModalOpen, setLowStockModalOpen] = useState(false);
    const [isRoleManagerOpen, setRoleManagerOpen] = useState(false);
    const [period, setPeriod] = useState<DashboardPeriod>('week');

    useEffect(() => {
        const fetchAllStats = async () => {
            const { start, end } = resolvePeriodBounds(period);
            const startIso = start.toISOString();
            const endIso = end.toISOString();
            setLoading(true);
            try {
                const [statsData, productSalesData] = await Promise.all([
                    api.getDashboardStats(period),
                    api.getSalesByProduct({ start: startIso, end: endIso })
                ]);
                setStats(statsData);
                setSalesByProduct(productSalesData);
            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAllStats();
    }, [period]);

    if (loading) return <div className="text-gray-800">Cargando datos del panel...</div>;
    if (!stats) return <div className="text-red-500">No fue posible cargar los datos.</div>;

    const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];
    const pieData = pieChartMode === 'category' ? stats.ventesParCategorie : salesByProduct;
    const hasPieData = pieData.length > 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="inline-flex rounded-lg bg-gray-100 p-1 text-sm font-semibold text-gray-600">
                    {Object.entries(PERIOD_CONFIG).map(([key, option]) => {
                        const value = key as DashboardPeriod;
                        const isActive = period === value;
                        return (
                            <button
                                key={value}
                                onClick={() => setPeriod(value)}
                                className={`px-3 py-1.5 rounded-md transition-colors ${isActive ? 'bg-white text-gray-900 shadow' : 'hover:text-gray-900'}`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => setRoleManagerOpen(true)}
                    className="ui-btn-primary"
                >
                    <Shield className="mr-2 h-4 w-4" />
                    Gestión de roles
                </button>
            </div>

            {/* Block 1: Key Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <MainStatCard title={`Ventas (${stats.periodLabel})`} value={formatCurrencyCOP(stats.ventesPeriode)} icon={<DollarSign size={28}/>} />
                <MainStatCard title={`Beneficio (${stats.periodLabel})`} value={formatCurrencyCOP(stats.beneficePeriode)} icon={<DollarSign size={28}/>} />
                <MainStatCard title={`Clientes (${stats.periodLabel})`} value={stats.clientsPeriode.toString()} icon={<Users size={28}/>} />
                <MainStatCard title="Ticket promedio" value={formatCurrencyCOP(stats.panierMoyen)} icon={<BarChart2 size={28}/>} />
            </div>

            {/* Block 2: Operational Status */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <OpStatCard title="Mesas ocupadas" value={stats.tablesOccupees} icon={<Armchair size={24}/>} />
                <OpStatCard title="Clientes actuales" value={stats.clientsActuels} icon={<Users size={24}/>} />
                <OpStatCard title="En cocina" value={stats.commandesEnCuisine} icon={<Soup size={24}/>} />
                <OpStatCard
                    title="Ingredientes bajos"
                    value={stats.ingredientsStockBas.length}
                    icon={<AlertTriangle size={24} className={stats.ingredientsStockBas.length > 0 ? 'text-red-500' : 'text-gray-600'} />}
                    onClick={() => setLowStockModalOpen(true)}
                />
            </div>

            {/* Block 3: Sales Chart */}
            <div className="ui-card p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Ventas durante {stats.periodLabel}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.ventesPeriodeSeries}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="ventes" fill="#8884d8" name={`${stats.periodLabel}`} />
                        <Bar dataKey="ventesPeriodePrecedente" fill="#d8d6f5" name="Periodo anterior" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Block 4: Sales Pie Chart */}
            <div className="ui-card p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Distribución de ventas ({stats.periodLabel})</h3>
                    <div className="flex p-1 bg-gray-200 rounded-lg">
                        <button onClick={() => setPieChartMode('category')} className={`px-3 py-1 text-sm font-semibold rounded-md ${pieChartMode === 'category' ? 'bg-white shadow' : ''}`}>Por categoría</button>
                        <button onClick={() => setPieChartMode('product')} className={`px-3 py-1 text-sm font-semibold rounded-md ${pieChartMode === 'product' ? 'bg-white shadow' : ''}`}>Por producto</button>
                    </div>
                </div>
                {hasPieData ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrencyCOP(value)} />
                            <Legend/>
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                    <div style={{ height: 300 }} className="flex items-center justify-center text-gray-500">
                        No hay datos para el periodo seleccionado.
                    </div>
                )}
            </div>

            <Modal isOpen={isLowStockModalOpen} onClose={() => setLowStockModalOpen(false)} title="Ingredientes con inventario bajo">
                {stats.ingredientsStockBas.length > 0 ? (
                    <ul className="space-y-2">
                        {stats.ingredientsStockBas.map(ing => (
                            <li key={ing.id} className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                                <span className="font-semibold text-red-800">{ing.nom}</span>
                                <span className="font-bold text-red-600">{ing.stock_actuel} / {ing.stock_minimum} {ing.unite}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-600 text-center">No hay ingredientes con inventario bajo por el momento.</p>
                )}
            </Modal>

            <RoleManager isOpen={isRoleManagerOpen} onClose={() => setRoleManagerOpen(false)} />
        </div>
    );
};

export default Dashboard;
