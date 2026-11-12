import os
import numpy as np
import pandas as pd
import lightgbm as lgb
import joblib
import json
from datetime import datetime
from supabase import create_client, Client

# ==========================================
# 1. CONFIGURACIÓN DE SUPABASE
# ==========================================
SUPABASE_URL = "https://dijwrrmcsekjqjxbevfc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpandycm1jc2VranFqeGJldmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzY5NzYsImV4cCI6MjEwNzA1Mjk3Nn0.zBVxC7CTgJSgfxxh5ZkEumH1ztEkeqlQli4q7obeid0"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def extraer_datos_supabase():
    print("📥 Extrayendo datos de Supabase...")
    
    # Extraer productos
    res_prod = supabase.table("productos").select("*").execute()
    df_productos = pd.DataFrame(res_prod.data)
    
    # Extraer detalle de ventas y ventas para juntar la fecha
    res_ventas = supabase.table("ventas").select("id_venta, fecha_hora, id_tienda").execute()
    df_ventas = pd.DataFrame(res_ventas.data)
    
    res_detalle = supabase.table("detalle_venta").select("id_detalle, id_venta, id_producto, cantidad").execute()
    df_detalle = pd.DataFrame(res_detalle.data)
    
    if df_ventas.empty or df_detalle.empty or df_productos.empty:
        raise ValueError("⚠️ Las tablas en Supabase están vacías o faltan datos para entrenar.")
    
    # Unir ventas con detalles
    df_merged = pd.merge(df_detalle, df_ventas, on="id_venta", how="inner")
    df_merged['fecha'] = pd.to_datetime(df_merged['fecha_hora']).dt.date
    
    # Agrupar por fecha y producto
    df_diario = df_merged.groupby(['fecha', 'id_producto'])['cantidad'].sum().reset_index()
    df_diario = df_diario.rename(columns={'cantidad': 'unidades_vendidas'})
    
    return df_diario, df_productos

# ==========================================
# 2. CONSTRUCCIÓN DE VARIABLES Y CALENDARIO
# ==========================================
def preparar_features(df_diario, df_productos):
    print("⚙️ Procesando fechas, calendario y variables predictoras...")
    
    df_diario['fecha'] = pd.to_datetime(df_diario['fecha'])
    df_diario = df_diario.sort_values(['id_producto', 'fecha'])
    
    min_fecha = df_diario['fecha'].min()
    max_fecha = df_diario['fecha'].max()
    
    productos_unicos = df_diario['id_producto'].unique()
    rango_fechas = pd.date_range(start=min_fecha, end=max_fecha, freq='D')
    
    # Rejilla completa producto x fecha
    df_full = pd.MultiIndex.from_product([productos_unicos, rango_fechas], names=['id_producto', 'fecha']).to_frame(index=False)
    df_full = pd.merge(df_full, df_diario, on=['id_producto', 'fecha'], how='left').fillna({'unidades_vendidas': 0})
    
    # Variables de calendario
    df_full['anio'] = df_full['fecha'].dt.year
    df_full['mes'] = df_full['fecha'].dt.month
    df_full['dia_mes'] = df_full['fecha'].dt.day
    df_full['dia_semana'] = df_full['fecha'].dt.day_of_week
    df_full['semana_anio'] = df_full['fecha'].dt.isocalendar().week.astype(int)
    df_full['es_fin_de_semana'] = df_full['dia_semana'].isin([5, 6]).astype(int)
    df_full['es_dia_quincena'] = df_full['dia_mes'].isin([15, 30, 31]).astype(int)
    
    # Variables autorregresivas ajustadas para no vaciar el DataFrame si hay pocos días
    lags = [1, 2, 3, 7]
    for lag in lags:
        df_full[f'lag_{lag}'] = df_full.groupby('id_producto')['unidades_vendidas'].shift(lag)
        
    windows = [7, 14]
    for w in windows:
        df_full[f'rolling_mean_{w}'] = df_full.groupby('id_producto')['unidades_vendidas'].transform(lambda x: x.rolling(w).mean())
        df_full[f'rolling_std_{w}'] = df_full.groupby('id_producto')['unidades_vendidas'].transform(lambda x: x.rolling(w).std())
        
    # Unir con categoría
    df_full = pd.merge(df_full, df_productos[['id_producto', 'id_categoria']], on='id_producto', how='left')
    df_full['producto_cat'] = df_full['id_producto'].astype('category')
    df_full['categoria_cat'] = df_full['id_categoria'].astype('category')
    
    # Rellenar los nulos iniciales de los rezagos con 0 en lugar de borrarlos todos
    df_full = df_full.fillna(0)
    return df_full

# ==========================================
# 3. ENTRENAMIENTO LIGHTGBM POISSON
# ==========================================
def entrenar_modelo():
    try:
        df_diario, df_productos = extraer_datos_supabase()
        df_train = preparar_features(df_diario, df_productos)
        
        features = [col for col in df_train.columns if col not in ['fecha', 'unidades_vendidas', 'id_producto', 'id_categoria']]
        target = 'unidades_vendidas'
        
        X = df_train[features]
        y = df_train[target]
        
        print(f"🚀 Entrenando LightGBM Poisson con {len(X)} registros...")
        
        params = {
            'objective': 'poisson',
            'metric': 'rmse',
            'boosting_type': 'gbdt',
            'learning_rate': 0.05,
            'num_leaves': 31,
            'seed': 42,
            'verbose': -1
        }
        
        train_data = lgb.Dataset(X, label=y)
        modelo = lgb.train(params, train_data, num_boost_round=100)
        
        # Guardar modelo y metadatos
        joblib.dump(modelo, 'modelo_demanda.joblib')
        
        meta = {
            "features": features,
            "productos_conocidos": df_productos['id_producto'].tolist(),
            "fecha_entrenamiento": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        with open('meta_modelo.json', 'w') as f:
            json.dump(meta, f, indent=4)
            
        print("✅ ¡Modelo entrenado y guardado exitosamente como 'modelo_demanda.joblib' y 'meta_modelo.json'!")
        
    except Exception as e:
        print(f"❌ Error durante el entrenamiento: {e}")

if __name__ == "__main__":
    entrenar_modelo()