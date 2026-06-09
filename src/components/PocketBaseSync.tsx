import React, { useState, useEffect } from 'react';
import { portafolioDB, DBBackupData } from '../db';
import { pb, updatePocketBaseUrl, checkPocketBaseHealth, uploadPortfolioToPB, downloadPortfolioFromPB } from '../lib/pocketbase';
import { 
  Cloud, 
  Save, 
  RotateCw, 
  AlertTriangle, 
  HelpCircle, 
  Key, 
  Lock, 
  CheckCircle, 
  Database, 
  User, 
  Mail, 
  Unlock, 
  Radio, 
  Settings, 
  Terminal, 
  ArrowRight,
  LogOut
} from 'lucide-react';

interface PocketBaseSyncProps {
  onDataRestored: () => void;
  holdings: any[];
  dividends: any[];
  refunds: any[];
  annualPerformancePercent: number;
  marketStocks: any[];
  deletedStocks: string[];
}

export default function PocketBaseSync({ 
  onDataRestored,
  holdings,
  dividends,
  refunds,
  annualPerformancePercent,
  marketStocks,
  deletedStocks
}: PocketBaseSyncProps) {
  
  // Url config state
  const [pbUrl, setPbUrl] = useState(() => localStorage.getItem('pocketbase_url') || 'http://localhost:8090');
  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);
  
  // Auth states
  const [isLoggedIn, setIsLoggedIn] = useState(() => pb.authStore.isValid);
  const [currentUser, setCurrentUser] = useState(() => pb.authStore.model);
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  
  // Form input states
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // UI Loading/Status
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-sync configuration
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('pb_autosync_enabled') === 'true';
  });

  // Check health on mount
  useEffect(() => {
    verifyHealth(pbUrl);
  }, []);

  const verifyHealth = async (url: string) => {
    const healthy = await checkPocketBaseHealth(url);
    setIsServerHealthy(healthy);
    return healthy;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setPbUrl(val);
    updatePocketBaseUrl(val);
    verifyHealth(val);
  };

  // Sign in logic
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    setStatusMessage('Iniciando sesión en PocketBase...');

    try {
      const authData = await pb.collection('users').authWithPassword(emailOrUsername.trim(), password);
      setIsLoggedIn(true);
      setCurrentUser(authData.record);
      setSuccessMessage('¡Sesión iniciada con éxito!');
      setStatusMessage('');
      
      // Auto-fetch current server portfolio if empty or choice
      const remoteData = await downloadPortfolioFromPB();
      if (remoteData) {
        const confirmRestore = window.confirm(
          '📍 Datos en la nube detectados\n\nHemos encontrado un respaldo de tu portafolio guardado en tu cuenta de PocketBase en tiempo real.\n\n¿Deseas descargar e importar estos datos ahora para restaurar tu estado actual?'
        );
        if (confirmRestore) {
          await portafolioDB.importBackup(remoteData);
          onDataRestored();
          setSuccessMessage('¡Portafolio sincronizado desde la nube!');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al iniciar sesión. Verifica los datos y que el servidor funcione.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign up logic
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    setStatusMessage('Creando usuario en PocketBase...');

    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener mínimo 8 caracteres.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Create User
      await pb.collection('users').create({
        username: username.trim(),
        email: email.trim(),
        emailVisibility: true,
        password: password,
        passwordConfirm: password,
      });

      setSuccessMessage('¡Registro exitoso! Iniciando sesión automáticamente...');
      
      // 2. Auth user directly
      const authData = await pb.collection('users').authWithPassword(email.trim(), password);
      setIsLoggedIn(true);
      setCurrentUser(authData.record);
      
      // 3. Sync initial state to make sure database is ready
      const text = await portafolioDB.exportBackup();
      await uploadPortfolioToPB(text);
      
      setStatusMessage('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const handleLogOut = () => {
    pb.authStore.clear();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSuccessMessage('Sesión cerrada correctamente.');
  };

  // Push local back up manually
  const handleManualPush = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    setStatusMessage('Exportando portafolio local a PocketBase...');

    try {
      const backupData = await portafolioDB.exportBackup();
      await uploadPortfolioToPB(backupData);
      setSuccessMessage('¡Portafolio subido y sincronizado correctamente con PocketBase!');
      setStatusMessage('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al sincronizar tus datos. ¿Creaste la colección "portafolios"?');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull remote portfolio manually
  const handleManualPull = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);
    setStatusMessage('Obteniendo portafolio desde la nube...');

    try {
      const remoteData = await downloadPortfolioFromPB();
      if (!remoteData) {
        setErrorMessage('No se encontró ningún portafolio guardado para esta cuenta en PocketBase.');
        setIsLoading(false);
        return;
      }

      const confirmRestore = window.confirm(
        '⚠️ ADVERTENCIA DE IMPORTACIÓN ⚠️\n\n¿Estás seguro de que deseas reemplazar todos tus datos locales con el portafolio guardado en PocketBase? Esto sobrescribirá acciones, dividendos e impuestos vigentes.'
      );
      if (!confirmRestore) {
        setIsLoading(false);
        return;
      }

      await portafolioDB.importBackup(remoteData);
      onDataRestored();
      setSuccessMessage('¡Portafolio descargado y restaurado localmente con éxito!');
      setStatusMessage('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al descargar el respaldo.');
    } finally {
      setIsLoading(false);
    }
  };

  // Listen to changes in the toggle
  const toggleAutoSync = (checked: boolean) => {
    setAutoSyncEnabled(checked);
    localStorage.setItem('pb_autosync_enabled', checked ? 'true' : 'false');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-800">
      {/* Tab Header Banner */}
      <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500 text-slate-950 rounded-xl">
            <Cloud className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Sincronización en Tiempo Real con PocketBase</h3>
            <p className="text-[11px] text-slate-400 font-medium">Guarda tu portafolio, estados y dividendos automáticamente usando tu servidor Docker</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-slate-950/65 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-mono text-zinc-300 self-start sm:self-auto">
          <Radio className={`w-3.5 h-3.5 shrink-0 ${isServerHealthy ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
          <span>Status: {isServerHealthy ? 'PB ONLINE' : 'PB OFFLINE'}</span>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Server & Docker Connection config */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-705 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <Settings className="w-3.5 h-3.5 text-teal-600" />
            Configuración de Instancia PocketBase
          </h4>

          <div className="space-y-2">
            <label className="text-[10.5px] font-bold text-slate-500 uppercase block">URL del Servidor PocketBase (Docker / Local)</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="http://localhost:8090"
                value={pbUrl}
                onChange={handleUrlChange}
                className="flex-1 text-xs font-mono bg-white hover:bg-slate-50 transition border border-slate-350 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
              />
              <button
                type="button"
                onClick={() => verifyHealth(pbUrl)}
                className="bg-slate-900 text-white font-bold hover:bg-slate-800 transition text-xs px-4 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCw className="w-3.5 h-3.5" /> Probar Conexión
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Introduce la URL donde corre tu docker de PocketBase. Por defecto es <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-700">http://localhost:8090</code>. Actualmente: {isServerHealthy === true ? (
                <span className="text-emerald-600 font-bold">Conexión establecida correctamente.</span>
              ) : isServerHealthy === false ? (
                <span className="text-rose-500 font-bold">Infranqueable o inactivo. Comprueba que PocketBase esté corriendo en tu Docker.</span>
              ) : (
                <span>Comprobando salud...</span>
              )}
            </p>
          </div>
        </div>

        {/* User Authentication Panel if not Logged In */}
        {!isLoggedIn ? (
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className={`flex-1 py-3 text-xs font-extrabold transition text-center border-r border-slate-250 cursor-pointer ${
                  authTab === 'login' ? 'bg-white text-slate-900 border-b-2 border-b-teal-500' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('signup')}
                className={`flex-1 py-3 text-xs font-extrabold transition text-center cursor-pointer ${
                  authTab === 'signup' ? 'bg-white text-slate-900 border-b-2 border-b-teal-500' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                Crear Cuenta (Registro)
              </button>
            </div>

            <div className="p-6">
              {authTab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed mb-1">
                    Ingresa con tu usuario o email de PocketBase. Al autenticarte, mantendremos sincronizado tu portafolio de la bolsa en tiempo real.
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Usuario o Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="tu_usuario o correo@ejemplo.com"
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-250 rounded-lg pl-9.5 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-250 rounded-lg pl-9.5 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isLoading ? 'Conectando...' : 'Iniciar Sesión'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed mb-1">
                    Crea una cuenta local en tu instancia de PocketBase. Tus datos se guardarán de forma totalmente privada y autónoma.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Usuario único</label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="inversor_santiago"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-250 rounded-lg pl-9.5 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Correo Electrónico</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          placeholder="inversor@bolsa.cl"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full text-xs bg-white border border-slate-250 rounded-lg pl-9.5 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Contraseña (Mínimo 8 caracteres)</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-250 rounded-lg pl-9.5 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-slate-950 font-black rounded-lg transition text-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isLoading ? 'Creando cuenta...' : 'Registrar y Autenticar'}
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          /* Logged In Dashboard State */
          <div className="border border-emerald-200 rounded-xl overflow-hidden shadow-sm bg-emerald-50/20 p-5 space-y-5 animate-fadeIn">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-150 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-sm">
                  {currentUser?.username?.substring(0, 2).toUpperCase() || 'PB'}
                </div>
                <div>
                  <h5 className="text-[13px] font-extrabold text-slate-900">Autenticado en PocketBase</h5>
                  <p className="text-[11px] text-slate-500 font-medium">{currentUser?.email || currentUser?.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogOut}
                className="text-[11px] font-bold text-slate-500 hover:text-rose-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
              </button>
            </div>

            {/* Auto sync toggling */}
            <div className="bg-white border border-slate-150 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 select-none cursor-pointer" htmlFor="auto-sync-toggle">
                  <Radio className="w-4 h-4 text-teal-600 animate-pulse" />
                  Sincronización Inteligente en Tiempo Real
                </label>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                  Cualquier ingreso, actualización, cambio de precio u ocultamiento de acciones se registrará de inmediato en PocketBase.
                </p>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto-sync-toggle"
                  checked={autoSyncEnabled}
                  onChange={(e) => toggleAutoSync(e.target.checked)}
                  className="w-10 h-5 bg-slate-200 checked:bg-teal-500 rounded-full cursor-pointer transition focus:outline-none appearance-none border border-slate-350 relative after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 checked:after:translate-x-5 after:transition"
                />
              </div>
            </div>

            {/* Action panel triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-3.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Subir a la nube</span>
                  <p className="text-xs font-bold text-slate-900">Forzar Guardado Manual</p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Toma tu portafolio de IndexedDB y súbelo a PocketBase. Sobrescribirá respaldos anteriores de tu usuario.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleManualPush}
                  disabled={isLoading}
                  className="w-full text-xs font-extrabold text-slate-950 bg-teal-400 hover:bg-teal-500 transition px-4 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" /> {isLoading ? 'Guardando...' : 'Guardar en PocketBase'}
                </button>
              </div>

              <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-3.5 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Descargar de la nube</span>
                  <p className="text-xs font-bold text-slate-900">Restaurar / Cargar Servidor</p>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Descarga tus activos, tramos de impuestos e historial guardados en tu cuenta remota de PocketBase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleManualPull}
                  disabled={isLoading}
                  className="w-full text-xs font-extrabold text-white bg-slate-900 hover:bg-slate-800 transition px-4 py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Descargar de PocketBase
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Global feedbacks */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-4 rounded-xl flex items-start gap-2 animate-fadeIn">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl flex items-start gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div className="bg-slate-950 text-slate-300 font-mono text-[10px] p-3 rounded-lg border border-slate-800 flex items-center justify-between shadow-inner animate-pulse">
            <span>📟 {statusMessage}</span>
          </div>
        )}

        {/* Accordion / Interactive instructions for PocketBase Collection creation */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <summary className="text-xs font-extrabold text-slate-850 flex items-center gap-1.5 select-none focus:outline-none">
            <HelpCircle className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Guía de Configuración Rápida en PocketBase</span>
          </summary>
          
          <div className="text-xs text-slate-600 space-y-3 font-medium pl-1 leading-relaxed border-t border-slate-200 pt-3">
            <p>
              Como estás ejecutando tu flujo con Docker locales, PocketBase necesita que crees la colección que contendrá la información del portafolio. Sigue estos pasos súper sencillos:
            </p>

            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-teal-600" /> 1. Crear colección "portafolios":
              </p>
              <p className="pl-1 text-[11px] text-slate-600 leading-relaxed">
                Ingresa a la interfaz de administración de PocketBase (normalmente en <a href="http://localhost:8090/_/" target="_blank" rel="noopener noreferrer" className="text-teal-600 font-bold underline">http://localhost:8090/_/</a>), pulsa en <strong>"New Collection"</strong> y llámala exactamente <code className="bg-slate-100 font-mono px-1 border rounded font-semibold text-slate-800">portafolios</code>.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-3">
              <p className="font-bold text-slate-800 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-teal-600" /> 2. Añadir campos (Fields):
              </p>
              <p className="text-[11px] pl-1">Crea estos dos campos indispensables de base:</p>
              <ul className="list-disc pl-5 text-[10.5px] space-y-2 font-medium text-slate-700">
                <li>
                  <strong>Campo <code className="font-mono bg-slate-100 px-1 border rounded">user</code></strong>:<br/>
                  Selecciona tipo <strong>Relation</strong> apuntando a la colección <code className="font-mono bg-slate-100 px-1">users</code>. En opciones, marca <span className="font-semibold">"Max Select" = 1</span> y <span className="font-semibold">"Non-empty (Required)" = Checked</span>.
                </li>
                <li>
                  <strong>Campo <code className="font-mono bg-slate-105 px-1 border rounded">data</code></strong>:<br/>
                  Selecciona de tipo <strong>JSON</strong>. Marca <span className="font-semibold">"Non-empty (Required)" = Checked</span>.
                </li>
              </ul>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
              <p className="font-bold text-slate-800 flex items-center gap-1 font-sans">
                <Lock className="w-3.5 h-3.5 text-teal-600" /> 3. Configurar Reglas de Acceso (API Rules):
              </p>
              <p className="pl-1 text-[11px] text-slate-600 leading-relaxed">
                En la pestaña de <strong>"API Rules"</strong> de la colección <code className="font-mono bg-slate-100">portafolios</code>, sustituye las reglas vacías (bloqueadas) de List, View, Create y Update por esta regla de propiedad:
              </p>
              <pre className="bg-slate-900 text-teal-400 font-mono text-[10.5px] p-2.5 rounded-lg border border-slate-800 mt-1 select-all hover:bg-slate-950 transition cursor-pointer">
                user = @request.auth.id
              </pre>
              <p className="text-[10px] text-slate-500 mt-1.5 font-medium italic">Esto garantiza que ningún usuario pueda espiar o modificar el portafolio de otro.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
