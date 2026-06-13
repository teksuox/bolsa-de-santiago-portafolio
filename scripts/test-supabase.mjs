import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://hegossxaudxxfkpanadp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aROsHiFbEILTir1WOe2ZjQ_P1r5tTWI';

const TEST_EMAIL = 'test-prueba@portafolio.cl';
const TEST_PASS = 'Test123456!';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
  console.log('🧪 Test de conexión Supabase\n');

  // 1. Health check
  console.log('1. Probando conexión...');
  const { data: health, error: healthErr } = await supabase.from('portafolios').select('count', { count: 'exact', head: true });
  if (healthErr && healthErr.code === 'PGRST116') {
    console.log('   ✅ Conexión OK (tabla portafolios existe pero está vacía)');
  } else if (healthErr) {
    console.log('   ❌ Error:', healthErr.message);
    console.log('   ⚠️  Crea la tabla portafolios en SQL Editor de Supabase primero');
    process.exit(1);
  } else {
    console.log('   ✅ Conexión OK');
  }

  // 2. Signup test user (puede fallar si requiere confirmación email)
  console.log('\n2. Creando usuario de prueba...');
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASS,
  });
  if (signUpErr) {
    console.log(`   ⚠️  ${signUpErr.message}`);
    console.log('   Intentando login por si ya existe...');
  } else {
    console.log(`   ✅ Usuario creado: ${signUpData.user?.email}`);
  }

  // 3. Login
  console.log('\n3. Iniciando sesión...');
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  });
  if (loginErr) {
    console.log(`   ❌ ${loginErr.message}`);
    console.log('   Crea el usuario manualmente desde https://portafolio.ts (registro) o desde Supabase Auth');
    process.exit(1);
  }
  console.log(`   ✅ Sesión iniciada: ${loginData.user?.email}`);
  console.log(`   User ID: ${loginData.user?.id}`);

  // 4. Upload test data
  console.log('\n4. Subiendo datos de prueba...');
  const mockData = {
    holdings: [
      { id: 'test-1', ticker: 'CHILE', shares: 100, buyPrice: 150, buyDate: '2026-01-15' },
      { id: 'test-2', ticker: 'COPEC', shares: 50, buyPrice: 6000, buyDate: '2026-03-20' },
    ],
    dividends: [
      { id: 'div-test-1', ticker: 'CHILE', sharesCount: 100, amountPerShare: 15, totalAmount: 1500, payoutDate: '2026-06-01', received: true, estimated: false },
    ],
    refunds: [],
    annualPerformancePercent: 8.5,
    deletedTickers: [],
    customStocks: [],
    exportedAt: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase.from('portafolios').upsert(
    { user_id: loginData.user!.id, data: mockData },
    { onConflict: 'user_id' }
  );
  if (upsertErr) {
    console.log(`   ❌ Error al subir: ${upsertErr.message}`);
    process.exit(1);
  }
  console.log('   ✅ Datos de prueba subidos correctamente');

  // 5. Download and verify
  console.log('\n5. Descargando y verificando...');
  const { data: downloaded, error: downloadErr } = await supabase
    .from('portafolios')
    .select('data')
    .eq('user_id', loginData.user!.id)
    .single();

  if (downloadErr) {
    console.log(`   ❌ Error al descargar: ${downloadErr.message}`);
    process.exit(1);
  }

  const data = downloaded.data;
  const match = JSON.stringify(data.holdings) === JSON.stringify(mockData.holdings);
  if (match) {
    console.log('   ✅ Datos verificados correctamente');
  } else {
    console.log('   ❌ Los datos no coinciden');
    process.exit(1);
  }

  // 6. Clean up test data
  console.log('\n6. Limpiando datos de prueba...');
  const { error: deleteErr } = await supabase
    .from('portafolios')
    .delete()
    .eq('user_id', loginData.user!.id);

  if (deleteErr) {
    console.log(`   ⚠️  No se pudo limpiar: ${deleteErr.message}`);
  } else {
    console.log('   ✅ Datos de prueba eliminados');
  }

  // 7. Sign out
  console.log('\n7. Cerrando sesión de prueba...');
  await supabase.auth.signOut();
  console.log('   ✅ Sesión cerrada');

  console.log('\n🎉 Todas las pruebas pasaron. Supabase funciona correctamente.');
}

test().catch(console.error);
