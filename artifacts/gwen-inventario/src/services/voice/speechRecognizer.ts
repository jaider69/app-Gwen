import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

type EventSubscription = {
  remove(): void;
};

export type SpeechState = 'idle' | 'listening' | 'unsupported' | 'error';

export class SpeechRecognizer {
  private onTranscriptCallback: ((transcript: string) => void) | null = null;
  private onErrorCallback: (() => void) | null = null;
  private onEndCallback: (() => void) | null = null;
  private isWeb: boolean = Platform.OS === 'web';
  private webRecognition: WebSpeechRecognitionInstance | null = null;
  private nativeResultSubscription: EventSubscription | null = null;
  private nativeErrorSubscription: EventSubscription | null = null;
  private nativeEndSubscription: EventSubscription | null = null;

  get supported(): boolean {
    if (this.isWeb) {
      return this.getWebConstructor() !== null;
    }
    return ExpoSpeechRecognitionModule !== undefined;
  }

  private getWebConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') return null;
    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
  }

  async start(
    onTranscript: (transcript: string) => void,
    onError: () => void,
    onEnd: () => void,
  ): Promise<boolean> {
    this.onTranscriptCallback = onTranscript;
    this.onErrorCallback = onError;
    this.onEndCallback = onEnd;

    if (this.isWeb) {
      return this.startWeb();
    }

    return this.startNative();
  }

  private async startNative(): Promise<boolean> {
    try {
      const available = await ExpoSpeechRecognitionModule.supportsOnDeviceRecognition?.();
      if (available === false) {
        // Fallback: on-device no disponible pero puede funcionar con red
        // No fallamos aquí, continuamos
      }

      const permissions = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (!permissions.granted) {
        const requested = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
        if (!requested.granted) {
          this.onErrorCallback?.();
          return false;
        }
      }

      // Suscribirse a eventos
      this.nativeResultSubscription = ExpoSpeechRecognitionModule.addListener('result', (event: any) => {
        if (event.results && event.results.length > 0) {
          const transcript = event.results[0]?.transcript ?? '';
          console.log('Gwen escuchó:', transcript);
          if (transcript && this.onTranscriptCallback) {
            this.onTranscriptCallback(transcript);
          }
        }
      });

      this.nativeErrorSubscription = ExpoSpeechRecognitionModule.addListener('error', () => {
        this.onErrorCallback?.();
      });

      this.nativeEndSubscription = ExpoSpeechRecognitionModule.addListener('end', () => {
        this.onEndCallback?.();
      });

      // Iniciar reconocimiento
      ExpoSpeechRecognitionModule.start({
        lang: 'es-CO',
        interimResults: false,
        continuous: false,
      });

      return true;
    } catch (err) {
      console.error('Speech recognition error:', err);
      this.onErrorCallback?.();
      return false;
    }
  }

  private startWeb(): boolean {
    const Constructor = this.getWebConstructor();
    if (!Constructor) return false;
    this.stop();
    const recognition = new Constructor();
    recognition.lang = 'es-CO';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      if (transcript && this.onTranscriptCallback) {
        this.onTranscriptCallback(transcript);
      }
    };
    recognition.onerror = () => {
      this.onErrorCallback?.();
    };
    recognition.onend = () => {
      this.onEndCallback?.();
    };
    this.webRecognition = recognition;
    recognition.start();
    return true;
  }

  stop(): void {
    if (this.isWeb) {
      if (this.webRecognition) {
        try {
          this.webRecognition.stop();
        } catch {
          // ignore
        }
        this.webRecognition = null;
      }
    } else {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch {
        // ignore
      }
      if (this.nativeResultSubscription) {
        this.nativeResultSubscription.remove();
        this.nativeResultSubscription = null;
      }
      if (this.nativeErrorSubscription) {
        this.nativeErrorSubscription.remove();
        this.nativeErrorSubscription = null;
      }
      if (this.nativeEndSubscription) {
        this.nativeEndSubscription.remove();
        this.nativeEndSubscription = null;
      }
    }
    this.onTranscriptCallback = null;
    this.onErrorCallback = null;
    this.onEndCallback = null;
  }
}

type SpeechRecognitionConstructor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type WebSpeechRecognitionInstance = InstanceType<SpeechRecognitionConstructor>;