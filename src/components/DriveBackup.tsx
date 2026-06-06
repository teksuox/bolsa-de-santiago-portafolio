import React, { useState, useEffect } from 'react';
import { portafolioDB, DBBackupData } from '../db';
import { Cloud, Save, RotateCw, AlertTriangle, CloudRain, HelpCircle, Key, Lock, CheckCircle, Database } from 'lucide-react';

interface DriveBackupProps {
  onDataRestored: () => void;
}

export default function DriveBackup({ onDataRestored }: DriveBackupProps) {
  // Config states persisted locally so the user doesn't have to re-enter them
  const [clientId, setClientId] = useState(() => localStorage.getItem('gdrive_client_id') || '');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('gdrive_api_key') || '');
  
  // Runtime authorization states
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('gdrive_access_token') || '');
  const [isManualTokenMode, setIsManualTokenMode] = useState(false);
  const [gdriveStatus, setGdriveStatus] = useState<'idle' | 'authorizing' | 'authorized' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  // Operation loading indicator
  const [isLoading, setIsLoading] = useState(false);
  const [remoteBackupInfo, setRemoteBackupInfo] = useState<{ id: string; modifiedTime: string } | null>(null);

  // Persist keys to localStorage upon typing
  useEffect(() => {
    localStorage.setItem('gdrive_client_id', clientId);
  }, [clientId]);

  useEffect(() => {
    localStorage.setItem('gdrive_api_key', apiKey);
  }, [apiKey]);

  // Handle caching access token during session
  useEffect(() => {
    if (accessToken) {
      sessionStorage.setItem('gdrive_access_token', accessToken);
      setGdriveStatus('authorized');
      checkRemoteBackup(accessToken);
    } else {
      sessionStorage.removeItem('gdrive_access_token');
    }
  }, [accessToken]);

  // Load Google Client SDK (GIS) dynamically for OAuth2 implicit flow
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = document.getElementById('google-client-gis-script');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'google-client-gis-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // Check if a backup file already exists on Google Drive
  const checkRemoteBackup = async (tokenToCheck: string) => {
    if (!tokenToCheck) return;
    try {
      const q = encodeURIComponent("name = 'bolsa_santiago_portafolio_backup.json' and trashed = false");
      const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${tokenToCheck}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired
          setAccessToken('');
          setGdriveStatus('error');
          setStatusMessage('La sesión de Google Drive ha expirado. Por favor conéctate nuevamente.');
          return;
        }
        throw new Error(`Error en respuesta (${response.status})`);
      }

      const resData = await response.json();
      if (resData.files && resData.files.length > 0) {
        const file = resData.files[0];
        setRemoteBackupInfo({
          id: file.id,
          modifiedTime: new Date(file.modifiedTime).toLocaleString('es-CL')
        });
      } else {
        setRemoteBackupInfo(null);
      }
    } catch (err) {
      console.error('Error al revisar el respaldo remoto:', err);
    }
  };

  // Launch implicit Google OAuth Client authorization
  const handleConnectWithOAuth = () => {
    if (!clientId) {
      setGdriveStatus('error');
      setStatusMessage('Debes ingresar tu "Google Client ID" antes de conectar.');
      return;
    }

    setGdriveStatus('authorizing');
    setStatusMessage('Iniciando ventana de autorización de Google...');

    try {
      if (!(window as any).google?.accounts?.oauth2) {
        // Fallback or script loading wait
        setGdriveStatus('error');
        setStatusMessage('El SDK de Google todavía se está cargando. Reintente en un momento o ingrese el token manualmente.');
        return;
      }

      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId.trim(),
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            setGdriveStatus('error');
            setStatusMessage(`Error de autorización: ${tokenResponse.error_description || tokenResponse.error}`);
            return;
          }
          if (tokenResponse.access_token) {
            setAccessToken(tokenResponse.access_token);
            setGdriveStatus('authorized');
            setStatusMessage('Conexión inicial exitosa con Google Drive.');
          }
        },
      });

      client.requestAccessToken();
    } catch (err: any) {
      console.error('Error en OAuth:', err);
      setGdriveStatus('error');
      setStatusMessage(`Error al inicializar sesión: ${err.message || err}`);
    }
  };

  // Save current IndexedDB state to Google Drive as backup
  const handleSaveBackup = async () => {
    const currentToken = accessToken.trim();
    if (!currentToken) {
      alert('Por favor conéctate a Google Drive primero.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Preparando y compilando datos del portafolio local...');

    try {
      // 1. Fetch current local IndexedDB contents
      const backupData = await portafolioDB.exportBackup();
      
      // 2. See if file exists to overwrite
      const q = encodeURIComponent("name = 'bolsa_santiago_portafolio_backup.json' and trashed = false");
      const findUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`;
      
      const findResponse = await fetch(findUrl, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });

      if (!findResponse.ok) {
        throw new Error('No se pudo verificar el archivo de respaldo existente.');
      }

      const findData = await findResponse.json();
      const existingFileId = findData.files && findData.files[0]?.id;

      let saveResponse;
      if (existingFileId) {
        // OVERWRITE update using PATCH media
        setStatusMessage('Sobrescribiendo copia de seguridad existente en tu nube...');
        saveResponse = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(backupData)
        });
      } else {
        // CREATE new file with simple multipart JSON upload
        setStatusMessage('Creando nuevo archivo de respaldo en tu Google Drive...');
        const metadata = {
          name: 'bolsa_santiago_portafolio_backup.json',
          mimeType: 'application/json',
          description: 'Respaldo del portafolio del mercado chileno Bolsa de Santiago pre-configurado'
        };

        const boundary = 'santiago_portfolio_multipart_boundary';
        const delimiter = `\r\n--${boundary}\r\n`;
        const close_delim = `\r\n--${boundary}--`;

        const multipartBody = 
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(backupData) +
          close_delim;

        saveResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });
      }

      if (!saveResponse.ok) {
        throw new Error(`Fallo de guardado en la API del servidor Google Drive (${saveResponse.status})`);
      }

      const savedResult = await saveResponse.json();
      setStatusMessage('¡Respaldo subido con éxito y almacenado de forma privada!');
      alert('¡Excelente! Los datos de tu portafolio se han respaldado con éxito en tu Google Drive.');
      
      // Update info state
      await checkRemoteBackup(currentToken);
    } catch (err: any) {
      console.error(err);
      alert(`Fallo al subir respaldo: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Restore state from Google Drive file to IndexedDB
  const handleRestoreBackup = async () => {
    const currentToken = accessToken.trim();
    if (!currentToken || !remoteBackupInfo?.id) {
      alert('No se detectó un archivo de respaldo guardado en tu Drive para restaurar.');
      return;
    }

    const confirmRestore = window.confirm(
      '⚠️ ADVERTENCIA DE RESTAURACIÓN ⚠️\n\nAl cargar este respaldo se sobrescribirá por completo todo el estado de tu portafolio actual (acciones, dividendos y devolución de impuestos). Esta acción no se puede deshacer.\n\n¿Estás seguro de continuar?'
    );
    if (!confirmRestore) return;

    setIsLoading(true);
    setStatusMessage('Descargando archivo JSON de respaldo de Google Drive...');

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${remoteBackupInfo.id}?alt=media`, {
        headers: { 'Authorization': `Bearer ${currentToken}` }
      });

      if (!response.ok) {
        throw new Error('Fallo al descargar los datos del archivo.');
      }

      const backupContent = await response.json();
      
      setStatusMessage('Cargando datos históricos del portafolio en base de datos local...');
      await portafolioDB.importBackup(backupContent);

      setStatusMessage('¡Portafolio restaurado correctamente!');
      alert('¡Perfecto! Tus datos y configuraciones se han restaurado con éxito desde Google Drive.');
      
      // Trigger update of state inside Dashboard & Portafolio view
      onDataRestored();
    } catch (err: any) {
      console.error(err);
      alert(`Error al restaurar tu respaldo: ${err.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-800">
      {/* Visual Header */}
      <div className="bg-slate-900 px-6 py-5 border-b border-slate-800 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-teal-500 text-slate-950 rounded-xl">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight">Sincronización Cloud con Google Drive</h3>
            <p className="text-[11px] text-slate-400 font-medium">Guarda respaldos robustos y restáuralos en cualquier computador o navegador</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-950/65 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-mono text-teal-400">
          <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Seguro & Local</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Step-by-Step setup alert guide */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex gap-3 text-xs text-slate-600">
          <HelpCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="font-bold text-slate-900 mb-1">¿Cómo configurar Google Drive de forma local?</p>
            <p className="leading-relaxed">
              Como esta aplicación corre de forma aislada y local en tu computador o instancia, Google requiere que uses tus propios ID de cliente para mantener tu privacidad absoluta sin servidores intermedios de terceros.
            </p>
            <ol className="list-decimal list-inside space-y-1.5 font-medium pl-1 text-slate-700">
              <li>Dirígete a <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline font-bold inline-flex items-center gap-0.5">Google Cloud Console</a> y crea un nuevo proyecto de prueba.</li>
              <li>Habilita la <strong>Google Drive API</strong> desde la Biblioteca de APIs.</li>
              <li>Configura la <span className="font-bold">Pantalla de Consentimiento OAuth</span> (OAuth Consent Screen) como tipo "Externo/Usuario de prueba" y agrega alcance de API de escritura simplificada (<code className="font-bold font-mono">.../auth/drive.file</code>).</li>
              <li>Crea unas <strong className="font-bold">Credenciales de ID de cliente de OAuth 2.0</strong> de tipo <span className="font-mono">"Web Application"</span>.</li>
              <li>Agrega en <strong className="text-slate-900">"Orígenes de JavaScript autorizados"</strong> tu URL local de ejecucion actual (por ejemplo: <code className="bg-slate-200 border border-slate-300 font-mono text-[11px] px-1.5 py-0.5 rounded">http://localhost:3000</code> o la url del puerto de tu Portainer / VPS / AI Studio).</li>
            </ol>
          </div>
        </div>

        {/* Input Configuration Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-705 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
            <Key className="w-3.5 h-3.5 text-teal-600" />
            Configuración de Credenciales
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10.5px] font-bold text-slate-500 uppercase block mb-1">Google OAuth Client ID</label>
              <input
                type="text"
                placeholder="123456-abcdef.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full text-xs font-mono bg-white hover:bg-slate-50 transition border border-slate-250 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
              />
              <p className="text-[10px] text-slate-400 mt-1 italic">El ID generado en la consola GCP.</p>
            </div>

            <div>
              <label className="text-[10.5px] font-bold text-slate-500 uppercase block mb-1">API Developer Key (Opcional)</label>
              <input
                type="text"
                placeholder="AIzaSyA..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full text-xs font-mono bg-white hover:bg-slate-50 transition border border-slate-250 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
              />
              <p className="text-[10px] text-slate-400 mt-1 italic">Llave de API opcional para mejorar consultas de Drive.</p>
            </div>
          </div>

          {/* Fallback to Paste Token directly */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsManualTokenMode(!isManualTokenMode)}
              className="text-xs text-slate-500 hover:text-teal-600 font-bold transition flex items-center gap-1 cursor-pointer bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-center"
            >
              🔑 {isManualTokenMode ? 'Usar botón de inicio de sesión estándar Google' : '¿Problemas con el popup de Google? Ingresa un Token Manual'}
            </button>

            {isManualTokenMode && (
              <div className="mt-3.5 bg-teal-50/45 border border-teal-200 rounded-xl p-4 space-y-2">
                <label className="text-[10px] font-bold text-teal-800 uppercase block">Ingresar Token de Acceso Temporal</label>
                <input
                  type="text"
                  placeholder="ya29.a0Axoo..."
                  value={accessToken}
                  onChange={(e) => {
                    setAccessToken(e.target.value);
                    if (e.target.value) {
                      setGdriveStatus('authorized');
                    } else {
                      setGdriveStatus('idle');
                    }
                  }}
                  className="w-full text-xs font-mono bg-white border border-teal-200 rounded-lg p-2 focus:outline-none text-slate-800"
                />
                <p className="text-[10px] text-teal-600 leading-relaxed font-medium">
                  Puedes copiar un Token temporal válido desde herramientas como el <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="underline font-bold">Oauth Playground de Google</a> seleccionando la API de Drive v3 y pegarlo aquí para saltarte el flujo de inicio de sesión visual.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="border border-slate-150 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 bg-slate-50/50">
          
          {/* Active status indicator */}
          <div className="flex items-center space-x-3.5 shrink-0 self-start md:self-auto">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              gdriveStatus === 'authorized' 
                ? 'bg-emerald-100 text-emerald-600' 
                : gdriveStatus === 'authorizing'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-slate-200 text-slate-400'
            }`}>
              {gdriveStatus === 'authorized' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <Database className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-extrabold text-slate-900 uppercase tracking-tight">Estado de la nube</p>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {gdriveStatus === 'authorized' ? (
                  <span className="text-emerald-600 font-bold">✓ Conectado a tu cuenta de Google Drive</span>
                ) : gdriveStatus === 'authorizing' ? (
                  <span className="text-amber-600 animate-pulse">Iniciando sesión segura...</span>
                ) : (
                  <span>No autenticado (Haga clic en Conectar)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {gdriveStatus !== 'authorized' ? (
              <button
                type="button"
                onClick={handleConnectWithOAuth}
                className="w-full md:w-auto text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition active:scale-98 rounded-xl px-5 py-3 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <Cloud className="w-4 h-4 text-teal-400 shrink-0" /> Generar Conexión Google Drive
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAccessToken('');
                  setGdriveStatus('idle');
                  setRemoteBackupInfo(null);
                  setStatusMessage('Desconectado de Google Drive.');
                }}
                className="w-full md:w-auto text-xs font-bold text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl px-4 py-2.5 cursor-pointer text-center"
              >
                Cerrar Sesión Google
              </button>
            )}
          </div>

        </div>

        {/* Operational buttons (Backup & Save & Restore) */}
        {gdriveStatus === 'authorized' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 animate-fadeIn">
            
            {/* Box 1: Save Backup */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Operación de Subida</span>
                <h5 className="font-extrabold text-slate-900 text-sm mt-1">Crear Respaldo en la Nube</h5>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Exporta tus acciones de la Bolsa de Santiago, aportes, dividendos declarados, y tramos de impuestos a tu espacio de Google Drive. Sobrescribirá respaldos previos.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center bg-white/40 p-2.5 rounded-lg">
                <div className="text-[11px] font-medium text-slate-600">
                  Respaldo guardado: <span className="font-bold text-slate-800">{remoteBackupInfo ? 'Sí' : 'No '}</span>
                </div>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleSaveBackup}
                  className="text-xs bg-slate-900 hover:bg-teal-600 text-white hover:text-slate-950 font-bold rounded-lg px-4.5 py-2.5 transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  {isLoading ? 'Guardando...' : 'Hacer Respaldo'}
                </button>
              </div>
            </div>

            {/* Box 2: Restore Backup */}
            <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Operación de Carga</span>
                <h5 className="font-extrabold text-slate-900 text-sm mt-1">Restaurar Respaldo Remoto</h5>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Descarga tus datos previamente guardados en la nube y sincronízalos nuevamente en este navegador. Reemplazará los aportes vigentes locales.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center bg-white/40 p-2.5 rounded-lg">
                <div className="text-[11px] font-medium text-slate-600">
                  Última versión: <span className="font-bold font-mono text-slate-700">{remoteBackupInfo ? remoteBackupInfo.modifiedTime : 'Ninguna'}</span>
                </div>
                <button
                  type="button"
                  disabled={isLoading || !remoteBackupInfo}
                  onClick={handleRestoreBackup}
                  className="text-xs bg-teal-600 text-slate-950 hover:bg-teal-500 font-bold rounded-lg px-4.5 py-2.5 transition active:scale-95 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                  title={!remoteBackupInfo ? "No hay archivo de respaldo existente para restaurar en tu Google Drive" : "Cargar portafolio desde la nube"}
                >
                  <RotateCw className="w-3.5 h-3.5 shrink-0" />
                  {isLoading ? 'Cargando...' : 'Restaurar Cloud'}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* Logging/Status status message bar */}
        {statusMessage && (
          <div className="bg-slate-950 text-slate-300 font-mono text-[10.5px] p-3 rounded-lg border border-slate-800 flex items-center justify-between shadow-md">
            <span>💻 {statusMessage}</span>
            <button 
              onClick={() => setStatusMessage('')} 
              className="text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer font-bold font-sans"
              title="Borrar logs"
            >
              ✕
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
