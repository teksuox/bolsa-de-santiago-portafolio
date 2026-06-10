import React, { useState, useEffect, useRef } from 'react';
import { portafolioDB, DBBackupData } from '../db';
import { pb, checkPocketBaseHealth, uploadPortfolioToPB, downloadPortfolioFromPB } from '../lib/pocketbase';
import { 
  Cloud, 
  Save, 
  RotateCw, 
  AlertTriangle, 
  Key, 
  Lock, 
  CheckCircle, 
  User, 
  Mail, 
  Radio, 
  ArrowRight,
  LogOut,
  Database,
  Download,
  Upload,
  Trash2,
  Check
} from 'lucide-react';

interface PocketBaseSyncProps {
  onDataRestored: () => void;
  holdings: any[];
  dividends: any[];
  refunds: any[];
  annualPerformancePercent: number;
  marketStocks: any[];
  deletedStocks: string[];
  onExportBackup: () => void;
  onImportBackup: (content: string) => Promise<void>;
  onClearAllData: () => Promise<void>;
}

export default function PocketBaseSync({ 
  onDataRestored,
  holdings,
  dividends,
  refunds,
  annualPerformancePercent,
  marketStocks,
  deletedStocks,
  onExportBackup,
  onImportBackup,
  onClearAllData
}: PocketBaseSyncProps) {
  
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

  // Backup import/clear state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Auto-sync configuration
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(() => {
    return localStorage.getItem('pb_autosync_enabled') === 'true';
  });

  // Check health on mount
  useEffect(() => {
    checkPocketBaseHealth(pb.baseUrl).then(setIsServerHealthy);
  }, []);

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
      
      // 3. Sync initial state if portafolios collection exists (best-effort)
      try {
        const text = await portafolioDB.exportBackup();
        await uploadPortfolioToPB(text);
      } catch (syncErr) {
        console.warn('Initial sync skipped (portafolios collection may not exist yet):', syncErr);
      }
      
      setStatusMessage('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
      setStatusMessage('');
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

  // Backup handlers
  const handleFileChangeForBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        JSON.parse(text);
        await onImportBackup(text);
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 4000);
      } catch (err: any) {
        setImportStatus('error');
        setImportError(err?.message || 'Archivo de respaldo dañado o incorrecto.');
        setTimeout(() => setImportStatus('idle'), 4000);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearClick = async () => {
    if (!showClearConfirm) {
      setShowClearConfirm(true);
      return;
    }
    await onClearAllData();
    setShowClearConfirm(false);
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

      </div>

      {/* Backup Local Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-1.5">
            <Database className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-slate-800 text-sm">Base de Datos Local (IndexedDB) & Respaldo</h3>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded font-bold">IndexedDB</span>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Tus datos nunca salen de tu navegador. Disfruta de total privacidad y mantén copias de seguridad.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Export */}
            <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-800 block uppercase tracking-wider">Exportar Respaldo</span>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">Descarga tus datos en un archivo JSON local.</p>
              </div>
              <button onClick={onExportBackup}
                className="mt-2.5 flex items-center justify-center space-x-1.5 w-full bg-slate-900 text-white font-medium hover:bg-slate-800 text-[10px] py-2 rounded-md transition cursor-pointer">
                <Download className="w-3.5 h-3.5" />
                <span>Guardar Respaldo (.json)</span>
              </button>
            </div>
            {/* Import */}
            <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-800 block uppercase tracking-wider">Restaurar Respaldo</span>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">Sube tu archivo para recuperar tu portafolio.</p>
              </div>
              <div className="mt-2.5">
                <input type="file" ref={fileInputRef} onChange={handleFileChangeForBackup} accept=".json" className="hidden" />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center space-x-1.5 w-full bg-white text-slate-800 border border-slate-200 font-semibold hover:bg-slate-50 text-[10px] py-2 rounded-md transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-slate-500" />
                  <span>Cargar Archivo Respaldo</span>
                </button>
                {importStatus === 'success' && (
                  <div className="mt-1.5 text-[9px] text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 p-1 rounded">
                    <Check className="w-3 h-3" /> ¡Respaldo importado con éxito!
                  </div>
                )}
                {importStatus === 'error' && (
                  <div className="mt-1.5 text-[9px] text-rose-600 font-medium bg-rose-50 p-1 rounded leading-normal">
                    ⚠ Error: {importError}
                  </div>
                )}
              </div>
            </div>
            {/* Reset */}
            <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-800 block uppercase tracking-wider">Reiniciar Aplicación</span>
                <p className="text-[9px] text-slate-400 mt-0.5 leading-normal">Borra todo tu portafolio. Acción irreversible.</p>
              </div>
              <div className="mt-2.5">
                {showClearConfirm ? (
                  <div className="space-y-1">
                    <button onClick={handleClearClick}
                      className="flex items-center justify-center space-x-1.5 w-full bg-rose-600 text-white font-medium hover:bg-rose-700 text-[10px] py-1.5 rounded-md transition cursor-pointer">
                      <Trash2 className="w-3 h-3" />
                      <span>Confirmar Borrado</span>
                    </button>
                    <button onClick={() => setShowClearConfirm(false)}
                      className="text-center block text-[9px] text-slate-500 hover:underline w-full py-0.5 cursor-pointer">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button onClick={handleClearClick}
                    className="flex items-center justify-center space-x-1.5 w-full bg-rose-50 text-rose-700 border border-rose-200 font-medium hover:bg-rose-100 text-[10px] py-2 rounded-md transition cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar Datos</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
