import { useLocalSearchParams } from 'expo-router';

import ProductFormScreen from '@/src/presentation/screens/ProductFormScreen';

export default function EditProductRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = Array.isArray(params.id) ? params.id[0] : params.id;
  return <ProductFormScreen productId={productId} />;
}