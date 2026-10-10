/**
 * Keeps a reply alive when the app is minimized.
 *
 * Android cuts a background app's network (Doze, battery limits) unless it holds a foreground
 * service, which dropped replies from the server partway through. While any text or image reply
 * is generating, this holds GenerationKeepAliveService, which shows a quiet "Replying" notification.
 */
import { NativeModules, Platform } from 'react-native';
import { generationService } from './generationService';
import { imageGenerationService } from './imageGenerationService';
import logger from '../utils/logger';

const native: { start: () => void; stop: () => void } | undefined = NativeModules.GenerationKeepAlive;

let textBusy = false;
let imageBusy = false;
let held = false;
let unsubscribers: Array<() => void> = [];

function update(): void {
  const busy = textBusy || imageBusy;
  if (busy === held || !native) return;
  held = busy;
  if (busy) native.start();
  else native.stop();
  logger.log(`[KeepAlive] ${busy ? 'holding' : 'released'}`);
}

/** Start watching generation. Idempotent; Android only. */
export function startGenerationKeepAlive(): void {
  if (Platform.OS !== 'android' || unsubscribers.length > 0) return;
  unsubscribers = [
    generationService.subscribe(state => {
      textBusy = state.isGenerating;
      update();
    }),
    imageGenerationService.subscribe(state => {
      imageBusy = state.isGenerating;
      update();
    }),
  ];
}

/** Stop watching and release the service. */
export function stopGenerationKeepAlive(): void {
  unsubscribers.forEach(unsubscribe => unsubscribe());
  unsubscribers = [];
  textBusy = false;
  imageBusy = false;
  update();
}
