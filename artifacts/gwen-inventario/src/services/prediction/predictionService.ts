export interface DemandPredictionRequest {
  storeId: string;
  productId: string;
  from?: string;
  to?: string;
}

export interface DemandPredictionResult {
  productId: string;
  predictedQuantity: number;
  generatedAt: string;
}

export interface PredictionService {
  predictDemand(request: DemandPredictionRequest): Promise<DemandPredictionResult>;
}

/**
 * Servicio real que se conecta a la API de FastAPI en Render con LightGBM y Supabase.
 */
export class ApiPredictionService implements PredictionService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.EXPO_PUBLIC_PREDICTION_API_URL || 'https://gwen-inventario-api.onrender.com';
  }

  async predictDemand(request: DemandPredictionRequest): Promise<DemandPredictionResult> {
    try {
      const response = await fetch(`${this.apiUrl}/predecir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_producto: request.productId,
          id_tienda: request.storeId,
          dias_a_predecir: 7
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al obtener la predicción de la API');
      }

      const data = await response.json();

      return {
        productId: data.id_producto,
        predictedQuantity: data.demanda_predicha,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error en ApiPredictionService:', error);
      throw error;
    }
  }
}

/**
 * Servicio deshabilitado anterior (se mantiene por compatibilidad si se requiere).
 */
export class UnconfiguredPredictionService implements PredictionService {
  async predictDemand(_request: DemandPredictionRequest): Promise<DemandPredictionResult> {
    throw new Error('Demand prediction is not configured for this phase.');
  }
}