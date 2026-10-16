import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';

import { useProducts } from '@/src/presentation/context/ProductContext';

export default function InformesScreen() {
  const router = useRouter();
  const { sales, products } = useProducts();

  const completedSales = useMemo(
    () => sales.filter((sale) => sale.status === 'completed'),
    [sales]
  );

  const totalSales = useMemo(
    () => completedSales.reduce((total, sale) => total + sale.total, 0),
    [completedSales]
  );

  const today = new Date().toISOString().slice(0, 10);

  const salesToday = useMemo(
    () =>
      completedSales
        .filter((sale) => sale.soldAt.slice(0, 10) === today)
        .reduce((total, sale) => total + sale.total, 0),
    [completedSales, today]
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Feather name="arrow-left" size={22} color="#16283D" />
        </Pressable>

        <View>
          <Text style={styles.title}>Informe de ventas</Text>
          <Text style={styles.subtitle}>
            Resumen de las ventas de tu tienda
          </Text>
        </View>
      </View>

      <View style={styles.cards}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Feather name="dollar-sign" size={20} color="#1F5C8C" />
          </View>

          <Text style={styles.value}>
            {formatCurrency(totalSales)}
          </Text>

          <Text style={styles.label}>Ventas totales</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Feather name="shopping-bag" size={20} color="#1F5C8C" />
          </View>

          <Text style={styles.value}>
            {completedSales.length}
          </Text>

          <Text style={styles.label}>Ventas realizadas</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Feather name="calendar" size={20} color="#1F5C8C" />
          </View>

          <Text style={styles.value}>
            {formatCurrency(salesToday)}
          </Text>

          <Text style={styles.label}>Ventas de hoy</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Feather name="package" size={20} color="#1F5C8C" />
          </View>

          <Text style={styles.value}>
            {products.length}
          </Text>

          <Text style={styles.label}>Productos registrados</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ventas recientes</Text>

        {completedSales.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="bar-chart-2" size={32} color="#5B7184" />
            <Text style={styles.emptyText}>
              Todavía no hay ventas registradas.
            </Text>
          </View>
        ) : (
          completedSales.slice(-5).reverse().map((sale) => (
            <View key={sale.id} style={styles.saleRow}>
              <View style={styles.saleIcon}>
                <Feather
                  name="shopping-bag"
                  size={18}
                  color="#1F5C8C"
                />
              </View>

              <View style={styles.saleInfo}>
                <Text style={styles.saleTitle}>
                  Venta registrada
                </Text>

                <Text style={styles.saleDate}>
                  {formatDate(sale.soldAt)}
                </Text>
              </View>

              <Text style={styles.saleAmount}>
                {formatCurrency(sale.total)}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-CO')}`;
}

function formatDate(value: string) {
  const date = new Date(value);

  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 55,
    paddingBottom: 40,
    backgroundColor: '#F5F8FA',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 25,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#16283D',
  },

  subtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#5B7184',
  },

  cards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },

  card: {
    width: '48%',
    minHeight: 125,
    padding: 15,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
  },

  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EAF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  value: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16283D',
  },

  label: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#5B7184',
  },

  section: {
    gap: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#16283D',
  },

  empty: {
    minHeight: 150,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  emptyText: {
    color: '#5B7184',
    fontSize: 14,
  },

  saleRow: {
    minHeight: 70,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },

  saleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EAF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  saleInfo: {
    flex: 1,
  },

  saleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#16283D',
  },

  saleDate: {
    marginTop: 3,
    fontSize: 12,
    color: '#5B7184',
  },

  saleAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F5C8C',
  },
});