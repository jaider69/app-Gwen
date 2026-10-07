import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/AppBackground';
import colors from '@/constants/colors';
import { useProducts } from '@/src/presentation/context/ProductContext';
import type { Product } from '@/src/domain/models';
import {
  getHealthQueryProducts,
  normalizeVoiceText,
  parseQuantity,
  parseVoiceCommand,
  type VoiceCommand,
  type VoiceOperation,
} from '@/src/services/voice/voiceCommandService';
import { SpeechRecognizer } from '@/src/services/voice/speechRecognizer';

const G = colors.brand;
const SURFACE = colors.light;

type AssistantState = 'idle' | 'listening' | 'processing' | 'confirming' | 'result' | 'error';

type PendingOperation = {
  operation: VoiceOperation;
  product: Product;
  quantity: number | null;
};

export default function GwenScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { products, recordSale, recordEntry } = useProducts();
  const recognizer = useRef(new SpeechRecognizer()).current;
  const [state, setState] = useState<AssistantState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('Dime qué necesitas revisar o registrar.');
  const [input, setInput] = useState('');
  const [pendingCommand, setPendingCommand] = useState<VoiceCommand | null>(null);
  const [pendingOperation, setPendingOperation] = useState<PendingOperation | null>(null);

  const statusLabel = useMemo(() => {
    if (state === 'listening') return 'Escuchando...';
    if (state === 'processing') return 'Procesando...';
    if (state === 'confirming') return 'Confirmar operación';
    if (state === 'error') return 'No entendí el comando.';
    return state === 'result' ? 'Respuesta de Gwen' : 'Lista para ayudarte';
  }, [state]);

  function handleTranscript(text: string) {
    setTranscript(text);
    setState('processing');
    setTimeout(() => processText(text), 0);
  }

  async function startListening() {
    setResponse(
      recognizer.supported
        ? 'Habla ahora. Por ejemplo: "Gwen, vendí 3 Coca-Colas".'
        : 'El reconocimiento de voz no está disponible en esta versión. Puedes escribir el comando abajo o usar los botones táctiles.',
    );
    if (!recognizer.supported) {
      setState('error');
      return;
    }
    setState('listening');
    const started = await recognizer.start(
      handleTranscript,
      () => {
        setState('error');
        setResponse('No pude escuchar el comando. Revisa el permiso del micrófono e inténtalo de nuevo.');
      },
      () => setState((current) => (current === 'listening' ? 'idle' : current)),
    );
    if (!started) setState('error');
  }

  function processText(text: string) {
    if (pendingOperation && isConfirmation(text)) {
      setState('processing');
      void executePendingOperation(pendingOperation);
      return;
    }
    if (pendingOperation && isRejection(text)) {
      setPendingOperation(null);
      setState('result');
      setResponse('De acuerdo, no registré ningún cambio.');
      return;
    }
    if (pendingOperation && parseQuantity(text)) {
      const quantity = parseQuantity(text);
      if (quantity) {
        const next = { ...pendingOperation, quantity };
        setPendingOperation(next);
        setState('confirming');
        setResponse(confirmMessage(next));
        return;
      }
    }

    const command = parseVoiceCommand(text, products);
    setPendingCommand(command);
    if (command.kind === 'unknown') {
      setState('error');
      setResponse('No entendí el comando. Prueba: "vendí 3 Coca-Colas" o "¿cuántas Coca-Colas tengo?".');
      return;
    }
    if (command.kind === 'query') {
      processQuery(command);
      return;
    }
    if (command.productCandidates.length === 0) {
      setState('error');
      setResponse('No encontré ese producto en tu inventario.');
      return;
    }
    if (command.productCandidates.length > 1) {
      setState('result');
      setResponse('Encontré varios productos parecidos. Selecciona uno para continuar.');
      return;
    }
    prepareOperation(command, command.productCandidates[0]);
  }

  function processQuery(command: Extract<VoiceCommand, { kind: 'query' }>) {
    const matches = command.productCandidates.length
      ? command.productCandidates
      : getHealthQueryProducts(command.query, products);
    if (command.query === 'stock') {
      if (matches.length !== 1) {
        setState(matches.length > 1 ? 'result' : 'error');
        setResponse(matches.length > 1 ? 'Encontré varios productos parecidos. Selecciona uno.' : 'No encontré ese producto en tu inventario.');
        return;
      }
      setState('result');
      setResponse(`${matches[0].name} tiene ${matches[0].stock} ${matches[0].unit} disponibles.`);
      return;
    }
    setState('result');
    setResponse(
      matches.length
        ? `${command.query === 'low-stock' ? 'Productos con poco stock' : 'Productos agotados'}: ${matches.map((product) => product.name).join(', ')}.`
        : command.query === 'low-stock'
          ? 'No hay productos con poco stock.'
          : 'No hay productos agotados.',
    );
  }

  function prepareOperation(command: Extract<VoiceCommand, { kind: 'operation' }>, product: Product) {
    const pending = { operation: command.operation, product, quantity: command.quantity };
    setPendingOperation(pending);
    if (!command.quantity) {
      setState('result');
      setResponse(command.operation === 'sale' ? '¿Cuántas unidades vendiste?' : '¿Cuántas unidades llegaron?');
      return;
    }
    setState('confirming');
    setResponse(confirmMessage(pending));
  }

  async function executePendingOperation(operation: PendingOperation) {
    if (!operation.quantity) return;
    try {
      if (operation.operation === 'sale') await recordSale(operation.product.id, operation.quantity);
      else await recordEntry(operation.product.id, operation.quantity);
      setPendingOperation(null);
      setState('result');
      setResponse(
        operation.operation === 'sale'
          ? `Venta registrada: ${operation.quantity} ${operation.product.unit} de ${operation.product.name}.`
          : `Entrada registrada: +${operation.quantity} ${operation.product.unit} de ${operation.product.name}.`,
      );
    } catch (error) {
      setState('error');
      setResponse(error instanceof Error ? error.message : 'No pude registrar la operación.');
    }
  }

  function selectProduct(product: Product) {
    if (pendingCommand?.kind === 'operation') {
      prepareOperation(pendingCommand, product);
      return;
    }
    if (pendingCommand?.kind === 'query' && pendingCommand.query === 'stock') {
      setState('result');
      setResponse(`${product.name} tiene ${product.stock} ${product.unit} disponibles.`);
    }
  }

  function submitTypedCommand() {
    const value = input.trim();
    if (!value) return;
    setInput('');
    handleTranscript(value);
  }

  const ambiguousProducts = (pendingCommand?.kind === 'operation' || pendingCommand?.kind === 'query')
    && pendingCommand.productCandidates.length > 1
    ? pendingCommand.productCandidates
    : [];

  return (
    <AppBackground>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Volver al dashboard"
            style={[styles.back, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder }]}
          >
            <Feather name="arrow-left" size={20} color={G.onGradientText} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: G.onGradientTextMuted }]}>ASISTENTE</Text>
            <Text style={[styles.title, { color: G.onGradientText }]}>GWEN</Text>
          </View>
          <View style={[styles.gwenMark, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder }]}>
            <Feather name="mic" size={18} color={G.onGradientText} />
          </View>
        </View>

        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: G.onGradientGlassBg, borderColor: G.onGradientGlassBorder }]}>
            <Feather name="message-circle" size={22} color={G.onGradientText} />
          </View>
          <Text style={[styles.heroTitle, { color: G.onGradientText }]}>Habla con Gwen</Text>
          <Text style={[styles.heroText, { color: G.onGradientTextMuted }]}>Consulta tu inventario o prepara una entrada y una venta usando los mismos datos de la aplicación.</Text>
        </View>

        <View style={[styles.statusCard, { backgroundColor: SURFACE.card }]}>
          <View style={[styles.statusDot, { backgroundColor: state === 'error' ? SURFACE.destructive : state === 'listening' ? SURFACE.primary : SURFACE.border }]} />
          <Text style={[styles.statusLabel, { color: SURFACE.cardForeground }]}>{statusLabel}</Text>
          <Text style={[styles.response, { color: SURFACE.mutedForeground }]}>{response}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Activar micrófono de Gwen"
          onPress={state === 'listening' ? () => recognizer.stop() : () => void startListening()}
          style={({ pressed }) => [styles.micButton, { backgroundColor: state === 'listening' ? SURFACE.destructive : SURFACE.primary, opacity: pressed ? 0.78 : 1 }]}
        >
          <Feather name={state === 'listening' ? 'square' : 'mic'} size={26} color={SURFACE.primaryForeground} />
          <Text style={[styles.micText, { color: SURFACE.primaryForeground }]}>{state === 'listening' ? 'Detener' : 'Hablar con Gwen'}</Text>
        </Pressable>

        <View style={[styles.note, { backgroundColor: SURFACE.card }]}>
          <Feather name="info" size={16} color={SURFACE.primary} />
          <Text style={[styles.noteText, { color: SURFACE.cardForeground }]}>
            El reconocimiento de voz funciona en web (Web Speech API) y en móvil nativo (expo-speech-recognition). Requiere permiso de micrófono. La interfaz táctil y los datos locales siguen funcionando sin conexión.
          </Text>
        </View>

        <View style={styles.typedSection}>
          <Text style={[styles.sectionTitle, { color: G.onGradientText }]}>También puedes escribir</Text>
          <View style={[styles.inputRow, { backgroundColor: SURFACE.card }]}>
            <TextInput
              accessibilityLabel="Escribir comando para Gwen"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={submitTypedCommand}
              placeholder="Ej. vendí 3 Coca-Colas"
              placeholderTextColor={SURFACE.mutedForeground}
              style={[styles.input, { color: SURFACE.cardForeground }]}
              returnKeyType="send"
            />
            <Pressable onPress={submitTypedCommand} accessibilityRole="button" accessibilityLabel="Enviar comando escrito" style={[styles.send, { backgroundColor: SURFACE.primary }]}>
              <Feather name="arrow-up" size={18} color={SURFACE.primaryForeground} />
            </Pressable>
          </View>
        </View>

        {ambiguousProducts.length > 1 ? (
          <View style={styles.choiceSection}>
            <Text style={[styles.sectionTitle, { color: G.onGradientText }]}>¿Cuál producto?</Text>
            {ambiguousProducts.map((product: Product) => (
              <Pressable key={product.id} onPress={() => selectProduct(product)} style={[styles.choice, { backgroundColor: SURFACE.card }]}>
                <View style={[styles.choiceIcon, { backgroundColor: SURFACE.secondary }]}><Feather name="package" size={17} color={SURFACE.primary} /></View>
                <View style={styles.choiceCopy}>
                  <Text style={[styles.choiceName, { color: SURFACE.cardForeground }]}>{product.name}</Text>
                  <Text style={[styles.choiceMeta, { color: SURFACE.mutedForeground }]}>{product.stock} {product.unit} disponibles</Text>
                </View>
                <Feather name="chevron-right" size={17} color={SURFACE.mutedForeground} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {pendingOperation?.quantity ? (
          <View style={[styles.confirmCard, { backgroundColor: SURFACE.card, borderColor: SURFACE.primary }]}>
            <Feather name="shield" size={18} color={SURFACE.primary} />
            <Text style={[styles.confirmText, { color: SURFACE.cardForeground }]}>{confirmMessage(pendingOperation)}</Text>
            <View style={styles.confirmActions}>
              <Pressable onPress={() => void executePendingOperation(pendingOperation)} style={[styles.confirmButton, { backgroundColor: SURFACE.primary }]}>
                <Text style={[styles.confirmButtonText, { color: SURFACE.primaryForeground }]}>Sí, confirmar</Text>
              </Pressable>
              <Pressable onPress={() => { setPendingOperation(null); setState('result'); setResponse('De acuerdo, no registré ningún cambio.'); }} style={[styles.cancelButton, { borderColor: SURFACE.border }]}>
                <Text style={[styles.cancelButtonText, { color: SURFACE.mutedForeground }]}>Cancelar</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </AppBackground>
  );
}

function confirmMessage(operation: PendingOperation): string {
  const action = operation.operation === 'sale' ? 'registrar una venta' : 'registrar una entrada';
  return `Voy a ${action} de ${operation.quantity} ${operation.product.unit} de ${operation.product.name}. ¿Confirmas?`;
}

function isConfirmation(value: string): boolean {
  return /^(si|sí|confirmo|confirmar|de acuerdo|correcto)$/.test(normalizeVoiceText(value));
}

function isRejection(value: string): boolean {
  return /^(no|cancelar|cancela|cancelado)$/.test(normalizeVoiceText(value));
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 17 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, gap: 2 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 27, fontWeight: '700' },
  gwenMark: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { paddingVertical: 4, gap: 8 },
  heroIcon: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  heroTitle: { fontSize: 24, fontWeight: '700' },
  heroText: { fontSize: 13, lineHeight: 19 },
  statusCard: { borderRadius: 18, padding: 15, gap: 8 },
  statusDot: { width: 9, height: 9, borderRadius: 5 },
  statusLabel: { fontSize: 14, fontWeight: '700' },
  response: { fontSize: 14, lineHeight: 21 },
  micButton: { minHeight: 62, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  micText: { fontSize: 16, fontWeight: '700' },
  note: { borderRadius: 16, padding: 12, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  typedSection: { gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  inputRow: { minHeight: 54, borderRadius: 16, paddingLeft: 14, paddingRight: 7, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, fontSize: 14 },
  send: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  choiceSection: { gap: 9 },
  choice: { borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  choiceIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  choiceCopy: { flex: 1, gap: 3 },
  choiceName: { fontSize: 14, fontWeight: '700' },
  choiceMeta: { fontSize: 11 },
  confirmCard: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 10 },
  confirmText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  confirmActions: { flexDirection: 'row', gap: 8 },
  confirmButton: { flex: 1, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { fontSize: 13, fontWeight: '700' },
  cancelButton: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 13, fontWeight: '700' },
});