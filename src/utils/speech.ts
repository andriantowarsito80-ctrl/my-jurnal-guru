export type VoiceMode =
  | 'webspeech-ibu'
  | 'webspeech-pak'
  | 'gemini-kore'
  | 'gemini-puck';

const clientAudioCache = new Map<string, string>();
let activeAudio: HTMLAudioElement | null = null;
let activeAbortController: AbortController | null = null;
// Keep reference to prevent Chromium GC from dropping onend/onerror callbacks
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function isWebSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

export function getAvailableWebSpeechVoices(): SpeechSynthesisVoice[] {
  if (!isWebSpeechSupported()) return [];
  const voices = window.speechSynthesis.getVoices();
  return [...voices].sort((a, b) => {
    const aId = a.lang.toLowerCase().startsWith('id') ? 0 : 1;
    const bId = b.lang.toLowerCase().startsWith('id') ? 0 : 1;
    if (aId !== bId) return aId - bId;
    return a.name.localeCompare(b.name);
  });
}

function pickIndonesianVoice(
  voices: SpeechSynthesisVoice[],
  preferredGender: 'female' | 'male',
  voiceURI?: string
): SpeechSynthesisVoice | undefined {
  if (voiceURI) {
    const exact = voices.find((v) => v.voiceURI === voiceURI);
    if (exact) return exact;
  }

  const idVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('id') ||
      v.name.toLowerCase().includes('indonesia')
  );

  const pool = idVoices.length > 0 ? idVoices : voices;
  if (pool.length === 0) return undefined;

  if (preferredGender === 'male') {
    const maleMatch = pool.find((v) =>
      /\b(male|pria|laki|ardi|andika|damayanti|pak)\b/i.test(v.name) &&
      !/female|wanita|perempuan|gadis|siti/i.test(v.name)
    );
    if (maleMatch) return maleMatch;
  } else {
    const femaleMatch = pool.find((v) =>
      /\b(female|wanita|perempuan|gadis|siti|ibu|google bahasa indonesia)\b/i.test(
        v.name
      )
    );
    if (femaleMatch) return femaleMatch;
  }

  return idVoices[0] ?? pool[0];
}

export function stopSpeaking(): void {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  activeUtterance = null;
  if (isWebSpeechSupported()) {
    window.speechSynthesis.cancel();
  }
}

export function speakWithWebSpeech(options: {
  text: string;
  gender?: 'female' | 'male';
  voiceURI?: string;
  onStart?: () => void;
  onEnd?: () => void;
}): boolean {
  const { text, gender = 'female', voiceURI, onStart, onEnd } = options;

  if (!isWebSpeechSupported()) {
    onEnd?.();
    return false;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = gender === 'male' ? 0.98 : 1.02;
    utterance.pitch = gender === 'male' ? 0.88 : 1.08;
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const chosenVoice = pickIndonesianVoice(voices, gender, voiceURI);
    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang || 'id-ID';
    }

    utterance.onstart = () => {
      onStart?.();
    };
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
      onEnd?.();
    };
    utterance.onerror = () => {
      if (activeUtterance === utterance) activeUtterance = null;
      onEnd?.();
    };

    activeUtterance = utterance;
    onStart?.();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    activeUtterance = null;
    onEnd?.();
    return false;
  }
}

export async function speakAttendancePhrase(options: {
  text: string;
  style?: string;
  mode?: VoiceMode;
  webSpeechVoiceURI?: string;
  onStart?: () => void;
  onEnd?: () => void;
}): Promise<void> {
  const {
    text,
    style,
    mode = 'webspeech-ibu',
    webSpeechVoiceURI,
    onStart,
    onEnd,
  } = options;

  stopSpeaking();

  if (mode === 'webspeech-ibu' || mode === 'webspeech-pak') {
    speakWithWebSpeech({
      text,
      gender: mode === 'webspeech-pak' ? 'male' : 'female',
      voiceURI: webSpeechVoiceURI,
      onStart,
      onEnd,
    });
    return;
  }

  const voiceName = mode === 'gemini-puck' ? 'Puck' : 'Kore';
  const cacheKey = `${voiceName}::${style || ''}::${text}`;

  const playAudioUrl = (audioUrl: string, signal?: AbortSignal) => {
    if (signal?.aborted) return;
    const audio = new Audio(audioUrl);
    activeAudio = audio;
    audio.onplay = () => onStart?.();
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      onEnd?.();
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      speakWithWebSpeech({
        text,
        gender: voiceName === 'Puck' ? 'male' : 'female',
        voiceURI: webSpeechVoiceURI,
        onStart,
        onEnd,
      });
    };
    audio.play().catch(() => {
      speakWithWebSpeech({
        text,
        gender: voiceName === 'Puck' ? 'male' : 'female',
        voiceURI: webSpeechVoiceURI,
        onStart,
        onEnd,
      });
    });
  };

  const cachedUrl = clientAudioCache.get(cacheKey);
  if (cachedUrl) {
    playAudioUrl(cachedUrl);
    return;
  }

  const controller = new AbortController();
  activeAbortController = controller;

  try {
    onStart?.();
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, style, voiceName }),
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;

    if (!response.ok) {
      speakWithWebSpeech({
        text,
        gender: voiceName === 'Puck' ? 'male' : 'female',
        voiceURI: webSpeechVoiceURI,
        onStart,
        onEnd,
      });
      return;
    }

    const data = (await response.json()) as {
      audioBase64?: string;
      mimeType?: string;
    };

    if (controller.signal.aborted) return;

    if (data.audioBase64) {
      const mime = data.mimeType || 'audio/wav';
      const audioUrl = `data:${mime};base64,${data.audioBase64}`;
      if (clientAudioCache.size > 80) {
        const firstKey = clientAudioCache.keys().next().value;
        if (firstKey) clientAudioCache.delete(firstKey);
      }
      clientAudioCache.set(cacheKey, audioUrl);
      playAudioUrl(audioUrl, controller.signal);
    } else {
      speakWithWebSpeech({
        text,
        gender: voiceName === 'Puck' ? 'male' : 'female',
        voiceURI: webSpeechVoiceURI,
        onStart,
        onEnd,
      });
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }
    speakWithWebSpeech({
      text,
      gender: voiceName === 'Puck' ? 'male' : 'female',
      voiceURI: webSpeechVoiceURI,
      onStart,
      onEnd,
    });
  } finally {
    if (activeAbortController === controller) {
      activeAbortController = null;
    }
  }
}
