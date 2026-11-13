import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import rawColors from '@/constants/colors';
import { useAuth } from '@/src/presentation/context/AuthContext';
import { useProducts } from '@/src/presentation/context/ProductContext';
import { ApiPredictionService } from '@/src/services/prediction/predictionService';

const predictionService = new ApiPredictionService();

export default function PredictionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  const { products, loading: productsLoading } = useProducts();

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [predictionData, setPredictionData] = useState<any>(null);
  const [loadingPrediction, setLoadingPrediction] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePredict = async (productId: string) => {
    if (!session?.storeId) {
      setErrorMessage('No se encontró una tienda asociada a este usuario.');
      return;
    }

    setSelectedProduct(productId);
    setLoadingPrediction(true);
    setPredictionData(null);
    setErrorMessage(null);

    try {
      const result = await predictionService.predictDemand({
        productId: productId,
        storeId: session.storeId,
      });

      setPredictionData(result);
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al conectar con la IA de predicción.');
    } finally {
      setLoadingPrediction(false);
    }
  };

  return (
    <LinearGradient
      colors={rawColors.brand.gradient}
      locations={rawColors.brand.gradientLocations}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Encabezado */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>Inteligencia Artificial</Text>
            <Text style={styles.title}>Demanda y Reorden</Text>
            <Text style={styles.storeName}>{session?.storeName ?? 'Tu tienda'}</Text>
          </View>
        </View>

        {/* Tarjeta Informativa */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Asistente LightGBM</Text>
            <Text style={styles.badge}>Activo</Text>
          </View>
          <Text style={styles.cardText}>
            Selecciona un producto de tu inventario para proyectar la demanda de los próximos 7 días y calcular sugerencias de compra exactas para tu tienda.
          </Text>
        </View>

        {/* Resultado de la Predicción */}
        {selectedProduct && (
          <View style={styles.resultCard}>
            <Text style={styles.resultHeader}>📊 Resultado del Análisis</Text>
            
            {loadingPrediction ? (
              <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#1F5C8C" />
                <Text style={styles.loaderText}>Calculando proyección con IA...</Text>
              </View>
            ) : errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : predictionData ? (
              <View style={styles.resultContent}>
                <Text style={styles.productNameHighlight}>
                  Producto ID: {predictionData.productId}
                </Text>
                <View style={styles.metricRow}>
                  <Text style={styles.metricLabelText}>Demanda Proyectada (7 días):</Text>
                  <Text style={styles.metricValueText}>{predictionData.predictedQuantity} unds</Text>
                </View>
                <Text style={styles.timestampText}>
                  Generado el: {new Date(predictionData.generatedAt).toLocaleString()}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Lista de Productos para Evaluar */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tus Productos ({products.length})</Text>
          
          {productsLoading && (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginTop: 20 }} />
          )}

          {!productsLoading && products.length === 0 && (
            <View style={styles.card}>
              <Text style={styles.cardText}>No hay productos registrados en esta tienda.</Text>
            </View>
          )}

          {!productsLoading && products.map((product) => {
            const isSelected = selectedProduct === product.id;
            return (
              <Pressable
                key={product.id}
                onPress={() => handlePredict(product.id)}
                style={[
                  styles.productRow,
                  isSelected && styles.productRowSelected,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productCategory}>Stock actual: {product.stock ?? 0}</Text>
                </View>
                <View style={styles.actionButtonBadge}>
                  <Text style={styles.actionButtonText}>Predecir</Text>
                  <Feather name="chevron-right" size={16} color="#1F5C8C" />
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, color: 'rgba(255,255,255,0.82)' },
  title: { fontSize: 26, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  storeName: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.82)', marginTop: 2 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 8,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#16283D' },
  badge: { backgroundColor: '#EAF2F8', color: '#1F5C8C', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, fontSize: 11, fontWeight: '700' },
  cardText: { fontSize: 14, color: '#5B7184', lineHeight: 20 },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    gap: 12,
    borderWidth: 2,
    borderColor: '#1F5C8C',
  },
  resultHeader: { fontSize: 16, fontWeight: '700', color: '#16283D' },
  loaderContainer: { padding: 20, alignItems: 'center', gap: 10 },
  loaderText: { fontSize: 13, color: '#5B7184' },
  errorText: { color: '#C94C4C', fontWeight: '600', fontSize: 13 },
  resultContent: { gap: 8 },
  productNameHighlight: { fontSize: 14, fontWeight: '700', color: '#1F5C8C' },
  metricRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FBFD', padding: 10, borderRadius: 10 },
  metricLabelText: { fontSize: 13, color: '#5B7184', fontWeight: '600' },
  metricValueText: { fontSize: 16, fontWeight: '700', color: '#16283D' },
  timestampText: { fontSize: 11, color: '#94A3B8', textAlign: 'right' },
  sectionContainer: { gap: 12, marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  productRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productRowSelected: {
    borderWidth: 1.5,
    borderColor: '#1F5C8C',
    backgroundColor: '#F4F8FB',
  },
  productName: { fontSize: 15, fontWeight: '700', color: '#16283D' },
  productCategory: { fontSize: 12, color: '#5B7184', marginTop: 2 },
  actionButtonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAF2F8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  actionButtonText: { fontSize: 13, fontWeight: '700', color: '#1F5C8C' },
});