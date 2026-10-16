export interface DemandPredictionRequest {
  storeId: string;
  productId: string;
  from: string;
  to: string;
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
 * The Python prediction API is a future integration.
 * Throwing here is intentional: the app must never show fabricated predictions.
 */
export class UnconfiguredPredictionService implements PredictionService {
  async predictDemand(_request: DemandPredictionRequest): Promise<DemandPredictionResult> {
    throw new Error('Demand prediction is not configured for this phase.');
  }
}