import { defineExtensionMessaging } from '@webext-core/messaging';

export interface ProtocolMap {
    GET_TTS_AUDIO(data: { text: string; tl: string }): { audioData?: string; error?: string };
    REQUEST_TOGGLE_SIDEBAR(): void;
    TOGGLE_SIDEBAR(): void;
    OPEN_URL(data: { url: string }): void;
    OPEN_EXPLORER(data: { word?: string; view?: string }): void;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
