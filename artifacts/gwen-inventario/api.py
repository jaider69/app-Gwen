import os
import joblib
import json
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from supabase import create_client, Client

app = FastAPI(title="Gwen Inventario - API de Predicción de Demanda", version="1.0")

# ==========================================
# 1. CONFIGURACIÓN DE SUPABASE Y CARGA DE MODELO
# ==========================================
SUPABASE_URL = "https://dijwrrmcsekjqjxbevfc.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpandycm1jc2VranFqeGJldmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzY5NzYsImV4cCI6MjEwNzA1Mjk3Nn0.zBVxC7CTgJSgfxxh5ZkEumH1ztEkeqlQli4q7obeid0"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cargar modelo entrenado y metadatos
MODELO_PATH = "modelo_demanda.joblib"
META_PATH = "meta_modelo.json"

modelo = None
features_esperadas = []

if os.path.exists(MODELO_PATH) and os.path.exists(META_PATH):
    modelo = joblib.load(MODELO_PATH)
    with open(META_PATH, "r") as f:
        meta = json.load(f)
        features_esperadas = meta.get("features", [])
    print("✅ Modelo de demanda y metadatos cargados correctamente en la API.")
else:
    print("⚠️ ADVERTENCIA: No se encontró 'modelo_demanda.joblib' o 'meta_modelo.json'. Ejecuta 'entrenar_modelo.py' primero.")

# ==========================================
# 2. ESQUEMAS DE ENTRADA (PYDANTIC)
# ==========================================
class PrediccionRequest(BaseModel):
    id_producto: str
    id_tienda: str
    dias_a_predecir: Optional[int] = 7  # Por defecto 1 semana

# ==========================================
# 3. ENDPOINTS DE LA API
# ==========================================
@app.get("/")
def read_root():
    return {"status": "online", "mensaje": "API de Predicción de Demanda Gwen Inventario activa."}

@app.post("/predecir")
def predecir_demanda(request: PrediccionRequest):
    if not modelo:
        raise HTTPException(status_code=500, detail="El modelo de predicción no está cargado en el servidor.")
    
    try:
        # 1. Obtener stock actual del producto en el inventario de la tienda del usuario actual desde Supabase
        inv_query = supabase.table("inventario").select("stock_actual, stock_minimo, punto_reorden").eq("id_producto", request.id_producto)
        
        if request.id_tienda:
            inv_query = inv_query.eq("id_tienda", request.id_tienda)
        
        inv_res = inv_query.execute()
        
        stock_actual = 0
        punto_reorden = 0
        if inv_res.data and len(inv_res.data) > 0:
            stock_actual = inv_res.data[0].get("stock_actual", 0)
            punto_reorden = inv_res.data[0].get("punto_reorden", 0)

        # 2. Obtener la categoría del producto
        prod_res = supabase.table("productos").select("id_categoria").eq("id_producto", request.id_producto).execute()
        id_categoria = prod_res.data[0].get("id_categoria") if prod_res.data else "general"

        # 3. Construir datos recientes para la predicción usando .weekday() correctamente
        hoy = datetime.now()
        dia_sem = hoy.weekday()  # 0 = Lunes, 6 = Domingo
        
        # Generar features de prueba basados en el momento actual para las características que espera el modelo
        fila_datos = {
            'anio': hoy.year,
            'mes': hoy.month,
            'dia_mes': hoy.day,
            'dia_semana': dia_sem,
            'semana_anio': hoy.isocalendar()[1],
            'es_fin_de_semana': 1 if dia_sem in [5, 6] else 0,
            'es_dia_quincena': 1 if hoy.day in [15, 30, 31] else 0,
            'lag_1': 2, 'lag_2': 2, 'lag_3': 2, 'lag_7': 2,
            'rolling_mean_7': 2.0, 'rolling_std_7': 0.5,
            'rolling_mean_14': 2.0, 'rolling_std_14': 0.5,
            'producto_cat': request.id_producto,
            'categoria_cat': id_categoria
        }

        # Asegurar que todas las columnas que espera el modelo estén presentes
        # Asegurar que todas las columnas que espera el modelo estén presentes y con el tipo correcto
        df_input = pd.DataFrame([fila_datos])
        for col in features_esperadas:
            if col not in df_input.columns:
                df_input[col] = 0

        df_input = df_input[features_esperadas]

        # Convertir columnas categóricas al tipo 'category' si el modelo las registró así
        for col in ['producto_cat', 'categoria_cat']:
            if col in df_input.columns:
                df_input[col] = df_input[col].astype('category')

        # 4. Predecir demanda diaria y multiplicar por los días solicitados
        demanda_diaria_predicha = modelo.predict(df_input)[0]
        demanda_total_predicha = max(0, round(demanda_diaria_predicha * request.dias_a_predecir))

        # 5. Regla de negocio: Restar stock actual para calcular sugerencia de pedido
        sugerencia_pedido = max(0, demanda_total_predicha - stock_actual)
        es_urgente = stock_actual <= punto_reorden or sugerencia_pedido > stock_actual

        return {
            "id_producto": request.id_producto,
            "dias_evaluados": request.dias_a_predecir,
            "demanda_predicha": demanda_total_predicha,
            "stock_actual": stock_actual,
            "punto_reorden": punto_reorden,
            "sugerencia_pedido": sugerencia_pedido,
            "es_urgente": es_urgente,
            "mensaje": f"Se proyecta vender {demanda_total_predicha} unidades. Tienes {stock_actual} en stock. Sugerencia de compra: {sugerencia_pedido} unidades."
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al calcular la predicción: {str(e)}")