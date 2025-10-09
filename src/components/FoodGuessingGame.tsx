'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { getDistance } from 'geolib';
import { CookieManager } from '../utils/cookieManager';
import Image from 'next/image';

interface Food {
  id: number;
  name: string;
  country: string;
  images: string[];
  imageCount: number;
  lat: number;
  lng: number;
  location: string;
  city: string;
  originCity?: string;
  fact: string;
  description?: string;
}

interface GameState {
  currentFood: Food | null;
  currentImage: string | null;
  guessPosition: { lat: number; lng: number } | null;
  correctPosition: { lat: number; lng: number } | null;
  distance: number | null;
  timeLeft: number;
  gamePhase: 'playing' | 'result' | 'finalScore';
  score: number;
  round: number;
  usedFoods: number[];
  roundScore: number;
  totalDistance: number;
  startTime: number;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Mobile-responsive map container
const getMapContainerStyle = (isMobile: boolean) => ({
  width: '100%',
  height: isMobile ? '60vh' : '100%',
  minHeight: isMobile ? '300px' : '400px',
});

const miniMapStyle = {
  width: '100%',
  height: '100%',
};

const center = {
  lat: 20,
  lng: 0,
};

const funNicknames = [
  // Original fun names
  'FoodieExplorer', 'TasteBudTraveler', 'CulinaryDetective', 'FlavorHunter', 'SpiceSeeker',
  'WorldEater', 'DishDiscoverer', 'GlobalGourmet', 'FoodieNomad', 'TasteTracker',
  'DeliciousDetective', 'CravingCrusader', 'YummyYielder', 'SavorSleuth', 'BiteTracker',
  'FeastFinder', 'NomNomNavigator', 'TastyTraveler', 'FlavorFinder', 'CuisineComet',
  
  // Lighthearted embarrassing names
  'Wife', 'Stoopid', 'Acoustic', 'Boomer', 'Karen', 'Chad', 'Kyle', 'Becky', 'Basic',
  'Cringe', 'CringeLord', 'Noob', 'Rookie', 'Amateur', 'Beginner', 'Newbie', 'Greenhorn',
  'Clueless', 'Confused', 'Lost', 'Bewildered', 'Puzzled', 'Perplexed', 'Baffled',
  'Silly', 'Goofy', 'Dorky', 'Nerdy', 'Geeky', 'Dweeby', 'Awkward', 'Weird',
  'Strange', 'Odd', 'Quirky', 'Eccentric', 'Bizarre', 'Wacky', 'Zany', 'Loony',
  'SillyGoose', 'Goofball', 'Dingbat', 'Dingus', 'Dumbo', 'Dunce', 'Blockhead',
  'Knucklehead', 'Bonehead', 'Airhead', 'Spacey', 'Scatterbrained', 'Absentminded',
  'Forgetful', 'Clumsy', 'AwkwardTurtle', 'SociallyAwkward', 'Introvert', 'Hermit',
  'Loner', 'Outcast', 'Misfit', 'Rebel', 'Troublemaker', 'Rascal', 'Scamp',
  'Prankster', 'Jokester', 'Comedian', 'Clown', 'Jester', 'Fool', 'Buffoon'
];

export default function FoodGuessingGame() {
  // Settings state - moved to top to avoid declaration order issues
  const [showSettings, setShowSettings] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [effectVolume, setEffectVolume] = useState(0.7);
  const [musicVolume, setMusicVolume] = useState(0.3);
  const [soundOn, setSoundOn] = useState(true);
  const [animationsOn, setAnimationsOn] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);
  
  // Game pause state
  const [isGamePaused, setIsGamePaused] = useState(false);
  
  // Countdown beep state
  const [countdownTimeouts, setCountdownTimeouts] = useState<NodeJS.Timeout[]>([]);
  const [beepSound, setBeepSound] = useState<HTMLAudioElement | null>(null);
  
  // Individual countdown beep sounds (10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
  const [beepSounds, setBeepSounds] = useState<HTMLAudioElement[]>([]);

  // Game state
  const [gameState, setGameState] = useState<GameState>({
    currentFood: null,
    currentImage: null,
    guessPosition: null,
    correctPosition: null,
    distance: null,
    timeLeft: 60,
    gamePhase: 'playing',
    score: 0,
    round: 0,
    usedFoods: [],
    roundScore: 0,
    totalDistance: 0,
    startTime: Date.now(),
  });

  // Whoosh sound for transition
  const [whooshSound, setWhooshSound] = useState<HTMLAudioElement | null>(null);
  
  // Final score sound
  const [finalScoreSound, setFinalScoreSound] = useState<HTMLAudioElement | null>(null);
  
  // Final round results screen sound
  const [finalRoundResultsSound, setFinalRoundResultsSound] = useState<HTMLAudioElement | null>(null);
  
  // Results screen map sound (only for guess cases)
  const [resultsMapSound, setResultsMapSound] = useState<HTMLAudioElement | null>(null);
  

  const [foods, setFoods] = useState<Food[]>([]);
  const [imageHistory, setImageHistory] = useState<Record<string, number[]>>({});
  const [mapKey, setMapKey] = useState(0);
  
  // Debug panel state
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    foodsUsed: 0,
    lastPlayed: 'Never'
  });

  // Update session stats
  const updateSessionStats = useCallback(() => {
    const stats = CookieManager.getSessionStats();
    setSessionStats(stats);
  }, []);
  
  // Nickname state
  const [nickname, setNickname] = useState<string>('');
  const [nicknameInput, setNicknameInput] = useState<string>('');
  const [showNicknameScreen, setShowNicknameScreen] = useState<boolean>(true);
  
  // Multiplayer button states
  const [multiplayerButtonText, setMultiplayerButtonText] = useState<string>('🌐 Multiplayer');
  const [privateRoomButtonText, setPrivateRoomButtonText] = useState<string>('🏠 Create Private Room');
  
  // Custom images state
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState<number>(0);
  const [correctLocationImage] = useState<string>('/assets/flags/correct-location.png'); // Fixed image
  const [avatarImages, setAvatarImages] = useState<string[]>([]);
  const [locationImageData, setLocationImageData] = useState<string>('');
  
  // Pre-defined avatar options
  const avatarOptions = [
    '/assets/avatars/avatar1.png',
    '/assets/avatars/avatar2.png',
    '/assets/avatars/avatar3.png',
    '/assets/avatars/avatar4.png',
    '/assets/avatars/avatar5.png',
    '/assets/avatars/avatar6.png'
  ];

  // Audio context for sound effects
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [mapClickSound, setMapClickSound] = useState<AudioBuffer | null>(null);
  const [drumrollSound, setDrumrollSound] = useState<AudioBuffer | null>(null);
  const [noGuessSound, setNoGuessSound] = useState<AudioBuffer | null>(null);
  const [tenSecondsSound, setTenSecondsSound] = useState<AudioBuffer | null>(null);

  // Background music
  const [gameScreenMusic, setGameScreenMusic] = useState<HTMLAudioElement | null>(null);
  const [resultsScreenMusic, setResultsScreenMusic] = useState<HTMLAudioElement | null>(null);
  const [currentBgMusic, setCurrentBgMusic] = useState<HTMLAudioElement | null>(null);
  
  // Bell sound for countdown
  const [bellSound, setBellSound] = useState<HTMLAudioElement | null>(null);
  
  // Bell sound for 60-second timer
  const [bell1Sound, setBell1Sound] = useState<HTMLAudioElement | null>(null);
  
  // Individual countdown sounds for 3, 2, 1
  const [countdown3Sound, setCountdown3Sound] = useState<HTMLAudioElement | null>(null);
  const [countdown2Sound, setCountdown2Sound] = useState<HTMLAudioElement | null>(null);
  const [countdown1Sound, setCountdown1Sound] = useState<HTMLAudioElement | null>(null);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContext) {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      setAudioContext(ctx);
    }
  }, [audioContext]);

  // Load map click sound on component mount
  useEffect(() => {
    const loadMapClickSound = async () => {
      if (!audioContext) return;
      
      try {
        const response = await fetch('/sounds/mapclick.wav');
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          setMapClickSound(audioBuffer);
          console.log('Map click sound loaded successfully!');
        } else {
          console.log('Map click sound not found, using generated sound');
        }
      } catch (error) {
        console.log('Error loading map click sound, using generated sound:', error);
      }
    };

    if (audioContext && !mapClickSound) {
      loadMapClickSound();
    }
  }, [audioContext, mapClickSound]);

  // Load drumroll sound on component mount
  useEffect(() => {
    const loadDrumrollSound = async () => {
      if (!audioContext) return;
      
      try {
        const response = await fetch('/sounds/drumroll.wav');
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          setDrumrollSound(audioBuffer);
          console.log('Drumroll sound loaded successfully!');
        } else {
          console.log('Drumroll sound not found, using generated sound');
        }
      } catch (error) {
        console.log('Error loading drumroll sound, using generated sound:', error);
      }
    };

    if (audioContext && !drumrollSound) {
      loadDrumrollSound();
    }
  }, [audioContext, drumrollSound]);

  // Load no-guess sound on component mount
  useEffect(() => {
    const loadNoGuessSound = async () => {
      if (!audioContext) return;
      
      try {
        const response = await fetch('/sounds/no-guess.wav');
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          setNoGuessSound(audioBuffer);
          console.log('No-guess sound loaded successfully!');
        } else {
          console.log('No-guess sound not found, using generated sound');
        }
      } catch (error) {
        console.log('Error loading no-guess sound, using generated sound:', error);
      }
    };

    if (audioContext && !noGuessSound) {
      loadNoGuessSound();
    }
  }, [audioContext, noGuessSound]);

  // Load 10-seconds sound on component mount
  useEffect(() => {
    const loadTenSecondsSound = async () => {
      if (!audioContext) return;
      
      try {
        const response = await fetch('/sounds/10-seconds.wav');
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          setTenSecondsSound(audioBuffer);
          console.log('10-seconds sound loaded successfully!');
        } else {
          console.log('10-seconds sound not found, using generated sound');
        }
      } catch (error) {
        console.log('Error loading 10-seconds sound, using generated sound:', error);
      }
    };

    if (audioContext && !tenSecondsSound) {
      loadTenSecondsSound();
    }
  }, [audioContext, tenSecondsSound]);

  // Load background music
  useEffect(() => {
    const loadBackgroundMusic = () => {
      // Load game screen background music
      const gameMusic = new Audio('/music/game-screen.mp3');
      gameMusic.loop = true;
      gameMusic.volume = 0.3; // Start with lower volume
      gameMusic.addEventListener('canplaythrough', () => {
        console.log('Game screen music loaded successfully');
      });
      gameMusic.addEventListener('error', (e) => {
        console.error('Error loading game screen music:', e);
      });
      setGameScreenMusic(gameMusic);

      // Load results screen background music
      const resultsMusic = new Audio('/music/results-screen.mp3');
      resultsMusic.loop = true;
      resultsMusic.volume = 0.3; // Start with lower volume
      resultsMusic.addEventListener('canplaythrough', () => {
        console.log('Results screen music loaded successfully');
      });
      resultsMusic.addEventListener('error', (e) => {
        console.error('Error loading results screen music:', e);
      });
      setResultsScreenMusic(resultsMusic);

      // Load bell sound for countdown
      const bell = new Audio('/sounds/bell.mp3');
      bell.volume = 0.5; // Slightly louder for the bell sound
      bell.addEventListener('canplaythrough', () => {
        console.log('Bell sound loaded successfully');
      });
      bell.addEventListener('error', (e) => {
        console.error('Error loading bell sound:', e);
      });
      setBellSound(bell);

      // Load bell-1 sound for 60-second timer
      const bell1 = new Audio('/sounds/bell-1.mp3');
      bell1.volume = 0.5; // Same volume as bell sound
      bell1.addEventListener('canplaythrough', () => {
        console.log('Bell-1 sound loaded successfully');
      });
      bell1.addEventListener('error', (e) => {
        console.error('Error loading bell-1 sound:', e);
      });
      setBell1Sound(bell1);

      // Load individual countdown sounds for 3, 2, 1
      const countdown3 = new Audio('/sounds/3.mp3');
      countdown3.volume = 0.5; // Same volume as bell sound
      countdown3.preload = 'auto';
      countdown3.addEventListener('canplaythrough', () => {
        console.log('Countdown 3 sound loaded successfully');
      });
      countdown3.addEventListener('error', (e) => {
        console.error('Error loading countdown 3 sound:', e);
      });
      countdown3.addEventListener('loadstart', () => {
        console.log('Countdown 3 sound loading started');
      });
      setCountdown3Sound(countdown3);

      const countdown2 = new Audio('/sounds/2.mp3');
      countdown2.volume = 0.5;
      countdown2.preload = 'auto';
      countdown2.addEventListener('canplaythrough', () => {
        console.log('Countdown 2 sound loaded successfully');
      });
      countdown2.addEventListener('error', (e) => {
        console.error('Error loading countdown 2 sound:', e);
      });
      countdown2.addEventListener('loadstart', () => {
        console.log('Countdown 2 sound loading started');
      });
      setCountdown2Sound(countdown2);

      const countdown1 = new Audio('/sounds/1.mp3');
      countdown1.volume = 0.5;
      countdown1.preload = 'auto';
      countdown1.addEventListener('canplaythrough', () => {
        console.log('Countdown 1 sound loaded successfully');
      });
      countdown1.addEventListener('error', (e) => {
        console.error('Error loading countdown 1 sound:', e);
      });
      countdown1.addEventListener('loadstart', () => {
        console.log('Countdown 1 sound loading started');
      });
      setCountdown1Sound(countdown1);
    };

    loadBackgroundMusic();
  }, []);

  // Background music functions
  const playMusic = useCallback((music: HTMLAudioElement, startTime: number = 0) => {
    if (!music || !soundOn) return;
    
    console.log('Playing music with startTime:', startTime);
    music.currentTime = startTime; // Set the start time
    music.volume = musicVolume; // Use current settings volume
    music.play().catch(console.log);
    
    // Verify the time was set correctly
    setTimeout(() => {
      console.log('Music currentTime after play:', music.currentTime);
    }, 100);
  }, [soundOn, musicVolume]);

  const stopCurrentMusic = useCallback((music: HTMLAudioElement) => {
    if (!music) return;
    music.pause();
    // Don't reset currentTime to 0 - we want to preserve it for seamless transitions
  }, []);

  // Play bell sound for countdown
  const playBellSound = useCallback(() => {
    if (bellSound && soundOn) {
      console.log('Playing bell sound');
      bellSound.currentTime = 0; // Reset to beginning for bell sound
      bellSound.volume = effectVolume; // Use current settings volume
      bellSound.play().catch(console.log);
      
      // Return a promise that resolves when the bell sound finishes
      return new Promise<void>((resolve) => {
        const handleEnded = () => {
          console.log('Bell sound finished');
          bellSound.removeEventListener('ended', handleEnded);
          resolve();
        };
        bellSound.addEventListener('ended', handleEnded);
      });
    }
    return Promise.resolve();
  }, [bellSound, soundOn, effectVolume]);

  // Play bell-1 sound for 60-second timer
  const playBell1Sound = useCallback(() => {
    if (bell1Sound && soundOn) {
      console.log('Playing bell-1 sound');
      bell1Sound.currentTime = 0; // Reset to beginning for bell-1 sound
      bell1Sound.volume = effectVolume; // Use current settings volume
      bell1Sound.play().catch(console.log);
      
      // Return a promise that resolves when the bell-1 sound finishes
      return new Promise<void>((resolve) => {
        const handleEnded = () => {
          console.log('Bell-1 sound finished');
          bell1Sound.removeEventListener('ended', handleEnded);
          resolve();
        };
        bell1Sound.addEventListener('ended', handleEnded);
      });
    }
    return Promise.resolve();
  }, [bell1Sound, soundOn, effectVolume]);

  const playWhooshSound = useCallback(() => {
    if (whooshSound && soundOn) {
      console.log('Playing whoosh sound');
      whooshSound.currentTime = 0;
      whooshSound.volume = effectVolume;
      whooshSound.play().catch(console.log);
    } else {
      console.log('Whoosh sound not available or sound disabled');
    }
  }, [whooshSound, soundOn, effectVolume]);

  const playFinalScoreSound = useCallback(() => {
    if (finalScoreSound && soundOn) {
      console.log('Playing final score sound');
      finalScoreSound.currentTime = 0;
      finalScoreSound.volume = effectVolume;
      finalScoreSound.play().catch(console.log);
    } else {
      console.log('Final score sound not available or sound disabled');
    }
  }, [finalScoreSound, soundOn, effectVolume]);

  const playResultsMapSound = useCallback(() => {
    if (resultsMapSound && soundOn) {
      console.log('Playing results map sound');
      resultsMapSound.currentTime = 0;
      resultsMapSound.volume = effectVolume;
      resultsMapSound.play().catch(console.log);
    } else {
      console.log('Results map sound not available or sound disabled');
    }
  }, [resultsMapSound, soundOn, effectVolume]);

  // Play final round results sound
  const playFinalRoundResultsSound = useCallback(() => {
    if (finalRoundResultsSound && soundOn) {
      console.log('Playing final round results sound');
      finalRoundResultsSound.currentTime = 0;
      finalRoundResultsSound.volume = effectVolume;
      finalRoundResultsSound.play().catch(console.log);
    } else {
      console.log('Final round results sound not available or sound disabled');
    }
  }, [finalRoundResultsSound, soundOn, effectVolume]);


  // Play individual countdown sounds for 3, 2, 1
  const playCountdownSound = useCallback((number: 3 | 2 | 1) => {
    let sound: HTMLAudioElement | null = null;
    
    switch (number) {
      case 3:
        sound = countdown3Sound;
        break;
      case 2:
        sound = countdown2Sound;
        break;
      case 1:
        sound = countdown1Sound;
        break;
    }
    
    console.log(`Attempting to play countdown ${number} sound:`, {
      sound: sound,
      soundOn: soundOn,
      effectVolume: effectVolume,
      countdown3Sound: countdown3Sound,
      countdown2Sound: countdown2Sound,
      countdown1Sound: countdown1Sound
    });
    
    if (sound && soundOn) {
      console.log(`Playing countdown ${number} sound`);
      console.log(`Sound readyState: ${sound.readyState}, networkState: ${sound.networkState}`);
      sound.currentTime = 0; // Reset to beginning
      sound.volume = effectVolume; // Use current settings volume
      
      // Try to play the sound
      const playPromise = sound.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`Countdown ${number} sound started playing successfully`);
        }).catch((error) => {
          console.error(`Error playing countdown ${number} sound:`, error);
          // Try to load and play again
          sound.load();
          sound.play().catch((retryError) => {
            console.error(`Retry failed for countdown ${number} sound:`, retryError);
          });
        });
      }
    } else {
      console.log(`Cannot play countdown ${number} sound - sound: ${!!sound}, soundOn: ${soundOn}`);
    }
  }, [countdown3Sound, countdown2Sound, countdown1Sound, soundOn, effectVolume]);

  const switchBackgroundMusic = useCallback((newMusic: HTMLAudioElement) => {
    // Capture current time before switching
    let currentTime = 0;
    if (currentBgMusic && currentBgMusic !== newMusic) {
      currentTime = currentBgMusic.currentTime;
      stopCurrentMusic(currentBgMusic);
    }
    setCurrentBgMusic(newMusic);
    // Play new music from the same timestamp
    playMusic(newMusic, currentTime);
  }, [currentBgMusic, playMusic, stopCurrentMusic]);

  // Play map click sound effect (uses WAV file as default)
  const playMapClickSound = useCallback(() => {
    if (!audioContext) return;

    // Use WAV file if loaded
    if (mapClickSound) {
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = mapClickSound;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set volume
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      
      // Play the WAV sound
      source.start(audioContext.currentTime);
      return;
    }

    // Fallback to generated sound (simple click)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create simple click sound
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
    
    // Set volume envelope (quick attack, quick decay)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    // Start and stop the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }, [audioContext, mapClickSound]);

  // Play drumroll sound effect (uses WAV file as default)
  const playDrumrollSound = useCallback(() => {
    if (!audioContext) return;

    // Use WAV file if loaded
    if (drumrollSound) {
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = drumrollSound;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set volume
      gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
      
      // Play the WAV sound
      source.start(audioContext.currentTime);
      return;
    }

    // Fallback to generated drumroll sound
    const createDrumroll = () => {
      const duration = 2.0; // 2 seconds
      const sampleRate = audioContext.sampleRate;
      const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Create a drumroll pattern with increasing intensity
      for (let i = 0; i < data.length; i++) {
        const time = i / sampleRate;
        const progress = time / duration;
        
        // Create multiple drum hits with increasing frequency
        let sample = 0;
        
        // Main drum pattern - increasing frequency
        const baseFreq = 60 + (progress * 40); // 60-100 Hz
        const hitFreq = baseFreq * (1 + Math.sin(time * 8) * 0.1);
        
        // Create drum hit envelope
        const hitInterval = 0.1 + (progress * 0.05); // Faster hits over time
        const hitPhase = (time % hitInterval) / hitInterval;
        const hitEnvelope = Math.exp(-hitPhase * 15) * (1 - hitPhase);
        
        // Generate drum sound (low frequency with noise)
        const drumFreq = hitFreq * (1 + Math.random() * 0.1);
        sample += Math.sin(2 * Math.PI * drumFreq * time) * hitEnvelope * 0.3;
        
        // Add some noise for realism
        sample += (Math.random() * 2 - 1) * hitEnvelope * 0.1;
        
        // Overall envelope
        const overallEnvelope = Math.exp(-time * 0.5) * (1 - progress * 0.3);
        sample *= overallEnvelope;
        
        data[i] = sample;
      }
      
      return buffer;
    };

    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    
    source.buffer = createDrumroll();
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Set volume
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    
    // Play the generated drumroll
    source.start(audioContext.currentTime);
  }, [audioContext, drumrollSound]);

  // Play no-guess sound effect (uses WAV file as default)
  const playNoGuessSound = useCallback(() => {
    if (!audioContext) return;

    // Use WAV file if loaded
    if (noGuessSound) {
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = noGuessSound;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Set volume
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      
      // Play the WAV sound
      source.start(audioContext.currentTime);
      return;
    }

    // Fallback to generated sound (disappointed tone)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Create disappointed sound (low descending tone)
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.8);
    
    // Set volume envelope (quick attack, slow decay)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    // Start and stop the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.8);
  }, [audioContext, noGuessSound]);


  
  // Hover states for map and button
  const [isMapHovered, setIsMapHovered] = useState<boolean>(false);
  const [isButtonHovered, setIsButtonHovered] = useState<boolean>(false);
  
  // Map size control states
  const [mapSize, setMapSize] = useState<'extraSmall' | 'small' | 'default' | 'large' | 'extraLarge'>('default');
  const [isMapPinned, setIsMapPinned] = useState<boolean>(false);
  
  // Text visibility state
  const [showQuestionText, setShowQuestionText] = useState<boolean>(true);
  
  // Food image zoom/pan state
  const [foodImageScale, setFoodImageScale] = useState<number>(1);
  const [foodImagePosition, setFoodImagePosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number}>({x: 0, y: 0});
  
  // Results screen state
  const [resultsPhase, setResultsPhase] = useState<'showing' | 'countdown' | 'none'>('none');
  const [countdown, setCountdown] = useState(3);
  const [countdownAnimation, setCountdownAnimation] = useState<'in' | 'out' | 'none'>('none');
  const countdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Results screen timer refs
  const resultsScreenTimerRef = useRef<NodeJS.Timeout | null>(null);
  const resultsScreenStartTimeRef = useRef<number>(0);
  const resultsScreenRemainingTimeRef = useRef<number>(0);
  
  // Round progression guard
  const isStartingNewRoundRef = useRef<boolean>(false);
  
  // Food image ref for manual event listeners
  const foodImageRef = useRef<HTMLDivElement>(null);
  
  // No-guess animation delay state
  const [isNoGuessAnimating, setIsNoGuessAnimating] = useState<boolean>(false);
  
  // Geoguessr-style diagonal slash transition state
  const [isDiagonalTransitioning, setIsDiagonalTransitioning] = useState<boolean>(false);
  
  
  // Image preloading state
  const [preloadedImage, setPreloadedImage] = useState<string>('');
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  
  // Final score fade-in state
  const [finalScoreFadeIn, setFinalScoreFadeIn] = useState<boolean>(false);
  
  // Map state for results - with zoom transition
  const [resultMapCenter, setResultMapCenter] = useState(center);
  const [resultMapZoom, setResultMapZoom] = useState(2);
  const [isResultMapTransitioning, setIsResultMapTransitioning] = useState(false);
  const [resultMapRef, setResultMapRef] = useState<google.maps.Map | null>(null);
  const [isMapGrabbing, setIsMapGrabbing] = useState(false);
  
  // Zoom control state
  const [zoomLevel, setZoomLevel] = useState(2); // Default zoom level
  const [foodZoomInClicks, setFoodZoomInClicks] = useState(0);
  const [foodZoomOutClicks, setFoodZoomOutClicks] = useState(0);

  // Zoom control functions (currently using Google Maps default controls)
  // const handleZoomIn = useCallback(() => {
  //   if (zoomInClicks < 4) {
  //     setZoomInClicks(prev => prev + 1);
  //     setZoomLevel(prev => Math.min(prev + 1, 6)); // Max zoom level 6
  //   }
  // }, [zoomInClicks]);

  // const handleZoomOut = useCallback(() => {
  //   if (zoomOutClicks < 4) {
  //     setZoomOutClicks(prev => prev + 1);
  //     setZoomLevel(prev => Math.max(prev - 1, 1)); // Min zoom level 1
  //   }
  // }, [zoomOutClicks]);

  // Results screen zoom control functions with boundary restrictions
  const handleResultMapZoomIn = useCallback(() => {
    setResultMapZoom(prev => {
      const newZoom = prev + 1;
      // Calculate if this zoom level would show empty space
      const mapContainer = document.querySelector('[data-map-container]');
      if (mapContainer) {
        const containerWidth = mapContainer.clientWidth;
        const containerHeight = mapContainer.clientHeight;
        
        // Calculate the map bounds at this zoom level
        const worldWidth = 360; // degrees longitude
        const worldHeight = 180; // degrees latitude
        
        // Estimate if we can fit the world map without empty space
        const canFit = (containerWidth / containerHeight) >= (worldWidth / worldHeight);
        
        // If we can't fit the world map, limit zoom to prevent empty space
        if (!canFit && newZoom > 3) {
          return prev; // Don't zoom in further
        }
      }
      
      const finalZoom = Math.min(newZoom, 8); // Max zoom level 8 for results
      
      // Update the map reference if it exists
      if (resultMapRef) {
        resultMapRef.setZoom(finalZoom);
      }
      
      return finalZoom;
    });
  }, [resultMapRef, resultMapZoom]);

  const handleResultMapZoomOut = useCallback(() => {
    setResultMapZoom(prev => {
      const newZoom = prev - 1;
      // Calculate if this zoom level would show empty space
      const mapContainer = document.querySelector('[data-map-container]');
      if (mapContainer) {
        const containerWidth = mapContainer.clientWidth;
        const containerHeight = mapContainer.clientHeight;
        
        // Calculate the map bounds at this zoom level
        const worldWidth = 360; // degrees longitude
        const worldHeight = 180; // degrees latitude
        
        // Estimate if we can fit the world map without empty space
        const canFit = (containerWidth / containerHeight) >= (worldWidth / worldHeight);
        
        // If we can't fit the world map, limit zoom to prevent empty space
        if (!canFit && newZoom < 2) {
          return prev; // Don't zoom out further
        }
      }
      
      const finalZoom = Math.max(newZoom, 1); // Min zoom level 1 for results
      
      // Update the map reference if it exists
      if (resultMapRef) {
        resultMapRef.setZoom(finalZoom);
      }
      
      return finalZoom;
    });
  }, [resultMapRef, resultMapZoom]);

  // Reset zoom clicks when starting new round
  const resetZoomClicks = useCallback(() => {
    // setZoomInClicks(0);
    // setZoomOutClicks(0);
    setZoomLevel(2);
  }, []);
  
  // Map size control functions
  const handleExpandMap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Expand clicked, mapSize:', mapSize, 'isMapPinned:', isMapPinned);
    if (!isMapPinned) { // Only work when pin is NOT enabled
      if (mapSize === 'default') {
        setMapSize('large');
      } else if (mapSize === 'large') {
        setMapSize('extraLarge');
      } else if (mapSize === 'small') {
        setMapSize('default');
      } else if (mapSize === 'extraSmall') {
        setMapSize('small');
      }
    }
  };
  
  const handleShrinkMap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Shrink clicked, mapSize:', mapSize, 'isMapPinned:', isMapPinned);
    if (!isMapPinned) { // Only work when pin is NOT enabled
      if (mapSize === 'default') {
        setMapSize('small');
      } else if (mapSize === 'small') {
        setMapSize('extraSmall');
      } else if (mapSize === 'large') {
        setMapSize('default');
      } else if (mapSize === 'extraLarge') {
        setMapSize('large');
      }
    }
  };
  
  const handlePinMap = () => {
    setIsMapPinned(!isMapPinned);
  };
  
  // Avatar cycling functions
  const handlePreviousAvatar = () => {
    setSelectedAvatarIndex((prev) => (prev - 1 + avatarOptions.length) % avatarOptions.length);
  };
  
  const handleNextAvatar = () => {
    setSelectedAvatarIndex((prev) => (prev + 1) % avatarOptions.length);
  };

  // Load images as base64
  const loadImageAsBase64 = (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  // Create SVG with embedded image and white border (for map pins)
  const createPinSVG = (imageData: string, size: number) => {
    const radius = size / 2 - 1;
    const imageSize = size - 4; // Use almost full size
    const imageOffset = 2; // Small margin
    
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="circleClip">
            <circle cx="${size/2}" cy="${size/2}" r="${radius - 1}"/>
          </clipPath>
        </defs>
        <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="none" stroke="white" stroke-width="2"/>
        <image href="${imageData}" x="${imageOffset}" y="${imageOffset}" width="${imageSize}" height="${imageSize}" clip-path="url(#circleClip)"/>
      </svg>
    `)}`;
  };

  // Load all images when component mounts
  useEffect(() => {
    const loadImages = async () => {
      try {
        // Load avatar images
        const avatarPromises = avatarOptions.map(loadImageAsBase64);
        const loadedAvatars = await Promise.all(avatarPromises);
        setAvatarImages(loadedAvatars);

        // Load location image
        const locationData = await loadImageAsBase64(correctLocationImage);
        setLocationImageData(locationData);
      } catch (error) {
        console.log('Images not loaded yet, will retry...');
      }
    };

    loadImages();
  }, []);
  
  // Reset map size when clicking background (if not pinned and not small)
  const handleBackgroundClick = (e: React.MouseEvent) => {
    // Only reset if clicking on the food image background, not on the map
    const target = e.target as HTMLElement;
    if (!target.closest('[data-map-container]') && !isMapPinned && mapSize !== 'small' && mapSize !== 'extraSmall') {
      setMapSize('default');
    }
  };

  // Food image zoom/pan handlers with 4-click cycles
  const handleFoodImageWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    
    // Check if we can zoom based on current limits
    if (delta < 1) { // Zooming in
      if (foodZoomInClicks >= 4) {
        return; // Don't allow more zoom in
      }
      setFoodZoomInClicks(prev => prev + 1);
    } else { // Zooming out
      if (foodZoomOutClicks >= 4) {
        return; // Don't allow more zoom out
      }
      setFoodZoomOutClicks(prev => prev + 1);
    }
    
    // Calculate minimum scale to prevent showing empty space
    const minScale = Math.min(1, Math.min(window.innerWidth / (window.innerWidth * 0.8), (window.innerHeight - 64) / ((window.innerHeight - 64) * 0.8)));
    const newScale = Math.max(minScale, Math.min(4, foodImageScale * delta));
    
    // Always center the image when zooming out to prevent black areas
    if (delta < 1) { // Zooming out
      setFoodImageScale(newScale);
      setFoodImagePosition({ x: 0, y: 0 });
    } else { // Zooming in
      setFoodImageScale(newScale);
    }
  }, [foodZoomInClicks, foodZoomOutClicks, foodImageScale]);

  // Set up manual wheel event listener to allow preventDefault
  useEffect(() => {
    const foodImageElement = foodImageRef.current;
    if (foodImageElement) {
      foodImageElement.addEventListener('wheel', handleFoodImageWheel, { passive: false });
      return () => {
        foodImageElement.removeEventListener('wheel', handleFoodImageWheel);
      };
    }
  }, [handleFoodImageWheel]);

  const handleFoodImageMouseDown = (e: React.MouseEvent) => {
    if (foodImageScale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - foodImagePosition.x, y: e.clientY - foodImagePosition.y });
    }
  };

  const handleFoodImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && foodImageScale > 1) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Apply boundaries (4 sides)
      const maxX = (foodImageScale - 1) * 200; // Approximate boundary
      const maxY = (foodImageScale - 1) * 150;
      
      setFoodImagePosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  };

  const handleFoodImageMouseUp = () => {
    setIsDragging(false);
  };

  // Food image zoom button handlers with 4-click cycles
  const handleFoodImageZoomIn = () => {
    if (foodZoomInClicks < 4) {
      setFoodZoomInClicks(prev => prev + 1);
      setFoodImageScale(prev => Math.min(4, prev * 1.2));
    } else {
      // Reset and start new cycle
      setFoodZoomInClicks(1);
      setFoodZoomOutClicks(0);
      setFoodImageScale(prev => Math.min(4, prev * 1.2));
    }
  };

  const handleFoodImageZoomOut = () => {
    if (foodZoomOutClicks < 4) {
      setFoodZoomOutClicks(prev => prev + 1);
      // Calculate minimum scale to prevent showing empty space
      const minScale = Math.min(1, Math.min(window.innerWidth / (window.innerWidth * 0.8), (window.innerHeight - 64) / ((window.innerHeight - 64) * 0.8)));
      const newScale = Math.max(minScale, foodImageScale * 0.8);
      
      // Always center the image when zooming out to prevent black areas
      setFoodImageScale(newScale);
      setFoodImagePosition({ x: 0, y: 0 });
    } else {
      // Reset and start new cycle
      setFoodZoomOutClicks(1);
      setFoodZoomInClicks(0);
      // Calculate minimum scale to prevent showing empty space
      const minScale = Math.min(1, Math.min(window.innerWidth / (window.innerWidth * 0.8), (window.innerHeight - 64) / ((window.innerHeight - 64) * 0.8)));
      const newScale = Math.max(minScale, foodImageScale * 0.8);
      
      // Always center the image when zooming out to prevent black areas
      setFoodImageScale(newScale);
      setFoodImagePosition({ x: 0, y: 0 });
    }
  };

  // Touch gesture handlers for pinch-to-zoom
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + 
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const handleFoodImageTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setLastTouchDistance(getTouchDistance(e.touches));
    }
  };

  const handleFoodImageTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance) {
      const currentDistance = getTouchDistance(e.touches);
      if (currentDistance) {
        const scale = currentDistance / lastTouchDistance;
        
        // Check if we can zoom based on current limits
        if (scale < 1) { // Zooming in
          if (foodZoomInClicks >= 4) {
            return; // Don't allow more zoom in
          }
          setFoodZoomInClicks(prev => prev + 1);
        } else { // Zooming out
          if (foodZoomOutClicks >= 4) {
            return; // Don't allow more zoom out
          }
          setFoodZoomOutClicks(prev => prev + 1);
        }
        
        // Calculate minimum scale to prevent showing empty space
        const minScale = Math.min(1, Math.min(window.innerWidth / (window.innerWidth * 0.8), (window.innerHeight - 64) / ((window.innerHeight - 64) * 0.8)));
        const newScale = Math.max(minScale, Math.min(4, foodImageScale * scale));
        
        // Always center the image when zooming out to prevent black areas
        if (scale < 1) { // Zooming out
          setFoodImageScale(newScale);
          setFoodImagePosition({ x: 0, y: 0 });
        } else { // Zooming in
          setFoodImageScale(newScale);
        }
        setLastTouchDistance(currentDistance);
      }
    }
  };

  const handleFoodImageTouchEnd = () => {
    setLastTouchDistance(null);
  };

  // State for score animation
  const [displayedScore, setDisplayedScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // State for round results animation
  const [displayedRoundScore, setDisplayedRoundScore] = useState(0);
  const [displayedDistance, setDisplayedDistance] = useState(0);
  const [isRoundAnimating, setIsRoundAnimating] = useState(false);
  
  // State for 10-second countdown sound
  const [hasPlayedTenSecondsSound, setHasPlayedTenSecondsSound] = useState(false);

  // Pause/Resume functions
  const pauseGame = useCallback(() => {
    setIsGamePaused(true);
    setShowSettings(true);
    
    // Clear countdown beeps when paused
    countdownTimeouts.forEach(timeout => clearTimeout(timeout));
    setCountdownTimeouts([]);
    setHasPlayedTenSecondsSound(false);
    
    // Pause results screen timer if active
    if (resultsScreenTimerRef.current && resultsPhase === 'showing') {
      clearTimeout(resultsScreenTimerRef.current);
      resultsScreenTimerRef.current = null;
      
      // Calculate remaining time
      const elapsed = Date.now() - resultsScreenStartTimeRef.current;
      resultsScreenRemainingTimeRef.current = Math.max(0, 5000 - elapsed);
    }
      // Also pause no-guess animation if active
      if (isNoGuessAnimating) {
        setIsNoGuessAnimating(false);
      }
      
      // Reset diagonal transition if active
      if (isDiagonalTransitioning) {
        setIsDiagonalTransitioning(false);
      }
    
    console.log('Game paused');
  }, [countdownTimeouts, resultsPhase, isNoGuessAnimating, isDiagonalTransitioning]);

  const resumeGame = useCallback(() => {
    setIsGamePaused(false);
    setShowSettings(false);
    
    // Resume beep countdown if we're in the last 10 seconds
    if (gameState.timeLeft <= 10 && gameState.timeLeft > 0 && gameState.gamePhase === 'playing' && beepSounds.length === 10) {
      // Clear any existing timeouts first
      countdownTimeouts.forEach(timeout => clearTimeout(timeout));
      
      // Calculate how many beeps we need to play (from current time down to 1)
      const remainingBeeps = gameState.timeLeft;
      const newTimeouts: NodeJS.Timeout[] = [];
      
      // Schedule individual beeps for each remaining second
      for (let i = 0; i < remainingBeeps; i++) {
        const timeout = setTimeout(() => {
          // Calculate which beep sound to play (beepSounds[0] = beep10, beepSounds[1] = beep9, etc.)
          const beepIndex = 10 - (gameState.timeLeft - i);
          if (beepSounds[beepIndex]) {
            beepSounds[beepIndex].currentTime = 0; // Reset to beginning
            beepSounds[beepIndex].play().catch(e => console.log(`Beep${10-beepIndex} play failed:`, e));
          }
        }, i * 1000); // Each beep 1 second apart
        newTimeouts.push(timeout);
      }
      setCountdownTimeouts(newTimeouts);
      setHasPlayedTenSecondsSound(true); // Mark that we've started the countdown
    }
    
    // Resume results screen timer if we have remaining time
    if (resultsPhase === 'showing' && resultsScreenRemainingTimeRef.current > 0) {
      resultsScreenStartTimeRef.current = Date.now();
      resultsScreenTimerRef.current = setTimeout(() => {
        // Check if this is the last round
        if (gameState.round >= 6) {
          // Last round - go to final score
          setGameState(prev => ({
            ...prev,
            gamePhase: 'finalScore',
          }));
          setResultsPhase('none');
        } else {
          // Not last round - start countdown
          setResultsPhase('countdown');
          setCountdown(3);
        }
        resultsScreenTimerRef.current = null;
      }, resultsScreenRemainingTimeRef.current);
    }
    
    // Resume no-guess animation if it was paused
    if (resultsPhase === 'showing' && !isNoGuessAnimating && !gameState.guessPosition) {
      // This was a no-guess case, restart the animation
      setIsNoGuessAnimating(true);
      setTimeout(() => {
        setIsNoGuessAnimating(false);
      }, 1750); // 500ms + 1250ms for the full animation (updated to match new duration)
    }
    
    console.log('Game resumed - isGamePaused:', false);
  }, [gameState.timeLeft, gameState.gamePhase, gameState.usedFoods, gameState.guessPosition, beepSounds, countdownTimeouts, resultsPhase, foods.length, isNoGuessAnimating]);

  // Update music volume when setting changes
  useEffect(() => {
    console.log('Music volume changed to:', musicVolume);
    if (gameScreenMusic) {
      gameScreenMusic.volume = musicVolume;
    }
    if (resultsScreenMusic) {
      resultsScreenMusic.volume = musicVolume;
    }
    // Save music preferences to cookies
    CookieManager.saveMusicPreferences(musicVolume, effectVolume, soundOn);
  }, [musicVolume, effectVolume, soundOn, gameScreenMusic, resultsScreenMusic]);

  // Update bell sound volume when setting changes
  useEffect(() => {
    console.log('Effect volume changed to:', effectVolume);
    if (bellSound) {
      bellSound.volume = effectVolume;
    }
    if (bell1Sound) {
      bell1Sound.volume = effectVolume;
    }
    if (finalRoundResultsSound) {
      finalRoundResultsSound.volume = effectVolume;
    }
    // Save music preferences to cookies
    CookieManager.saveMusicPreferences(musicVolume, effectVolume, soundOn);
  }, [effectVolume, musicVolume, soundOn, bellSound, bell1Sound, finalRoundResultsSound]);

  // Stop all sounds when sound is turned off, resume when turned on
  useEffect(() => {
    if (!soundOn) {
      if (gameScreenMusic) {
        gameScreenMusic.pause();
      }
      if (resultsScreenMusic) {
        resultsScreenMusic.pause();
      }
      if (bellSound) {
        bellSound.pause();
      }
      if (bell1Sound) {
        bell1Sound.pause();
      }
      if (finalRoundResultsSound) {
        finalRoundResultsSound.pause();
      }
    } else {
      // Resume music if it was playing before
      if (currentBgMusic && currentBgMusic.paused) {
        currentBgMusic.play().catch(console.log);
      }
    }
    // Save music preferences to cookies
    CookieManager.saveMusicPreferences(musicVolume, effectVolume, soundOn);
  }, [soundOn, musicVolume, effectVolume, gameScreenMusic, resultsScreenMusic, bellSound, bell1Sound, finalRoundResultsSound, currentBgMusic]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  // Load saved username, avatar, and music preferences on page load
  useEffect(() => {
    const sessionData = CookieManager.getSessionData();
    if (sessionData.username) {
      setNicknameInput(sessionData.username);
      setNickname(sessionData.username);
    }
    if (sessionData.avatarIndex > 0) {
      setSelectedAvatarIndex(sessionData.avatarIndex);
    }
    // Load music preferences
    setMusicVolume(sessionData.musicVolume);
    setEffectVolume(sessionData.effectVolume);
    setSoundOn(sessionData.soundOn);
    setShowNicknameScreen(true);
  }, []);

  // Helper function to filter foods with real images
  const filterFoodsWithRealImages = useCallback((foodsData: Food[]) => {
    // Check if foodsData is valid
    if (!Array.isArray(foodsData)) {
      console.error('filterFoodsWithRealImages: foodsData is not an array:', foodsData);
      return [];
    }
    
    const demoImageUrls = [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800',
      'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800',
      'https://images.unsplash.com/photo-1565299585323-38174c4a4b0c?w=800'
    ];
    
    const foodsWithRealImages = foodsData.filter((food: Food) => {
      // Check if the food has at least one image that's not a demo image
      const hasRealImage = food.images.some(imageUrl => !demoImageUrls.includes(imageUrl));
      console.log(`Food ${food.name}: hasRealImage=${hasRealImage}, images=${food.images.length}`);
      return hasRealImage;
    });
    
    console.log(`Filtered ${foodsData.length} foods down to ${foodsWithRealImages.length} with real images`);
    // Only return foods with real images - no fallback to demo images
    return foodsWithRealImages;
  }, []);

  // Function to refresh foods data from server
  const refreshFoodsData = useCallback(async () => {
    try {
      const response = await fetch('/api/foods');
      const data = await response.json();
      const foodsWithRealImages = filterFoodsWithRealImages(data);
      
      console.log(`🔄 Refreshed foods data: ${data.length} total, ${foodsWithRealImages.length} with real images`);
      
      if (foodsWithRealImages.length > 0) {
        setFoods(foodsWithRealImages);
        return foodsWithRealImages;
      }
      
      return [];
    } catch (error) {
      console.error('Error refreshing foods data:', error);
      return [];
    }
  }, [filterFoodsWithRealImages]);

  // Text fade out effect
  useEffect(() => {
    if (gameState.gamePhase === 'playing') {
      setShowQuestionText(true);
      const timer = setTimeout(() => {
        setShowQuestionText(false);
      }, 1000); // Show for 1 second, then fade out over 1.2 seconds (handled by CSS transition)
      return () => clearTimeout(timer);
    } else {
      // Reset when not playing
      setShowQuestionText(false);
    }
  }, [gameState.gamePhase, gameState.round]);

  // Load foods data (only when nickname is set)
  useEffect(() => {
    if (!showNicknameScreen && nickname) {
    const loadFoods = async () => {
      try {
        console.log('🔄 Loading foods data...');
        
        // Try API first, fall back to static data
        let data;
        try {
          const response = await fetch('/api/foods');
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          data = await response.json();
          
          // Check if data is an array and not an error
          if (!Array.isArray(data)) {
            throw new Error('API returned non-array data');
          }
        } catch (apiError) {
          console.warn('API failed, using fallback data:', apiError);
          // Fallback to static data
          data = [
            {
              id: 'pizza-1',
              name: 'Pizza',
              description: 'Traditional Italian flatbread with toppings',
              fact: 'Pizza was invented in Naples, Italy in the 18th century',
              lat: 40.8518,
              lng: 14.2681,
              location: 'Italy',
              city: 'Naples',
              country: 'Italy',
              images: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800']
            },
            {
              id: 'sushi-1',
              name: 'Sushi',
              description: 'Japanese dish with vinegared rice and seafood',
              fact: 'Sushi originated in Southeast Asia as a method of preserving fish',
              lat: 35.6762,
              lng: 139.6503,
              location: 'Japan',
              city: 'Tokyo',
              country: 'Japan',
              images: ['https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800']
            },
            {
              id: 'tacos-1',
              name: 'Tacos',
              description: 'Mexican dish with tortillas and various fillings',
              fact: 'Tacos originated in Mexico and are now popular worldwide',
              lat: 19.4326,
              lng: -99.1332,
              location: 'Mexico',
              city: 'Mexico City',
              country: 'Mexico',
              images: ['https://images.unsplash.com/photo-1565299585323-38174c4a4a0a?w=800']
            }
          ];
        }
        
        // Use all dishes for now (temporarily disable filtering)
        const foodsWithRealImages = data;
        
        console.log(`📊 Loaded ${data.length} total dishes, ${foodsWithRealImages.length} with real images`);
        
        setFoods(foodsWithRealImages);
        if (foodsWithRealImages.length > 0) {
          // Initialize session data and start first round
          const sessionData = CookieManager.getSessionData();
          sessionData.totalSessions += 1;
          CookieManager.saveSessionData(sessionData);
          
          // Update session stats
          updateSessionStats();
          
          startNewRound(foodsWithRealImages);
        } else {
          console.warn('⚠️ No foods with real images found!');
        }
      } catch (error) {
        console.error('Error loading foods:', error);
        // You could add a retry mechanism or show an error message to the user here
      }
    };

    loadFoods();
    }
  }, [showNicknameScreen, nickname, updateSessionStats]);

  // Function to preload the next food image
  const preloadNextImage = useCallback((foodsData: Food[]) => {
    // Check if there are more rounds to play
    if (gameState.round >= 6) {
      return; // No more rounds, don't preload
    }

    // Get available foods using cookie system
    const availableFoodIndices = CookieManager.getAvailableFoods(foodsData, 20);
    if (availableFoodIndices.length === 0) {
      return; // No available foods
    }

    // Select a random food for the next round (same logic as startNewRound)
    const randomIndex = availableFoodIndices[Math.floor(Math.random() * availableFoodIndices.length)];
    const randomFood = foodsData[randomIndex];
    
    // Use the same image selection logic as selectImage function
    const selectedImage = selectImage(randomFood);
    
    // Preload the image
    setIsPreloading(true);
    const img = new window.Image();
    img.onload = () => {
      setPreloadedImage(selectedImage);
      setIsPreloading(false);
    };
    img.onerror = () => {
      setIsPreloading(false);
    };
    img.src = selectedImage;
  }, [gameState.usedFoods, imageHistory]);

  // Results screen timing
  useEffect(() => {
    if (resultsPhase === 'showing') {
      // Start preloading the next image immediately when results screen shows
      if (foods.length > 0 && gameState.round < 6) {
        preloadNextImage(foods);
      }
      
      // Only start timer if not paused and not in no-guess animation
      if (!isGamePaused && !isNoGuessAnimating) {
        // Clear any existing timer
        if (resultsScreenTimerRef.current) {
          clearTimeout(resultsScreenTimerRef.current);
        }
        
        // Reset remaining time
        resultsScreenRemainingTimeRef.current = 5000;
        resultsScreenStartTimeRef.current = Date.now();
        
        // Check if this is the last round
        if (gameState.round >= 6) {
          // Last round - show results for 5 seconds, then go to final score
          resultsScreenTimerRef.current = setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              gamePhase: 'finalScore',
            }));
            setResultsPhase('none');
            resultsScreenTimerRef.current = null;
          }, 5000);
        } else {
          // Not last round - show results for 5 seconds, then start countdown
          resultsScreenTimerRef.current = setTimeout(() => {
            setResultsPhase('countdown');
            setCountdown(3);
            setCountdownAnimation('none'); // Reset animation state
            resultsScreenTimerRef.current = null;
          }, 5000);
        }
      }
      
      return () => {
        if (resultsScreenTimerRef.current) {
          clearTimeout(resultsScreenTimerRef.current);
          resultsScreenTimerRef.current = null;
        }
      };
    } else if (resultsPhase === 'countdown') {
      // Only run countdown if it's not the last round
      if (gameState.round < 6) {
        // Countdown logic is handled in separate useEffect
        return;
      } else {
        // If we're on the last round and somehow in countdown, go to final score
        setGameState(prev => ({
          ...prev,
          gamePhase: 'finalScore',
        }));
        setResultsPhase('none');
      }
    }
  }, [resultsPhase, countdown, foods, gameState.round, preloadNextImage, isGamePaused, isNoGuessAnimating]);

  // Start results screen timer when no-guess animation completes
  useEffect(() => {
    if (resultsPhase === 'showing' && !isNoGuessAnimating && !isGamePaused) {
      // Clear any existing timer
      if (resultsScreenTimerRef.current) {
        clearTimeout(resultsScreenTimerRef.current);
      }
      
      // Reset remaining time
      resultsScreenRemainingTimeRef.current = 5000;
      resultsScreenStartTimeRef.current = Date.now();
      
      // Check if this is the last round
      if (gameState.usedFoods.length >= foods.length) {
        // Last round - show results for 5 seconds, then go to final score
        resultsScreenTimerRef.current = setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            gamePhase: 'finalScore',
          }));
          setResultsPhase('none');
          resultsScreenTimerRef.current = null;
        }, 5000);
      } else {
        // Not last round - show results for 5 seconds, then start countdown
        resultsScreenTimerRef.current = setTimeout(() => {
          setResultsPhase('countdown');
          setCountdown(3);
          setCountdownAnimation('none'); // Reset animation state
          resultsScreenTimerRef.current = null;
        }, 5000);
      }
      
      return () => {
        if (resultsScreenTimerRef.current) {
          clearTimeout(resultsScreenTimerRef.current);
          resultsScreenTimerRef.current = null;
        }
      };
    }
  }, [isNoGuessAnimating, resultsPhase, isGamePaused, gameState.round]);

  // Complex countdown animation timer
  useEffect(() => {
    if (resultsPhase === 'countdown' && gameState.round < 6 && !isGamePaused) {
      console.log('Countdown timer started for:', countdown);
      
      // Play sound for the initial countdown number (3, 2, 1)
      if (countdown === 3) {
        console.log('Playing initial countdown 3 sound');
        playCountdownSound(3);
      } else if (countdown === 2) {
        console.log('Playing initial countdown 2 sound');
        playCountdownSound(2);
      } else if (countdown === 1) {
        console.log('Playing initial countdown 1 sound');
        playCountdownSound(1);
      }
      
      // Clear any existing timeout
      if (countdownTimeoutRef.current) {
        clearTimeout(countdownTimeoutRef.current);
      }
      
      // Complex countdown with different timing for each number
      let totalDuration = 0;
      if (countdown === 3) {
        totalDuration = 1000; // 0.3s in + 0.7s visible = 1s total
      } else if (countdown === 2) {
        totalDuration = 1000; // 0.15s in + 0.85s visible = 1s total
      } else if (countdown === 1) {
        totalDuration = 1000; // 0.15s in + 0.85s visible = 1s total
      } else if (countdown === 0) {
        totalDuration = 1000; // 0.15s in + 0.85s visible = 1s total
      }
      
      countdownTimeoutRef.current = setTimeout(async () => {
        if (countdown > 0) {
          setCountdown(prev => {
            const newCountdown = prev - 1;
            
            // Play individual countdown sounds when numbers 3, 2, 1 appear (after they decrement)
            console.log(`Countdown: ${prev} -> ${newCountdown}`);
            if (newCountdown === 3) {
              console.log('Triggering countdown 3 sound');
              playCountdownSound(3);
            } else if (newCountdown === 2) {
              console.log('Triggering countdown 2 sound');
              playCountdownSound(2);
            } else if (newCountdown === 1) {
              console.log('Triggering countdown 1 sound');
              playCountdownSound(1);
            }
            
            // Play bell sound immediately when countdown becomes 0
            if (newCountdown === 0) {
              playBellSound();
              // Start diagonal transition after 0.5 seconds for true transition effect
              setTimeout(() => {
                console.log('Countdown finished, starting diagonal transition');
                if (animationsOn) {
                  setIsDiagonalTransitioning(true);
                  playWhooshSound(); // Play whoosh sound with transition
                }
                
                if (animationsOn) {
                  // Start next round at 30% of transition (600ms into 2000ms animation)
                  // This ensures the transition captures both screens
                  setTimeout(() => {
                    console.log('Diagonal transition at 30%, starting next round');
                    setResultsPhase('none');
                    startNewRound(); // Let startNewRound refresh foods data
                  }, 600); // 30% of 2000ms animation - captures both screens
                  
                  // Clean up transition state after animation completes
                  setTimeout(() => {
                    console.log('Diagonal transition complete, cleaning up');
                    setIsDiagonalTransitioning(false);
                  }, 2000); // Full animation duration
                } else {
                  // No animation - wait for the full countdown duration (1 second) before starting next round
                  console.log('Animations off - waiting for countdown duration');
                  setTimeout(() => {
                  console.log('Countdown duration complete, starting next round');
                  setResultsPhase('none');
                  startNewRound(); // Let startNewRound refresh foods data
                  }, 1000); // Wait 1 second for the "0" to be visible
                }
              }, 500);
            }
            return newCountdown;
          });
        } else {
          // Countdown finished - this should not happen as we handle countdown === 0 above
          console.log('Countdown finished unexpectedly');
        }
      }, totalDuration);
      
      return () => {
        if (countdownTimeoutRef.current) {
          clearTimeout(countdownTimeoutRef.current);
        }
      };
    }
  }, [resultsPhase, countdown, foods, gameState.round, playBellSound, playCountdownSound, playWhooshSound, isGamePaused, isDiagonalTransitioning, animationsOn]);

  // Nickname handlers
  const handleRandomNickname = () => {
    const randomName = funNicknames[Math.floor(Math.random() * funNicknames.length)];
    setNicknameInput(randomName);
  };

  const handleStartGame = () => {
    // If no nickname provided, assign a random one
    const finalNickname = nicknameInput.trim().length > 0 
      ? nicknameInput.trim() 
      : funNicknames[Math.floor(Math.random() * funNicknames.length)];
    
    // If no avatar selected, assign a random one
    if (selectedAvatarIndex === 0 && nicknameInput.trim().length === 0) {
      setSelectedAvatarIndex(Math.floor(Math.random() * avatarOptions.length));
    }

    // Save username and avatar to cookies
    CookieManager.saveUserPreferences(finalNickname, selectedAvatarIndex);
    
    // Reset 10-second sound flag when starting the game
    setHasPlayedTenSecondsSound(false);
    
    setNickname(finalNickname);
    setShowNicknameScreen(false);
  };

  const handleNicknameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleStartGame();
    }
  };

  // Multiplayer button handlers
  const handleMultiplayerClick = () => {
    setMultiplayerButtonText('Coming Soon');
    setTimeout(() => {
      setMultiplayerButtonText('🌐 Multiplayer');
    }, 2000);
  };

  const handlePrivateRoomClick = () => {
    setPrivateRoomButtonText('Coming Soon');
    setTimeout(() => {
      setPrivateRoomButtonText('🏠 Create Private Room');
    }, 2000);
  };

  // Keyboard event listener for space key and ESC key
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        if (gameState.gamePhase === 'result' && resultsPhase === 'showing') {
          // Check if this is the last round
          if (gameState.round >= 6) {
            // Last round - go directly to final score
            // Stop all results screen sound effects when skipping to final score
            if (currentBgMusic && currentBgMusic === resultsScreenMusic) {
              stopCurrentMusic(currentBgMusic);
              setCurrentBgMusic(null);
            }
            
            // Stop results map sound effect
            if (resultsMapSound) {
              resultsMapSound.pause();
              resultsMapSound.currentTime = 0;
            }
            
            // Trigger diagonal transition for final round skip
            if (animationsOn) {
              setIsDiagonalTransitioning(true);
              playWhooshSound();
              
              // Switch to final score screen when transition covers the whole screen (50% of 2.0s = 1.0s)
              setTimeout(() => {
                setGameState(prev => ({
                  ...prev,
                  gamePhase: 'finalScore',
                }));
                setResultsPhase('none');
              }, 1000); // Switch when transition is at peak coverage
              
              // Clear transition state after animation completes
              setTimeout(() => {
                setIsDiagonalTransitioning(false);
              }, 2000);
            } else {
              // No animation - go directly to final score
              setGameState(prev => ({
                ...prev,
                gamePhase: 'finalScore',
              }));
              setResultsPhase('none');
            }
          } else {
            // Not last round - skip to countdown
            setResultsPhase('countdown');
            setCountdown(3);
          }
        } else if (gameState.gamePhase === 'finalScore') {
          handlePlayAgain();
        }
      } else if (event.code === 'Escape') {
        event.preventDefault();
        if (isGamePaused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
    };

    if (!showNicknameScreen) {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [gameState.gamePhase, gameState.round, foods.length, showNicknameScreen, resultsPhase, isGamePaused, pauseGame, resumeGame, currentBgMusic, resultsScreenMusic, resultsMapSound, stopCurrentMusic, setCurrentBgMusic, animationsOn, playWhooshSound]);

  // Final score fade-in effect
  useEffect(() => {
    if (gameState.gamePhase === 'finalScore') {
      // Play final score screen sound
      playFinalRoundResultsSound();
      
      // Update recent dishes when game completes
      if (gameState.usedFoods.length > 0) {
        CookieManager.updateRecentDishes(gameState.usedFoods);
      }
      
      // Trigger fade-in after a brief delay
      setTimeout(() => {
        setFinalScoreFadeIn(true);
      }, 100);
    } else {
      setFinalScoreFadeIn(false);
    }
  }, [gameState.gamePhase, gameState.usedFoods, playFinalRoundResultsSound]);

  // Score animation effect
  useEffect(() => {
    if (gameState.gamePhase === 'finalScore' && gameState.score > 0) {
      setIsAnimating(true);
      setDisplayedScore(0);
      
      // Play final score sound at the start of animation
      playFinalScoreSound();
      
      const targetScore = gameState.score;
      const duration = 1250; // 1.25 seconds to match sound effect duration
      const startTime = Date.now();
      let animationId: number;
      
      const animateScore = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentScore = Math.floor(easeOutCubic * targetScore);
        
        setDisplayedScore(currentScore);
        
        if (progress < 1) {
          animationId = requestAnimationFrame(animateScore);
        } else {
          setDisplayedScore(targetScore);
          setIsAnimating(false);
        }
      };
      
      animationId = requestAnimationFrame(animateScore);
      
      // Cleanup function to cancel animation if component unmounts or dependencies change
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }
  }, [gameState.gamePhase, gameState.score, playFinalScoreSound]);

  // Round results animation effect
  useEffect(() => {
    if (resultsPhase === 'showing' && gameState.roundScore > 0) {
      setIsRoundAnimating(true);
      setDisplayedRoundScore(0);
      setDisplayedDistance(0);
      
      const targetScore = gameState.roundScore;
      const targetDistance = gameState.distance || 0;
      const duration = 2000; // Match drumroll sound duration (2 seconds)
      const startTime = Date.now();
      let animationId: number;
      
      const animateRoundResults = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        const currentScore = Math.floor(easeOutCubic * targetScore);
        const currentDistance = Math.floor(easeOutCubic * targetDistance);
        
        setDisplayedRoundScore(currentScore);
        setDisplayedDistance(currentDistance);
        
        if (progress < 1) {
          animationId = requestAnimationFrame(animateRoundResults);
        } else {
          setDisplayedRoundScore(targetScore);
          setDisplayedDistance(targetDistance);
          setIsRoundAnimating(false);
        }
      };
      
      animationId = requestAnimationFrame(animateRoundResults);
      
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }
  }, [resultsPhase, gameState.roundScore, gameState.distance]);

  // Function to select the least recently used image for a food
  const selectImage = (food: Food): string => {
    const foodName = food.name;
    const imageIndex = CookieManager.getLeastUsedImage(foodName, food.images.length);
    return food.images[imageIndex];
  };

  // Function to update image history
  const updateImageHistory = (foodName: string, imageUrl: string) => {
    const food = foods.find(f => f.name === foodName);
    if (!food) return;
    
    const imageIndex = food.images.indexOf(imageUrl);
    if (imageIndex === -1) return;
    
    // Update cookie-based session data
    const sessionData = CookieManager.getSessionData();
    if (!sessionData.usedImages[foodName]) {
      sessionData.usedImages[foodName] = [];
    }
    
    if (!sessionData.usedImages[foodName].includes(imageIndex)) {
      sessionData.usedImages[foodName].push(imageIndex);
    }
    
    CookieManager.saveSessionData(sessionData);
    
    // Also update local state for backward compatibility
    setImageHistory(prev => {
      const currentHistory = prev[foodName] || [];
      const newHistory = [...currentHistory, imageIndex];
      const trimmedHistory = newHistory.length > 3 ? newHistory.slice(-3) : newHistory;
      
      return {
        ...prev,
        [foodName]: trimmedHistory
      };
    });
  };

  // Non-linear scoring function (5000 max, curve-based)
  const calculateScore = (distanceKm: number): number => {
    if (distanceKm <= 0) return 5000;
    
    const score = 5000 * Math.exp(-distanceKm / 1000);
    return Math.max(50, Math.round(score));
  };

  // Check if guess is within country borders (approximate country detection)
  const isGuessWithinCountry = (guessLat: number, guessLng: number, correctLat: number, correctLng: number) => {
    // Calculate distance between guess and correct location
    const distance = getDistance(
      { latitude: guessLat, longitude: guessLng },
      { latitude: correctLat, longitude: correctLng }
    );
    const distanceKm = distance / 1000;
    
    // Country boundary thresholds (in kilometers)
    // These are approximate values for different country sizes
    const countryThresholds = {
      // Large countries (Russia, Canada, USA, China, Brazil, Australia)
      large: 2000,    // 2000km radius
      // Medium countries (France, Germany, India, Argentina, etc.)
      medium: 800,    // 800km radius  
      // Small countries (UK, Japan, Italy, Spain, etc.)
      small: 400,     // 400km radius
      // Very small countries (Netherlands, Belgium, etc.)
      tiny: 200       // 200km radius
    };
    
    // For now, we'll use a conservative approach:
    // If distance is less than 500km, consider it within country
    // If distance is 500-1000km, consider it in neighboring region
    // If distance is >1000km, consider it outside country
    
    if (distanceKm <= 500) {
      return true;  // Within country
    } else if (distanceKm <= 1000) {
      return false; // In neighboring region (still wrong country)
    } else {
      return false; // Definitely outside country
    }
  };

  // Determine guess accuracy level for sound effects
  const getGuessAccuracyLevel = (distanceKm: number) => {
    if (distanceKm <= 50) return 'excellent';      // Same city/region
    if (distanceKm <= 200) return 'very_good';    // Same state/province
    if (distanceKm <= 500) return 'good';         // Same country
    if (distanceKm <= 1000) return 'close';       // Neighboring country
    if (distanceKm <= 2000) return 'far';         // Same continent
    return 'very_far';                          // Different continent
  };



  // Handle results map load
  const onResultMapLoad = useCallback((map: google.maps.Map) => {
    setResultMapRef(map);
    
    // Add zoom animation when map loads
    if (gameState.gamePhase === 'result' && gameState.guessPosition && gameState.correctPosition) {
      setTimeout(() => {
        // Create bounds for both pins
        const bounds = new google.maps.LatLngBounds();
        if (gameState.guessPosition) {
          bounds.extend(gameState.guessPosition);
        }
        if (gameState.correctPosition) {
          bounds.extend(gameState.correctPosition);
        }
        
        // Simple zoom animation - just use fitBounds with padding
        map.fitBounds(bounds, {
          top: 80,
          right: 80,
          bottom: 80,
          left: 80
        });
      }, 500);
    }
  }, [gameState.gamePhase, gameState.guessPosition, gameState.correctPosition]);



  // Start a new round with fresh map
  const startNewRound = useCallback(async (foodsData?: Food[]) => {
    // Prevent multiple calls
    if (isStartingNewRoundRef.current) {
      console.log('startNewRound already in progress, skipping');
      return;
    }
    
    isStartingNewRoundRef.current = true;
    console.log('Starting new round, round:', gameState.round + 1, 'isStartingNewRoundRef:', isStartingNewRoundRef.current);
    
    // Refresh foods data to get latest images
    const currentFoods = foodsData || await refreshFoodsData();
    
    // Filter foods to only include those with images
    const foodsWithImages = currentFoods.filter(food => food.images && food.images.length > 0);
    
    console.log(`Filtered ${currentFoods.length} foods down to ${foodsWithImages.length} foods with images`);
    
    if (foodsWithImages.length === 0) {
      console.log('No foods with images available');
      setGameState(prev => ({ ...prev, gamePhase: 'finalScore' }));
      isStartingNewRoundRef.current = false;
      return;
    }
    
    // Stop bell sound if it's playing
    if (bellSound) {
      bellSound.pause();
      bellSound.currentTime = 0;
    }
    if (bell1Sound) {
      bell1Sound.pause();
      bell1Sound.currentTime = 0;
    }
    
    // Reset zoom controls
    resetZoomClicks();
    
    // Reset 10-second sound flag for new round
    setHasPlayedTenSecondsSound(false);
    
    // Get available foods using cookie system (no recent bias for now)
    let availableFoodIndices = CookieManager.getAvailableFoods(foodsWithImages, 20);
    
    // If no available foods (all used), reset and use all foods (allow repetition)
    if (availableFoodIndices.length === 0) {
      console.log('All foods used, resetting and allowing repetition');
      CookieManager.resetUsedFoods();
      availableFoodIndices = CookieManager.getAvailableFoods(foodsWithImages, 20);
    }

    // If still no foods available, use all foods
    if (availableFoodIndices.length === 0) {
      availableFoodIndices = Array.from({ length: foodsWithImages.length }, (_, i) => i);
    }
    
    // Check if we've reached the 6-round limit
    if (gameState.round >= 6) {
      setGameState(prev => ({
        ...prev,
        gamePhase: 'finalScore',
      }));
      isStartingNewRoundRef.current = false;
      return;
    }

    // Shuffle available foods for better randomization
    const shuffledIndices = [...availableFoodIndices].sort(() => Math.random() - 0.5);
    const randomIndex = shuffledIndices[0];
    const randomFood = foodsWithImages[randomIndex];
    const foodIndex = currentFoods.indexOf(randomFood); // Get original index for cookie tracking
    
    // Use preloaded image if available AND it belongs to the current food, otherwise select new image
    const selectedImage = (preloadedImage && randomFood.images.includes(preloadedImage)) 
      ? preloadedImage 
      : selectImage(randomFood);
    
    setGameState(prev => ({
      ...prev,
      currentFood: randomFood,
      currentImage: selectedImage,
      guessPosition: null,
      correctPosition: null,
      distance: null,
      timeLeft: 60,
      gamePhase: 'playing',
      round: prev.round + 1,
      usedFoods: [...prev.usedFoods, foodIndex],
      roundScore: 0,
    }));
    
    // Update cookie system with used food and image
    const imageIndex = randomFood.images.indexOf(selectedImage);
    CookieManager.updateSession(foodIndex, randomFood.name, imageIndex);
    
    // Start game screen music immediately when starting a new round
    if (gameScreenMusic) {
      console.log('Starting game screen music from startNewRound - restarting from beginning');
      // Always restart game music from the beginning for new rounds
      if (currentBgMusic && currentBgMusic !== gameScreenMusic) {
        stopCurrentMusic(currentBgMusic);
      }
      setCurrentBgMusic(gameScreenMusic);
      playMusic(gameScreenMusic, 0); // Always start from beginning
    }
    
    // Clear map by incrementing key - no transitions
    setMapKey(prev => prev + 1);
    updateImageHistory(randomFood.name, selectedImage);
    
    // Reset food image zoom/pan
    setFoodImageScale(1);
    setFoodImagePosition({x: 0, y: 0});
    setFoodZoomInClicks(0);
    setFoodZoomOutClicks(0);
    
    // Clear preloaded image after use
    setPreloadedImage('');
    
    // Reset guard after round is started
    setTimeout(() => {
      console.log('Resetting isStartingNewRoundRef to false');
      isStartingNewRoundRef.current = false;
    }, 100);
  }, [bellSound, bell1Sound, gameState.usedFoods, preloadedImage, selectImage, resetZoomClicks, setMapKey, updateImageHistory, setFoodImageScale, setFoodImagePosition, setFoodZoomInClicks, setFoodZoomOutClicks, setPreloadedImage, gameScreenMusic, currentBgMusic, stopCurrentMusic, setCurrentBgMusic, playMusic, refreshFoodsData]);

  const submitGuess = useCallback(() => {
    console.log('🔄 submitGuess called', { 
      hasCurrentFood: !!gameState.currentFood, 
      hasGuessPosition: !!gameState.guessPosition,
      gamePhase: gameState.gamePhase,
      currentFood: gameState.currentFood,
      guessPosition: gameState.guessPosition
    });
    
    if (gameState.currentFood) {
      let distanceKm = 0;
      let roundScore = 0;

      if (gameState.guessPosition) {
      const distance = getDistance(
        { latitude: gameState.guessPosition.lat, longitude: gameState.guessPosition.lng },
        { latitude: gameState.currentFood.lat, longitude: gameState.currentFood.lng }
      );
        distanceKm = Math.round(distance / 1000);
        roundScore = calculateScore(distanceKm);
        
        // Check if guess is within country borders for sound effects
        const isWithinCountry = isGuessWithinCountry(
          gameState.guessPosition.lat, 
          gameState.guessPosition.lng,
          gameState.currentFood.lat, 
          gameState.currentFood.lng
        );
        
        // Determine accuracy level for sound effects
        const accuracyLevel = getGuessAccuracyLevel(distanceKm);
        
        // Sound effect logic based on country boundaries
        if (isWithinCountry) {
          // Guess is within the correct country - play success sound
          console.log('✅ Correct country - playing success sound');
        } else {
          // Guess is outside the correct country - play wrong sound
          console.log('❌ Wrong country - play wrong sound');
        }
        
        // Additional sound effects based on accuracy level
        switch (accuracyLevel) {
          case 'excellent':
            // TODO: playSound('excellent');
            console.log('🎯 Excellent guess - play excellent sound');
            break;
          case 'very_good':
            // TODO: playSound('very_good');
            console.log('👍 Very good guess - play very good sound');
            break;
          case 'good':
            // TODO: playSound('good');
            console.log('👍 Good guess - play good sound');
            break;
          case 'close':
            // TODO: playSound('close');
            console.log('👌 Close guess - play close sound');
            break;
          case 'far':
            // TODO: playSound('far');
            console.log('🌍 Far guess - play far sound');
            break;
          case 'very_far':
            // TODO: playSound('very_far');
            console.log('🌎 Very far guess - play very far sound');
            break;
        }
      } else {
        distanceKm = 0;
        roundScore = 0;
      }

      setGameState(prev => ({
        ...prev,
        correctPosition: { lat: gameState.currentFood!.lat, lng: gameState.currentFood!.lng },
        distance: distanceKm,
        gamePhase: 'result',
        roundScore: roundScore,
        score: (prev.score || 0) + roundScore,
        totalDistance: (prev.totalDistance || 0) + distanceKm,
      }));

      // Helper function to start results screen with proper timing
      function startResultsScreen() {
        // Start results screen sequence immediately for visual feedback
        setResultsPhase('showing');
        
        // Reset 10-second sound flag when transitioning to results
        setHasPlayedTenSecondsSound(false);
      
      // Start results screen music immediately when showing results
      if (resultsScreenMusic) {
        console.log('Starting results screen music from results phase');
        console.log('Are music elements different?', gameScreenMusic !== resultsScreenMusic);
        console.log('Current music src:', currentBgMusic?.src);
        console.log('Results music src:', resultsScreenMusic.src);
        console.log('Game music src:', gameScreenMusic?.src);
        
        // Use seamless transition if switching from game music
        if (currentBgMusic && currentBgMusic !== resultsScreenMusic) {
          const currentTime = currentBgMusic.currentTime;
          console.log('Switching from game music to results music at time:', currentTime);
          console.log('Current music element:', currentBgMusic);
          console.log('Results music element:', resultsScreenMusic);
          stopCurrentMusic(currentBgMusic);
          setCurrentBgMusic(resultsScreenMusic);
          playMusic(resultsScreenMusic, currentTime);
        } else {
          console.log('No current music or same music, starting from beginning');
          console.log('Current music element:', currentBgMusic);
          console.log('Results music element:', resultsScreenMusic);
          setCurrentBgMusic(resultsScreenMusic);
          playMusic(resultsScreenMusic);
        }
      }
      
      // Play results map sound for guess cases only (synced with zoom animation)
      if (gameState.guessPosition) {
        setTimeout(() => {
          playResultsMapSound();
        }, 500); // 500ms delay to sync with map zoom
      }
      } // End of startResultsScreen helper function
      
      // Results screen map positioning - SIMPLE APPROACH
      if (gameState.guessPosition) {
        // Set initial position to center between pins
        const centerLat = (gameState.guessPosition.lat + gameState.currentFood!.lat) / 2;
        const centerLng = (gameState.guessPosition.lng + gameState.currentFood!.lng) / 2;
        
        setResultMapCenter({ lat: centerLat, lng: centerLng });
        setResultMapZoom(2);
        
        // Regular guess case - start results screen immediately
        startResultsScreen();
      } else {
        // No guess, show correct location
        const correctLocation = { lat: gameState.currentFood!.lat, lng: gameState.currentFood!.lng };
        console.log('No guess - centering on correct location');
        
        // Play no-guess sound
        playNoGuessSound();
        
        // Start transition
        setIsResultMapTransitioning(true);
        
        // Set initial position (centered on correct location)
        setResultMapCenter(correctLocation);
        setResultMapZoom(8); // Country/city level zoom
        
        // Start results screen immediately for visual feedback
        startResultsScreen();
        
        // Set no-guess animation state
        setIsNoGuessAnimating(true);
        
        // Use direct API calls to ensure proper centering
        setTimeout(() => {
          if (resultMapRef) {
            resultMapRef.panTo(correctLocation);
            resultMapRef.setZoom(8);
          }
          
          setTimeout(() => {
            setIsResultMapTransitioning(false);
            // Clear no-guess animation state after animations complete
            setIsNoGuessAnimating(false);
          }, 1250); // 1.25 seconds to match results-screen-map.mp3 duration
        }, 500);
      }
    }
  }, [gameState.guessPosition, gameState.currentFood, playNoGuessSound, playResultsMapSound, resultsScreenMusic, currentBgMusic, stopCurrentMusic, playMusic]);

  // Simple beep sound for countdown

  // Load beep sound
  useEffect(() => {
    const beep = new Audio('/sounds/beep.mp3');
    beep.volume = 0.7;
    setBeepSound(beep);
  }, []);

  // Load individual countdown beep sounds (beep10.mp3, beep9.mp3, etc.)
  useEffect(() => {
    const loadBeepSounds = () => {
      const sounds: HTMLAudioElement[] = [];
      for (let i = 10; i >= 1; i--) {
        const beep = new Audio(`/sounds/beep${i}.mp3`);
        beep.volume = 0.7;
        beep.preload = 'auto';
        sounds.push(beep);
      }
      setBeepSounds(sounds);
    };
    
    loadBeepSounds();
  }, []);

  // Load whoosh sound
  useEffect(() => {
    const whoosh = new Audio('/sounds/whoosh.mp3');
    whoosh.volume = 0.7;
    setWhooshSound(whoosh);
  }, []);

  // Load final score sound
  useEffect(() => {
    const finalScore = new Audio('/sounds/final-score.mp3');
    finalScore.volume = 0.7;
    setFinalScoreSound(finalScore);
  }, []);

  // Load results map sound
  useEffect(() => {
    const resultsMap = new Audio('/sounds/results-screen-map.mp3');
    resultsMap.volume = 0.7;
    setResultsMapSound(resultsMap);
  }, []);

  // Load final round results sound
  useEffect(() => {
    const finalRoundResults = new Audio('/sounds/final-score1.mp3');
    finalRoundResults.volume = 0.7;
    setFinalRoundResultsSound(finalRoundResults);
  }, []);


  // Clear countdown timeouts when game is paused, quit, or timer changes
  useEffect(() => {
    if (isGamePaused || gameState.gamePhase !== 'playing' || gameState.timeLeft > 10 || gameState.timeLeft <= 0) {
      // Clear all countdown timeouts
      countdownTimeouts.forEach(timeout => clearTimeout(timeout));
      setCountdownTimeouts([]);
      setHasPlayedTenSecondsSound(false);
    }
  }, [isGamePaused, gameState.gamePhase, gameState.timeLeft]);

  // Timer countdown with auto-submit
  useEffect(() => {
    if (gameState.gamePhase === 'playing' && gameState.timeLeft > 0 && !isGamePaused) {
      // Start beep countdown when timer reaches 10 seconds
      if (gameState.timeLeft === 10 && !hasPlayedTenSecondsSound && gameState.currentFood && beepSounds.length === 10) {
        setHasPlayedTenSecondsSound(true);
        
        // Clear any existing timeouts
        countdownTimeouts.forEach(timeout => clearTimeout(timeout));
        
        // Schedule individual beeps for each second (10, 9, 8, 7, 6, 5, 4, 3, 2, 1)
        const newTimeouts: NodeJS.Timeout[] = [];
        for (let i = 0; i < 10; i++) {
          const timeout = setTimeout(() => {
            if (beepSounds[i]) {
              beepSounds[i].currentTime = 0; // Reset to beginning
              beepSounds[i].play().catch(e => console.log(`Beep${10-i} play failed:`, e));
            }
          }, i * 1000); // Each beep 1 second apart
          newTimeouts.push(timeout);
        }
        setCountdownTimeouts(newTimeouts);
      }
      
      const timer = setTimeout(() => {
        setGameState(prev => {
          const newTimeLeft = prev.timeLeft - 1;
          
          // Play bell-1 sound when timer reaches 0, but only if we're in the playing phase
          // and not on nickname screen (where timer isn't visible)
          if (newTimeLeft === 0 && !showNicknameScreen) {
            playBell1Sound();
            // Auto-submit when timer reaches 0
            setTimeout(() => {
              console.log('🔄 Auto-submitting guess due to timer reaching 0');
              submitGuess();
            }, 1000);
          }
          
          return {
            ...prev,
            timeLeft: newTimeLeft,
          };
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [gameState.timeLeft, gameState.gamePhase, gameState.currentFood, submitGuess, hasPlayedTenSecondsSound, isGamePaused, beepSounds, playBell1Sound, showNicknameScreen]);

  // Client-side detection to prevent hydration mismatch
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Mobile detection - client-side only to prevent hydration mismatch
  useEffect(() => {
    if (!isClient) return;
    
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [isClient]);

  // Background music management based on game phase - DISABLED to test direct triggering
  // useEffect(() => {
  //   if (!gameScreenMusic || !resultsScreenMusic) {
  //     console.log('Background music not loaded yet:', { gameScreenMusic: !!gameScreenMusic, resultsScreenMusic: !!resultsScreenMusic });
  //     return;
  //   }

  //   console.log('Background music management triggered:', { 
  //     gamePhase: gameState.gamePhase, 
  //     currentBgMusic: !!currentBgMusic,
  //     gameScreenMusic: !!gameScreenMusic,
  //     resultsScreenMusic: !!resultsScreenMusic
  //   });

  //   // Always start music when game phase changes, regardless of current music
  //   if (gameState.gamePhase === 'playing') {
  //     // Start game screen background music when playing
  //     console.log('Starting game screen music from useEffect');
  //     if (currentBgMusic && currentBgMusic !== gameScreenMusic) {
  //       const currentTime = currentBgMusic.currentTime;
  //       console.log('Switching from results to game music at time:', currentTime);
  //       stopCurrentMusic(currentBgMusic);
  //       setCurrentBgMusic(gameScreenMusic);
  //       playMusic(gameScreenMusic, currentTime);
  //     } else {
  //       console.log('No current music or same music, starting game music from beginning');
  //       setCurrentBgMusic(gameScreenMusic);
  //       playMusic(gameScreenMusic);
  //     }
  //   } else if (gameState.gamePhase === 'result') {
  //     // Start results screen background music when showing results
  //     console.log('Starting results screen music from useEffect');
  //     if (currentBgMusic && currentBgMusic !== resultsScreenMusic) {
  //       const currentTime = currentBgMusic.currentTime;
  //       console.log('Switching from game to results music at time:', currentTime);
  //       stopCurrentMusic(currentBgMusic);
  //       setCurrentBgMusic(resultsScreenMusic);
  //       playMusic(resultsScreenMusic, currentTime);
  //     } else {
  //       console.log('No current music or same music, starting results music from beginning');
  //       setCurrentBgMusic(resultsScreenMusic);
  //       playMusic(resultsScreenMusic);
  //     }
  //   }
  // }, [gameState.gamePhase, gameScreenMusic, resultsScreenMusic, currentBgMusic, playMusic, stopCurrentMusic]);

  // Cleanup background music on unmount
  useEffect(() => {
    return () => {
      if (gameScreenMusic) {
        gameScreenMusic.pause();
        gameScreenMusic.currentTime = 0;
      }
      if (resultsScreenMusic) {
        resultsScreenMusic.pause();
        resultsScreenMusic.currentTime = 0;
      }
      if (bellSound) {
        bellSound.pause();
        bellSound.currentTime = 0;
      }
      if (bell1Sound) {
        bell1Sound.pause();
        bell1Sound.currentTime = 0;
      }
    };
  }, [gameScreenMusic, resultsScreenMusic, bellSound, bell1Sound]);

  // Simple click handler with hotspot adjustment
  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    console.log('🗺️ Map clicked!', { 
      gamePhase: gameState.gamePhase, 
      hasLatLng: !!event.latLng,
      latLng: event.latLng
    });
    
    if (gameState.gamePhase === 'playing' && event.latLng) {
      // Get the original click coordinates
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      
      console.log('📍 Setting guess position:', { lat, lng });
      
      // Play map click sound for all clicks
      playMapClickSound();
      
      // Simple offset to align with crosshair center
      // The crosshair cursor hotspot is at the center, but Google Maps detects at the tip
      const offsetDegrees = 0.0005; // Small offset to center the click
      
      // Apply offset to move click detection to crosshair center
      const adjustedLat = lat - offsetDegrees; // Move down slightly
      const adjustedLng = lng; // No horizontal offset needed
      
      console.log('📍 Adjusted guess position:', { adjustedLat, adjustedLng });
      
      setGameState(prev => ({
        ...prev,
        guessPosition: { lat: adjustedLat, lng: adjustedLng },
      }));
    }
  }, [gameState.gamePhase, playMapClickSound]);


  const handleGuessNow = () => {
    console.log('🎯 Guess button clicked!', { 
      hasGuessPosition: !!gameState.guessPosition, 
      guessPosition: gameState.guessPosition,
      gamePhase: gameState.gamePhase,
      timeLeft: gameState.timeLeft
    });
    if (gameState.guessPosition) {
      console.log('✅ Submitting guess...');
      submitGuess();
    } else {
      console.log('❌ No guess position set');
    }
  };

  // const handleNextRound = () => {
  //   if (foods.length > 0) {
  //     startNewRound(foods);
  //   }
  // };

  const handlePlayAgain = async () => {
    // Stop any ongoing animations immediately
    setIsAnimating(false);
    setDisplayedScore(0);
    
    // Reset UI state first
    setMapKey(0);
    setResultsPhase('none');
    setCountdown(3);
    
    // Reset 10-second sound flag when playing again
    setHasPlayedTenSecondsSound(false);
    
    // Reset all game state
    const resetGameState = {
      currentFood: null,
      currentImage: null,
      guessPosition: null,
      correctPosition: null,
      distance: null,
      timeLeft: 60,
      gamePhase: 'playing' as const,
      score: 0,
      round: 0,
      usedFoods: [],
      roundScore: 0,
      totalDistance: 0,
      startTime: Date.now(),
    };
    
    setGameState(resetGameState);
    
    // Refresh foods data to get latest images
    const currentFoods = await refreshFoodsData();
    
    // Filter foods to only include those with images
    const foodsWithImages = currentFoods.filter(food => food.images && food.images.length > 0);
    
    console.log(`Filtered ${currentFoods.length} foods down to ${foodsWithImages.length} foods with images`);
    
    if (foodsWithImages.length > 0) {
      // Get available foods using cookie system (no recent bias)
      let availableFoodIndices = CookieManager.getAvailableFoods(foodsWithImages, 20);
      
      // If no available foods (all used), reset and use all foods (allow repetition)
      if (availableFoodIndices.length === 0) {
        console.log('All foods used, resetting and allowing repetition');
        CookieManager.resetUsedFoods();
        availableFoodIndices = CookieManager.getAvailableFoods(foodsWithImages, 20);
      }

      // If still no foods available, use all foods
      if (availableFoodIndices.length === 0) {
        availableFoodIndices = Array.from({ length: foodsWithImages.length }, (_, i) => i);
      }
      
      if (availableFoodIndices.length > 0) {
        // Shuffle available foods for better randomization
        const shuffledIndices = [...availableFoodIndices].sort(() => Math.random() - 0.5);
        const randomIndex = shuffledIndices[0];
        const randomFood = foodsWithImages[randomIndex];
        const foodIndex = currentFoods.indexOf(randomFood); // Get original index for cookie tracking
        
        // Use preloaded image if available AND it belongs to the current food, otherwise select new image
        const selectedImage = (preloadedImage && randomFood.images.includes(preloadedImage)) 
          ? preloadedImage 
          : selectImage(randomFood);
        
        setGameState(prev => ({
          ...prev,
          currentFood: randomFood,
          currentImage: selectedImage,
          guessPosition: null,
          correctPosition: null,
          distance: null,
          timeLeft: 60,
          gamePhase: 'playing',
          round: 1,
          usedFoods: [foodIndex],
          roundScore: 0,
          totalDistance: 0,
          startTime: Date.now(),
        }));
        
        // Update cookie system with used food and image
        const imageIndex = randomFood.images.indexOf(selectedImage);
        CookieManager.updateSession(foodIndex, randomFood.name, imageIndex);
        
        // Update image history
        updateImageHistory(randomFood.name, selectedImage);
        
        // Clear preloaded image after use
        setPreloadedImage('');
        
        // Start game screen music for new game
        if (gameScreenMusic) {
          console.log('Starting game screen music from handlePlayAgain - restarting from beginning');
          // Always restart game music from the beginning for new games
          if (currentBgMusic && currentBgMusic !== gameScreenMusic) {
            stopCurrentMusic(currentBgMusic);
          }
          setCurrentBgMusic(gameScreenMusic);
          playMusic(gameScreenMusic, 0); // Always start from beginning
        }
      }
    }
  };

  const handleQuitGame = () => {
    // First, resume the game if it's paused
    if (isGamePaused) {
      setIsGamePaused(false);
    }
    
    // Stop all music and sounds
    if (gameScreenMusic) {
      gameScreenMusic.pause();
      gameScreenMusic.currentTime = 0;
    }
    if (resultsScreenMusic) {
      resultsScreenMusic.pause();
      resultsScreenMusic.currentTime = 0;
    }
    if (bellSound) {
      bellSound.pause();
      bellSound.currentTime = 0;
    }
    if (bell1Sound) {
      bell1Sound.pause();
      bell1Sound.currentTime = 0;
    }
    
    // Clear countdown beeps
    countdownTimeouts.forEach(timeout => clearTimeout(timeout));
    setCountdownTimeouts([]);
    setHasPlayedTenSecondsSound(false);
    
    // Clear results screen timer
    if (resultsScreenTimerRef.current) {
      clearTimeout(resultsScreenTimerRef.current);
      resultsScreenTimerRef.current = null;
    }
    resultsScreenRemainingTimeRef.current = 0;
    
    // Reset round progression guard
    isStartingNewRoundRef.current = false;
    
      // Reset no-guess animation state
      setIsNoGuessAnimating(false);
      
      // Reset diagonal transition state
      setIsDiagonalTransitioning(false);
    
    // Reset all game state
    setGameState({
      currentFood: null,
      currentImage: null,
      guessPosition: null,
      correctPosition: null,
      distance: null,
      timeLeft: 60,
      gamePhase: 'playing',
      score: 0,
      round: 0,
      usedFoods: [],
      roundScore: 0,
      totalDistance: 0,
      startTime: Date.now(),
    });
    
    // Reset UI state
    setMapKey(0);
    setResultsPhase('none');
    setCountdown(3);
    setCountdownAnimation('none');
    setShowSettings(false);
    setShowQuitConfirm(false);
    setImageHistory({});
    resetZoomClicks();
    setHasPlayedTenSecondsSound(false);
    setIsAnimating(false);
    setDisplayedScore(0);
    
    // Go back to nickname screen
    setShowNicknameScreen(true);
    setNickname('');
    setNicknameInput('');
    
    // Clear saved username and avatar for fresh start
    CookieManager.saveUserPreferences('', 0);
  };

  // Safe number formatting function
  const formatNumber = (num: number | null | undefined): string => {
    if (num === null || num === undefined || isNaN(num)) {
      return '0';
    }
    return num.toLocaleString();
  };

  // Format time duration
  const formatTime = (startTime: number): string => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes} min, ${seconds} sec`;
  };

  // Get custom remark based on score
  const getScoreRemark = (score: number): { message: string; emoji: string; color: string } => {
    if (score >= 20000) {
      return {
        message: "Absolutely incredible! You're a true master!",
        emoji: "🏆",
        color: "#FFD700"
      };
    } else if (score >= 15000) {
      return {
        message: "Outstanding! You really know your stuff!",
        emoji: "🌟",
        color: "#FF6B6B"
      };
    } else if (score >= 10000) {
      return {
        message: "Excellent work! You've got serious skills!",
        emoji: "🎯",
        color: "#4ECDC4"
      };
    } else if (score >= 5000) {
      return {
        message: "Good job! You're getting the hang of it!",
        emoji: "👍",
        color: "#45B7D1"
      };
    } else if (score >= 2000) {
      return {
        message: "Not bad! Keep exploring and learning!",
        emoji: "🌍",
        color: "#96CEB4"
      };
    } else if (score >= 500) {
      return {
        message: "You're learning! Every guess counts!",
        emoji: "📚",
        color: "#FECA57"
      };
    } else {
      return {
        message: "Keep trying! You'll get better with practice!",
        emoji: "🍽️",
        color: "#FF9FF3"
      };
    }
  };

  // Nickname entry screen
  if (showNicknameScreen) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #222453 0%, #1a1d3a 100%)',
        fontFamily: "'Alan Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
        position: 'relative',
        overflow: 'auto'
      }}>
        {/* Rotating Background Images - 1600x1200 optimized */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none'
        }}>
          <div style={{
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/assets/backgrounds/bg1.jpg), linear-gradient(135deg, #222453 0%, #1a1d3a 100%)',
            backgroundSize: 'cover, cover',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, no-repeat',
            opacity: 1,
            transition: 'opacity 0.5s ease-in-out',
            animation: 'backgroundRotate2 2s infinite'
          }} />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'url(/assets/backgrounds/bg2.jpg), linear-gradient(135deg, #1a1d3a 0%, #222453 100%)',
            backgroundSize: 'cover, cover',
            backgroundPosition: 'center, center',
            backgroundRepeat: 'no-repeat, no-repeat',
            opacity: 0,
            transition: 'opacity 0.5s ease-in-out',
            animation: 'backgroundRotate2 2s infinite 1s'
          }} />
        </div>
        
        {/* Main Content Container */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Nickname Form Section */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem'
          }}>
          <div style={{
            backgroundColor: '#1c102f',
            padding: '2rem',
            borderRadius: '1rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            maxWidth: '24rem',
            width: '90%',
            position: 'relative',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <Image 
              src="/logo.png" 
              alt="FoodMapper.io Logo" 
              width={80}
              height={80}
              priority
              style={{
                objectFit: 'contain',
                marginBottom: '0.5rem'
              }}
            />
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              fontFamily: "'Alan Sans', sans-serif",
              color: '#ffffff',
              textAlign: 'center',
              textShadow: '0 4px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.3)'
            }}>
              FoodMapper.io
            </div>
          </div>
          
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 400,
            fontFamily: "'Alan Sans', sans-serif",
            color: '#a78bfa',
            marginBottom: '2.5rem'
          }}>
            Guess where delicious foods come from around the world!
          </div>

          {/* Avatar Selection */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
              <button
                onClick={handlePreviousAvatar}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#4f46e5',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3730a3';
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
              >
                ←
              </button>
              
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundImage: `url(${avatarOptions[selectedAvatarIndex]})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '4px solid white',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 0 20px rgba(255, 255, 255, 0.1)'
              }} />
              
              <button
                onClick={handleNextAvatar}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#4f46e5',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3730a3';
                  e.currentTarget.style.transform = 'scale(1.05) translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                  e.currentTarget.style.transform = 'scale(1) translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
              >
                →
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: "'Alan Sans', sans-serif",
              color: '#ffffff',
              marginBottom: '0.5rem',
              textAlign: 'left'
            }}>
              Enter your nickname
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyPress={handleNicknameKeyPress}
                placeholder="Your awesome nickname..."
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '0.75rem 3rem 0.75rem 0.75rem',
                  fontSize: '1rem',
                  fontWeight: 500,
                  fontFamily: "'Alan Sans', sans-serif",
                  border: '2px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  boxSizing: 'border-box',
                  backgroundColor: '#ffffff',
                  color: '#000000',
                  boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.1)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4f46e5';
                  e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1), inset 0 1px 2px rgba(0, 0, 0, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'inset 0 1px 2px rgba(0, 0, 0, 0.1)';
                }}
                autoFocus
              />
              <button
                onClick={handleRandomNickname}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '2rem',
                  height: '2rem',
                  backgroundColor: '#4f46e5',
                  border: 'none',
                  borderRadius: '0.25rem',
                  color: 'white',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#3730a3';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
                title="Get random nickname"
              >
                🎲
              </button>
            </div>
          </div>


          <button
            onClick={handleStartGame}
            style={{
              width: '100%',
              padding: '1rem',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1.1rem',
              fontWeight: 800,
              fontFamily: "'Alan Sans', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
          >
            Play!
          </button>

          {/* Multiplayer Button */}
          <button
            onClick={handleMultiplayerClick}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: "'Alan Sans', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginBottom: '0.5rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3730a3';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#4f46e5';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            {multiplayerButtonText}
          </button>

          {/* Create Private Room Button */}
          <button
            onClick={handlePrivateRoomClick}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              fontFamily: "'Alan Sans', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#6d28d9';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#7c3aed';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
          >
            {privateRoomButtonText}
          </button>

          </div>
          </div>
          
          {/* How to Play Section */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            margin: '2rem',
            borderRadius: '1rem',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              maxWidth: '1200px',
              margin: '0 auto'
            }}>
              {/* About Section */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '1rem'
                }}>❓</div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  fontFamily: "'Alan Sans', sans-serif"
                }}>About</h2>
                <p style={{
                  color: '#6b7280',
                  lineHeight: '1.6',
                  fontSize: '1rem'
                }}>
                  <strong>FoodMapper.io</strong> is a free online multiplayer food guessing game. 
                  You&apos;ll see photos of delicious foods and guess their origin on the world map!
                </p>
              </div>

              {/* How to Play Section */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '1rem'
                }}>🎮</div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  fontFamily: "'Alan Sans', sans-serif"
                }}>How to Play</h2>
                <div style={{
                  color: '#6b7280',
                  lineHeight: '1.6',
                  fontSize: '1rem',
                  textAlign: 'left'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>1. Look at the food photo</strong><br/>
                    Examine the delicious dish and think about where it might come from.
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>2. Click on the world map</strong><br/>
                    Place your guess by clicking on the map where you think this food originates.
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <strong>3. Submit your guess</strong><br/>
                    Click the &quot;GUESS&quot; button to submit your answer.
                  </div>
                  <div>
                    <strong>4. Score points</strong><br/>
                    The closer you are to the correct location, the more points you earn!
                  </div>
                </div>
              </div>

              {/* Tips Section */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '1rem'
                }}>💡</div>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  fontFamily: "'Alan Sans', sans-serif"
                }}>Tips</h2>
                <div style={{
                  color: '#6b7280',
                  lineHeight: '1.6',
                  fontSize: '1rem',
                  textAlign: 'left'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>• Look for cultural clues in the presentation</div>
                  <div style={{ marginBottom: '0.5rem' }}>• Consider the ingredients and cooking style</div>
                  <div style={{ marginBottom: '0.5rem' }}>• Think about regional specialties</div>
                  <div>• Use the zoom feature to get a closer look!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* CSS Animation for Background Rotation - 2 Images Only */}
        <style jsx>{`
          @keyframes backgroundRotate2 {
            0%, 50% { opacity: 1; }
            50.01%, 100% { opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        width: '100vw',
        backgroundColor: '#1a1a2e'
      }}>
        <div style={{ fontSize: '1.5rem', color: 'white', fontWeight: '600' }}>Loading Google Maps...</div>
      </div>
    );
  }

  // Final score screen
  if (gameState.gamePhase === 'finalScore') {
    const currentScore = gameState.score || 0;
    const totalTime = formatTime(gameState.startTime);
    const scoreRemark = getScoreRemark(currentScore);
    
    return (
      <div style={{
        height: '100vh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: '"Courier New", monospace',
        imageRendering: 'pixelated',
        backgroundColor: '#8B5CF6', // Purple background
        opacity: finalScoreFadeIn ? 1 : 0,
        transition: 'opacity 0.8s ease-in-out'
      }}>
        {/* Purple background overlay that fades in */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#8B5CF6',
          zIndex: 1,
          opacity: finalScoreFadeIn ? 0 : 1,
          transition: 'opacity 0.8s ease-in-out'
        }} />
        
        <div style={{ 
          height: '100%', 
          width: '100%',
          position: 'relative',
          zIndex: 2,
          opacity: finalScoreFadeIn ? 1 : 0,
          transition: 'opacity 0.8s ease-in-out'
        }}>
          <GoogleMap
            mapContainerStyle={getMapContainerStyle(isClient && isMobile)}
            center={center}
            zoom={2}
            options={{
              disableDefaultUI: true,
              zoomControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: false,
              clickableIcons: false, // Disable clickable POIs and "View on Google Maps"
              // Restrict vertical panning to prevent empty space exposure
              restriction: {
                latLngBounds: {
                  north: 85, // Maximum latitude (near North Pole)
                  south: -85, // Minimum latitude (near South Pole)
                  east: 180, // Maximum longitude
                  west: -180 // Minimum longitude
                },
                strictBounds: false // Allow slight overscroll but prevent major empty space
              },
              // Enable horizontal wrapping (globe-like behavior)
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              // Disable vertical panning beyond reasonable bounds
              gestureHandling: 'greedy',
              // Custom styling for purple oceans
              styles: [
                {
                  featureType: "water",
                  elementType: "geometry",
                  stylers: [
                    { color: "#6e73ff" }, // Custom purple color
                    { lightness: 40 },
                    { saturation: 15 }
                  ]
                },
                {
                  featureType: "water",
                  elementType: "labels",
                  stylers: [
                    { visibility: "off" }
                  ]
                }
              ]
            }}
          />
        </div>

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 5
        }} />

        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 10
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            fontSize: '2rem',
            fontWeight: 700,
            fontFamily: "'Alan Sans', sans-serif",
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundImage: `url(${avatarOptions[selectedAvatarIndex]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '3px solid white',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 0 0 1px rgba(255, 255, 255, 0.2)'
            }} />
            {nickname}
          </div>
          
          {/* Custom Score Remark */}
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            fontFamily: "'Alan Sans', sans-serif",
            color: '#a78bfa',
            marginBottom: '2rem',
            textAlign: 'center',
            maxWidth: '600px',
            margin: '0 auto 2rem auto'
          }}>
            {scoreRemark.message}
          </div>
          
          <div style={{
            fontSize: '6rem',
            fontWeight: 700,
            fontFamily: "'Alan Sans', sans-serif",
            color: '#FFD700',
            marginBottom: '0.5rem',
            textShadow: '0 0 5px #FFD700, 0 0 10px #FFD700, 0 2px 4px rgba(0, 0, 0, 0.5)',
            filter: 'drop-shadow(0 0 2px #FFD700)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.05em',
            transition: isAnimating ? 'none' : 'all 0.3s ease'
          }}>
            {displayedScore.toLocaleString().padStart(4, '0')}
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 500,
            fontFamily: "'Alan Sans', sans-serif",
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '1rem'
          }}>
            OF 25,000 POINTS
          </div>
          <div style={{
            fontSize: '1.25rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '2rem',
            fontFamily: "'Alan Sans', sans-serif"
          }}>
            {formatNumber(gameState.totalDistance)} km / {totalTime}
          </div>
        </div>

        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}>
          <button
            onClick={handlePlayAgain}
            style={{
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              padding: '1rem 2rem',
              fontSize: '1.25rem',
              fontWeight: 800,
              fontFamily: "'Alan Sans', sans-serif",
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#6d28d9';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#7c3aed';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
            }}
          >
            PLAY AGAIN
          </button>
          <div style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.875rem',
            marginTop: '0.5rem',
            textAlign: 'center',
            fontFamily: "'Alan Sans', sans-serif"
          }}>
            Hit SPACE to continue
          </div>
        </div>
      </div>
    );
  }

  if (!gameState.currentFood || !gameState.currentImage) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh', 
        width: '100vw',
        backgroundColor: '#1a1a2e',
        gap: '1rem'
      }}>
        <div style={{ fontSize: '1.5rem', color: 'white', fontWeight: '600' }}>Loading game...</div>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #333', 
          borderTop: '4px solid #fff', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div 
      style={{
      height: '100vh',
      width: '100vw',
      position: 'relative',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box'
      }}
      onClick={handleBackgroundClick}
    >
      {/* Header - Fixed position, not affected by zoom */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4rem',
        background: '#8B5CF6', // Brighter purple to match diagonal transition
          padding: '0 2rem',
          zIndex: 20,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'min(2rem, 4vw)' }}>
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: 'min(1.5rem, 4vw)', 
              fontWeight: 800, 
              fontFamily: "'Alan Sans', sans-serif",
              color: 'white',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
            }}>
              <Image 
                src="/logo.png" 
                alt="FoodMapper.io Logo" 
                width={40}
                height={40}
                style={{
                  objectFit: 'contain',
                  filter: 'drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.5))'
                }}
              />
              FoodMapper.io
            </div>
            <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: 'min(1.1rem, 2.8vw)', 
            fontWeight: 500,
            fontFamily: "'Alan Sans', sans-serif",
            color: 'rgba(255, 255, 255, 0.8)',
            textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundImage: `url(${avatarOptions[selectedAvatarIndex]})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              filter: 'drop-shadow(1px 1px 2px rgba(0, 0, 0, 0.5))'
            }} />
{nickname}
            </div>
          </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'min(1rem, 2vw)' }}>
            <div style={{ 
            fontSize: 'min(1.25rem, 3vw)', 
            fontWeight: 600,
            fontFamily: "'Alan Sans', sans-serif",
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: 'min(0.5rem, 1vw) min(1rem, 2vw)',
              borderRadius: '1rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}>
              ROUND {gameState.round || 0} / 6
            </div>
            <div style={{ 
            fontSize: 'min(1.25rem, 3vw)', 
            fontWeight: 600,
            fontFamily: "'Alan Sans', sans-serif",
              color: 'white',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
            padding: 'min(0.5rem, 1vw) min(1rem, 2vw)',
              borderRadius: '1rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            }}>
              SCORE {formatNumber(gameState.score)}
            </div>
          </div>
        </div>

      {/* Food Image Zoom Controls - Fixed position, not affected by zoom */}
      <div style={{
        position: 'fixed',
        bottom: 'min(1rem, 2vw)',
        left: 'min(1rem, 2vw)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        gap: 'min(0.5rem, 1vw)'
      }}>
        {/* Zoom In Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFoodImageZoomIn();
          }}
          style={{
            width: '2.5rem',
            height: '2.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: 'none',
            borderRadius: '0.5rem 0.5rem 0 0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: 'white',
            fontWeight: 'bold',
            transition: 'background-color 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          }}
        >
          +
        </button>
        
        {/* Divider line */}
        <div style={{
          width: '2.5rem',
          height: '1px',
          backgroundColor: 'rgba(255, 255, 255, 0.3)'
        }} />
        
        {/* Zoom Out Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFoodImageZoomOut();
          }}
          style={{
            width: '2.5rem',
            height: '2.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: 'none',
            borderRadius: '0 0 0.5rem 0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            color: 'white',
            fontWeight: 'bold',
            transition: 'background-color 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          }}
        >
          −
        </button>
        
        {/* Settings Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            pauseGame();
          }}
          style={{
            width: '2.5rem',
            height: '2.5rem',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: 'white',
            marginTop: '0.5rem',
            transition: 'background-color 0.2s ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
          }}
        >
          ⚙️
        </button>
      </div>

      {/* Debug Panel - Only show in development */}
      {process.env.NODE_ENV === 'development' && showDebugPanel && (
        <div style={{
          position: 'absolute',
          top: '4rem',
          right: '1rem',
          width: '300px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '1rem',
          borderRadius: '0.5rem',
          zIndex: 25,
          fontSize: '0.875rem',
          fontFamily: 'monospace',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0, color: '#10b981' }}>Session Debug</h3>
            <button
              onClick={() => setShowDebugPanel(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Total Sessions:</strong> {sessionStats.totalSessions}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Foods Used:</strong> {sessionStats.foodsUsed}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Last Played:</strong> {sessionStats.lastPlayed}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Current Round:</strong> {gameState.round}/6
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Available Foods:</strong> {CookieManager.getAvailableFoods(foods, 20).length}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Recent Dishes:</strong> {CookieManager.getSessionData().recentDishes.length}
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Last Game Dishes:</strong> {CookieManager.getSessionData().lastGameDishes.length}
          </div>
          <button
            onClick={() => {
              CookieManager.resetSession();
              updateSessionStats();
            }}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }}
          >
            Reset Session
          </button>
        </div>
      )}

      {/* Debug Toggle Button - Only show in development */}
      {process.env.NODE_ENV === 'development' && (
      <button
        onClick={() => {
          setShowDebugPanel(!showDebugPanel);
          updateSessionStats();
        }}
        style={{
          position: 'absolute',
          top: '4.5rem',
          right: '1rem',
          width: '40px',
          height: '40px',
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '50%',
          cursor: 'pointer',
          zIndex: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem'
        }}
        title="Toggle Debug Panel"
      >
        🐛
      </button>
      )}

      {/* Full-screen Food Image Background - Only this part zooms */}
      <div 
        style={{
          position: 'absolute',
          top: '4rem', // Start below header
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url(${gameState.currentImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          transform: `scale(${foodImageScale}) translate(${foodImagePosition.x}px, ${foodImagePosition.y}px)`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          cursor: foodImageScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
        }}
        ref={foodImageRef}
        onMouseDown={handleFoodImageMouseDown}
        onMouseMove={handleFoodImageMouseMove}
        onMouseUp={handleFoodImageMouseUp}
        onMouseLeave={handleFoodImageMouseUp}
        onTouchStart={handleFoodImageTouchStart}
        onTouchMove={handleFoodImageTouchMove}
        onTouchEnd={handleFoodImageTouchEnd}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        }} />

        {/* Top Bar - Purple */}

        {/* Center question overlay */}
        {gameState.gamePhase === 'playing' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 10,
            opacity: showQuestionText ? 1 : 0,
            transition: showQuestionText ? 'none' : 'opacity 1.2s ease-out' // Only transition when fading out
          }}>
            <h2 style={{ 
              fontSize: 'min(3rem, 8vw)', 
              fontWeight: 800, 
              fontFamily: "'Alan Sans', sans-serif",
              color: 'white', 
              marginBottom: '1rem',
              textShadow: '0 4px 8px rgba(0, 0, 0, 0.7)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              Where is this dish from?
            </h2>
          </div>
        )}

      </div>

      {/* Timer - Fixed position, not affected by food image zoom */}
        {gameState.gamePhase === 'playing' && (
          <div className={`timer-display ${isClient && isMobile ? 'mobile-timer' : ''}`} style={{
          position: 'fixed',
          top: isClient && isMobile ? '1rem' : '5rem',
          right: isClient && isMobile ? '1rem' : 'min(2rem, 4vw)',
          zIndex: 40,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
          padding: isClient && isMobile ? '0.5rem 1rem' : 'min(0.75rem, 1.5vw) min(1.5rem, 3vw)',
          borderRadius: '0.75rem',
          fontSize: isClient && isMobile ? '1.5rem' : 'min(1.5rem, 4vw)',
          fontWeight: 800,
          fontFamily: "'Alan Sans', sans-serif",
          width: isClient && isMobile ? 'auto' : 'min(4rem, 10vw)',
          height: isClient && isMobile ? 'auto' : 'min(3rem, 7.5vw)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}>
            {gameState.timeLeft || 0}s
          </div>
        )}

      {/* Map and Button Container */}
        <div style={{
        position: 'fixed',
        bottom: 'min(1rem, 2vw)',
        right: 'min(1rem, 2vw)',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'min(0.75rem, 1.5vw)',
        maxWidth: 'calc(100vw - min(2rem, 4vw))',
        maxHeight: 'calc(100vh - min(2rem, 4vw))'
      }}>
        {/* Map Size Control Buttons */}
        <div 
          style={{
          position: 'absolute',
            top: '-2rem',
            left: '0',
            zIndex: 40,
            display: 'flex',
            gap: '0.25rem',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '0.5rem',
            padding: '0.25rem',
            backdropFilter: 'blur(10px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Expand Button */}
          <button
            onClick={handleExpandMap}
            disabled={mapSize === 'extraLarge'}
            style={{
              width: '1.5rem',
              height: '1.5rem',
              backgroundColor: mapSize === 'extraLarge' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              cursor: mapSize === 'extraLarge' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: mapSize === 'extraLarge' ? 'rgba(255, 255, 255, 0.5)' : '#000',
              fontSize: '0.75rem',
          fontWeight: 'bold',
              opacity: isMapPinned ? 0.5 : 1
            }}
            title={isMapPinned ? "Unpin to resize" : "Expand Map"}
          >
            ↖
          </button>
          
          {/* Shrink Button */}
          <button
            onClick={handleShrinkMap}
            disabled={mapSize === 'extraSmall'}
            style={{
              width: '1.5rem',
              height: '1.5rem',
              backgroundColor: mapSize === 'extraSmall' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              cursor: mapSize === 'extraSmall' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: mapSize === 'extraSmall' ? 'rgba(255, 255, 255, 0.5)' : '#000',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              opacity: isMapPinned ? 0.5 : 1
            }}
            title={isMapPinned ? "Unpin to resize" : "Shrink Map"}
          >
            ↘
          </button>
          
          {/* Pin Button */}
          <button
            onClick={handlePinMap}
            style={{
              width: '1.5rem',
              height: '1.5rem',
              backgroundColor: isMapPinned ? '#10b981' : 'rgba(255, 255, 255, 0.9)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isMapPinned ? 'white' : '#000',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}
            title={isMapPinned ? "Unpin Map Size" : "Pin Map Size"}
          >
            📌
          </button>
        </div>
        
        
        {/* Mini Map */}
        <div 
          data-map-container
          style={{
          width: (() => {
            const baseWidth = mapSize === 'extraSmall' ? 250 : mapSize === 'small' ? 300 : mapSize === 'default' ? 350 : mapSize === 'large' ? 450 : 550;
            const hoverWidth = mapSize === 'extraSmall' ? 270 : mapSize === 'small' ? 320 : mapSize === 'default' ? 370 : mapSize === 'large' ? 470 : 570;
            // Only allow hover effects when at default size and not pinned
            return (isMapHovered && !isMapPinned && mapSize === 'default') ? `min(${hoverWidth}px, calc(100vw - 4rem))` : `min(${baseWidth}px, calc(100vw - 4rem))`;
          })(),
          height: (() => {
            const baseHeight = mapSize === 'extraSmall' ? 150 : mapSize === 'small' ? 200 : mapSize === 'default' ? 250 : mapSize === 'large' ? 350 : 450;
            const hoverHeight = mapSize === 'extraSmall' ? 170 : mapSize === 'small' ? 220 : mapSize === 'default' ? 270 : mapSize === 'large' ? 370 : 470;
            // Only allow hover effects when at default size and not pinned
            return (isMapHovered && !isMapPinned && mapSize === 'default') ? `min(${hoverHeight}px, calc(100vh - 8rem))` : `min(${baseHeight}px, calc(100vh - 8rem))`;
          })(),
          borderRadius: '0.5rem',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          transition: isMapPinned ? 'none' : 'all 0.3s ease', // Disable transition when pinned
          cursor: gameState.gamePhase === 'playing' ? 'crosshair' : gameState.gamePhase === 'result' ? 'grab' : 'default'
        }}
        onMouseEnter={() => setIsMapHovered(true)}
        onMouseLeave={(e) => {
          // Check if the mouse is moving to the zoom buttons
          const relatedTarget = e.relatedTarget;
          if (relatedTarget && relatedTarget instanceof HTMLElement && relatedTarget.closest('[data-zoom-controls]')) {
            // Don't change hover state if moving to zoom controls
            return;
          }
          setIsMapHovered(false);
        }}
        >
        <GoogleMap
          key={mapKey}
          mapContainerStyle={miniMapStyle}
          center={center}
            zoom={zoomLevel}
          onClick={handleMapClick}
          options={{
            disableDefaultUI: true,
              zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
              rotateControl: false,
              scaleControl: false,
              panControl: false,
              clickableIcons: false, // Disable clickable POIs and "View on Google Maps"
              // Allow full zoom range like Google Maps
              minZoom: 1,
              maxZoom: 20,
              // Restrict vertical panning to prevent empty space exposure
              restriction: {
                latLngBounds: {
                  north: 85, // Maximum latitude (near North Pole)
                  south: -85, // Minimum latitude (near South Pole)
                  east: 180, // Maximum longitude
                  west: -180 // Minimum longitude
                },
                strictBounds: false // Allow slight overscroll but prevent major empty space
              },
              // Enable horizontal wrapping (globe-like behavior)
              mapTypeId: google.maps.MapTypeId.ROADMAP,
              // Disable vertical panning beyond reasonable bounds
              gestureHandling: 'greedy',
              // Custom styling for purple oceans
              styles: [
                {
                  featureType: "water",
                  elementType: "geometry",
                  stylers: [
                    { color: "#6e73ff" }, // Custom purple color
                    { lightness: 40 },
                    { saturation: 15 }
                  ]
                },
                {
                  featureType: "water",
                  elementType: "labels",
                  stylers: [
                    { visibility: "off" }
                  ]
                }
              ]
            }}
          >
          {gameState.guessPosition && (
            <Marker
              position={gameState.guessPosition}
              title="Your Guess"
                animation={undefined}
              icon={{
                    url: avatarImages[selectedAvatarIndex] ? createPinSVG(avatarImages[selectedAvatarIndex], 32) : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="15" fill="#6e73ff" stroke="white" stroke-width="2"/>
                        <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-family="Arial">?</text>
                  </svg>
                `),
                    scaledSize: new google.maps.Size(32, 32),
                    anchor: new google.maps.Point(16, 16), // Center the icon on the position
              }}
                  zIndex={2}
            />
          )}
        </GoogleMap>
      </div>

        {/* Custom Zoom Controls for Main Game Map */}
        {gameState.gamePhase === 'playing' && (
          <div 
            data-zoom-controls
            style={{
              position: 'absolute',
              top: '0.25rem',
              left: '0.25rem',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}
            onMouseEnter={(e) => {
              e.stopPropagation();
              // Keep the map hovered state when hovering over zoom buttons
              if (!isMapHovered) {
                setIsMapHovered(true);
              }
            }}
            onMouseLeave={(e) => {
              e.stopPropagation();
              // Don't change the map hover state when leaving zoom buttons
            }}
          >
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 1, 20))}
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                backgroundColor: 'white',
                border: '2px solid #e5e7eb',
                color: '#374151',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              +
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 1, 1))}
              style={{
                width: '1.5rem',
                height: '1.5rem',
                borderRadius: '50%',
                backgroundColor: 'white',
                border: '2px solid #e5e7eb',
                color: '#374151',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              −
            </button>
          </div>
        )}

      {/* Guess Button */}
      {gameState.gamePhase === 'playing' && (
          <button
            className={`game-button ${isClient && isMobile ? 'mobile-guess-button' : ''}`}
            onClick={handleGuessNow}
            disabled={!gameState.guessPosition}
            style={{
              width: isClient && isMobile ? 'calc(100vw - 2rem)' : (() => {
                const baseWidth = mapSize === 'extraSmall' ? 250 : mapSize === 'small' ? 300 : mapSize === 'default' ? 350 : mapSize === 'large' ? 450 : 550;
                const hoverWidth = mapSize === 'extraSmall' ? 270 : mapSize === 'small' ? 320 : mapSize === 'default' ? 370 : mapSize === 'large' ? 470 : 570;
                // Only allow hover effects when at default size and not pinned
                return (isMapHovered && !isMapPinned && mapSize === 'default') ? `min(${hoverWidth}px, calc(100vw - 4rem))` : `min(${baseWidth}px, calc(100vw - 4rem))`;
              })(),
              padding: isClient && isMobile ? '1rem 1.5rem' : '1rem 2rem',
              backgroundColor: gameState.guessPosition ? '#10b981' : '#9ca3af',
              color: 'white',
              borderRadius: '0.75rem',
              fontWeight: 'bold',
              fontSize: isClient && isMobile ? '1rem' : (() => {
                // Responsive font size based on map size
                const baseFontSize = mapSize === 'extraSmall' ? '0.75rem' : mapSize === 'small' ? '0.875rem' : '1rem';
                return baseFontSize;
              })(),
              border: 'none',
              cursor: gameState.guessPosition ? 'pointer' : 'not-allowed',
              transition: isMapPinned ? 'none' : 'all 0.3s ease',
              boxShadow: gameState.guessPosition ? '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 20px rgba(124, 58, 237, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.2)',
              textTransform: 'uppercase',
              transform: 'translateY(0)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: "'Alan Sans', sans-serif",
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '0.5px'
            }}
          >
            {gameState.guessPosition ? 'GUESS' : 'PLACE YOUR PIN ON THE MAP'}
          </button>
        )}
      </div>

      {/* Press SPACE Text - Independent of results panel */}
      {gameState.gamePhase === 'result' && resultsPhase === 'showing' && (
        <div style={{
          position: 'fixed',
          top: '1rem', // Very close to top edge
          left: '50%',
          transform: 'translate(-50%, 0)',
          textAlign: 'center',
          color: 'white',
          fontSize: '1.2rem',
          fontWeight: 600,
          fontFamily: "'Alan Sans', sans-serif",
          textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.5)',
          zIndex: 200, // Very high z-index
          pointerEvents: 'none',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          border: '2px solid rgba(255, 255, 255, 0.2)'
        }}>
          Press SPACE to skip to next round
        </div>
      )}

      {/* Results Screen with Map */}
      {gameState.gamePhase === 'result' && (
        <style>
          {`
            .results-map-container * {
              cursor: ${isMapGrabbing ? 'grabbing' : 'grab'} !important;
            }
            .results-map-container .gm-style * {
              cursor: ${isMapGrabbing ? 'grabbing' : 'grab'} !important;
            }
            .results-map-container .gm-style-iw * {
              cursor: ${isMapGrabbing ? 'grabbing' : 'grab'} !important;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            
            /* Food Image Zoom Button Styles */
            .pixelated-zoom-button {
              image-rendering: pixelated;
              image-rendering: -moz-crisp-edges;
              image-rendering: crisp-edges;
              border: 2px solid #000000;
              border-radius: 8px;
              position: relative;
              font-family: 'Courier New', monospace;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              box-shadow: 
                0 0 0 1px #ffffff,
                0 2px 0 #000000,
                inset 0 1px 0 rgba(255, 255, 255, 0.8);
              transition: all 0.1s ease;
            }
            
            .pixelated-zoom-button:hover {
              transform: translateY(-1px);
              box-shadow: 
                0 0 0 1px #ffffff,
                0 3px 0 #000000,
                inset 0 1px 0 rgba(255, 255, 255, 0.9);
            }
            
            .pixelated-zoom-button:active {
              transform: translateY(1px);
              box-shadow: 
                0 0 0 1px #ffffff,
                0 1px 0 #000000,
                inset 0 1px 0 rgba(255, 255, 255, 0.7);
            }
            
            .pixelated-zoom-button-orange {
              background-color: #ff8000;
              color: #ffffff;
            }
            
            .pixelated-zoom-button-purple {
              background-color: #8B5CF6;
              color: #ffffff;
            }
            
            /* Multi-Layer Diagonal Page Transition */
            @keyframes diagonalPageTransition1 {
              0% {
                transform: translate(-150%, -150%) rotate(-45deg);
                opacity: 0;
              }
              10% {
                transform: translate(-120%, -120%) rotate(-45deg);
                opacity: 0.8;
              }
              30% {
                transform: translate(-50%, -50%) rotate(-45deg);
                opacity: 0.9;
              }
              50% {
                transform: translate(0%, 0%) rotate(-45deg);
                opacity: 0.9;
              }
              70% {
                transform: translate(50%, 50%) rotate(-45deg);
                opacity: 0.6;
              }
              85% {
                transform: translate(100%, 100%) rotate(-45deg);
                opacity: 0.2;
              }
              100% {
                transform: translate(150%, 150%) rotate(-45deg);
                opacity: 0;
              }
            }
            
            @keyframes diagonalPageTransition2 {
              0% {
                transform: translate(-120%, -120%) rotate(-45deg);
                opacity: 0;
              }
              15% {
                transform: translate(-90%, -90%) rotate(-45deg);
                opacity: 0.6;
              }
              30% {
                transform: translate(-30%, -30%) rotate(-45deg);
                opacity: 0.7;
              }
              50% {
                transform: translate(0%, 0%) rotate(-45deg);
                opacity: 0.7;
              }
              70% {
                transform: translate(30%, 30%) rotate(-45deg);
                opacity: 0.5;
              }
              85% {
                transform: translate(80%, 80%) rotate(-45deg);
                opacity: 0.2;
              }
              100% {
                transform: translate(120%, 120%) rotate(-45deg);
                opacity: 0;
              }
            }
            
            @keyframes diagonalPageTransition3 {
              0% {
                transform: translate(-100%, -100%) rotate(-45deg);
                opacity: 0;
              }
              20% {
                transform: translate(-70%, -70%) rotate(-45deg);
                opacity: 0.4;
              }
              30% {
                transform: translate(-20%, -20%) rotate(-45deg);
                opacity: 0.5;
              }
              50% {
                transform: translate(0%, 0%) rotate(-45deg);
                opacity: 0.5;
              }
              70% {
                transform: translate(20%, 20%) rotate(-45deg);
                opacity: 0.4;
              }
              85% {
                transform: translate(60%, 60%) rotate(-45deg);
                opacity: 0.1;
              }
              100% {
                transform: translate(100%, 100%) rotate(-45deg);
                opacity: 0;
              }
            }
            
            .diagonal-page-transition-1 {
              animation: diagonalPageTransition1 2.0s ease-in-out forwards;
            }
            
            .diagonal-page-transition-2 {
              animation: diagonalPageTransition2 1.8s ease-in-out forwards;
            }
            
            .diagonal-page-transition-3 {
              animation: diagonalPageTransition3 1.6s ease-in-out forwards;
            }
            
            
          `}
        </style>
      )}
      {gameState.gamePhase === 'result' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)'
        }}>
          <div 
            data-map-container 
            className="results-map-container"
            style={{ 
              height: '100%', 
              width: '100%',
              backgroundColor: '#f0f0f0' // Light gray background to prevent empty areas
            }}
            onMouseDown={() => setIsMapGrabbing(true)}
            onMouseUp={() => setIsMapGrabbing(false)}
            onMouseLeave={() => setIsMapGrabbing(false)}
          >
            <GoogleMap
              key={`result-${mapKey}-${resultMapZoom}`}
              mapContainerStyle={{
                ...mapContainerStyle,
                cursor: 'grab'
              }}
              center={resultMapCenter}
              zoom={resultMapZoom}
              onLoad={onResultMapLoad}
              options={{
                // Enable smooth transitions for results screen
                gestureHandling: 'greedy',
                disableDefaultUI: true, // Disable ALL default UI first
                zoomControl: false, // Disable default zoom controls
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                rotateControl: false,
                scaleControl: false,
                panControl: false,
                clickableIcons: false, // Disable clickable POIs and "View on Google Maps"
                // Enable horizontal wrapping (globe-like behavior)
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                // Custom styling for purple oceans
                styles: [
                  {
                    featureType: "water",
                    elementType: "geometry",
                    stylers: [
                      { color: "#6e73ff" }, // Custom purple color
                      { lightness: 40 },
                      { saturation: 15 }
                    ]
                  },
                  {
                    featureType: "water",
                    elementType: "labels",
                    stylers: [
                      { visibility: "off" }
                    ]
                  }
                ]
              }}
            >
              {gameState.guessPosition && (
                <Marker
                  position={gameState.guessPosition}
                  title="Your Guess"
                  animation={undefined}
                  icon={{
                    url: avatarImages[selectedAvatarIndex] ? createPinSVG(avatarImages[selectedAvatarIndex], 36) : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="18" cy="18" r="17" fill="#6e73ff" stroke="white" stroke-width="2"/>
                        <text x="18" y="22" text-anchor="middle" fill="white" font-size="14" font-family="Arial">?</text>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(36, 36),
                    anchor: new google.maps.Point(18, 18), // Center the icon on the position
                  }}
                  zIndex={2}
                />
              )}

              {gameState.correctPosition && (
                <Marker
                  position={gameState.correctPosition}
                  title="Correct Location"
                  animation={undefined}
                  icon={{
                    url: locationImageData ? createPinSVG(locationImageData, 36) : 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="18" cy="18" r="17" fill="none" stroke="white" stroke-width="2"/>
                      </svg>
                    `),
                    scaledSize: new google.maps.Size(36, 36),
                    anchor: new google.maps.Point(18, 18), // Center the icon on the position
                  }}
                  zIndex={2}
                />
              )}

              {gameState.guessPosition && gameState.correctPosition && (
                <Polyline
                  path={[gameState.guessPosition, gameState.correctPosition]}
                  options={{
                    strokeColor: '#000000',
                    strokeOpacity: 0, // Hide the default line
                    strokeWeight: 2,
                    zIndex: 1, // Ensure polyline is behind markers
                    icons: [{
                      icon: {
                        path: 'M 0,-1 0,1',
                        strokeOpacity: 1,
                        strokeWeight: 2,
                        scale: 2
                      },
                      offset: '0',
                      repeat: '8px'
                    }]
                  }}
                />
              )}
            </GoogleMap>
          </div>


          {/* Results Panel - Fixed position, no interference */}
          {(resultsPhase === 'showing' || resultsPhase === 'countdown') && (
            <div style={{
              position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
              backgroundColor: 'rgba(139, 92, 246, 0.8)', // Brighter purple to match diagonal transition
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(124, 58, 237, 0.3)',
              borderTop: '4px solid rgba(30, 27, 75, 0.9)', // Dark border on top as dividing line
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 30px rgba(124, 58, 237, 0.2)',
            padding: '2rem',
              zIndex: 50,
              height: '200px', // Fixed height to prevent resizing
              minHeight: '200px',
              maxHeight: '200px',
              boxSizing: 'border-box'
          }}>
            <div style={{
                maxWidth: '1200px',
              margin: '0 auto',
              display: 'flex',
                gap: '2rem',
                alignItems: 'center',
                height: '100%',
                boxSizing: 'border-box'
              }}>
                {/* Dish Image */}
                <div style={{ 
                  flex: '0 0 200px',
                  height: '180px',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  boxSizing: 'border-box'
                }}>
                  <img
                    src={gameState.currentImage}
                    alt={gameState.currentFood?.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
              </div>

                {/* Dish Info */}
                <div style={{ 
                  flex: 1, 
                  color: 'white',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '180px',
                  padding: '1rem 0',
                  textAlign: 'left'
                }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <h3 style={{
                      fontSize: '2rem',
                      fontWeight: 800,
                      fontFamily: "'Alan Sans', sans-serif",
                      color: '#FFD700',
                      margin: '0 0 0.5rem 0',
                      textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
                      textAlign: 'left'
                    }}>
                      {gameState.currentFood?.name}
                    </h3>
                    <p style={{
                      fontSize: '1.25rem',
                      fontWeight: 600,
                      fontFamily: "'Alan Sans', sans-serif",
                      color: '#ffffff',
                      margin: '0 0 0.75rem 0',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
                      textAlign: 'left'
                    }}>
                      📍 {gameState.currentFood?.city}, {gameState.currentFood?.location}
                    </p>
                  </div>
                  
                  <div style={{ 
                    flex: '1 1 auto',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    minHeight: '60px',
                    paddingTop: '0.5rem'
                  }}>
                    <p style={{
                      fontSize: '1rem',
                      fontWeight: 500,
                      fontFamily: "'Alan Sans', sans-serif",
                      lineHeight: '1.5',
                      color: '#ffffff',
                      margin: '0',
                      textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
                      textAlign: 'left'
                    }}>
                      {gameState.currentFood?.description || gameState.currentFood?.fact}
                    </p>
                  </div>
              </div>

              {/* Score */}
                <div style={{ 
                  flex: '0 0 180px',
                  textAlign: 'center',
                  color: 'white',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: '180px' // Match the dish info height
                }}>
                  <div style={{
                    fontSize: '2.5rem',
                    fontWeight: 800,
                    fontFamily: "'Alan Sans', sans-serif",
                  color: '#f97316',
                  marginBottom: '0.25rem',
                  textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
                  lineHeight: '1.1'
                }}>
                  {formatNumber(displayedDistance)}
                </div>
                <div style={{ 
                  fontSize: '1rem', 
                  fontWeight: 600,
                  fontFamily: "'Alan Sans', sans-serif",
                  color: '#ffffff',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.1em'
                }}>
                  KM AWAY
                </div>
                  <div style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    fontFamily: "'Alan Sans', sans-serif",
                    color: '#ffffff',
                    marginTop: '0.5rem',
                    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)'
                  }}>
                    {formatNumber(displayedRoundScore)} points
              </div>
            </div>
          </div>

            </div>
          )}

          {/* Debug Audio Test Buttons - Remove after testing */}
          {showNicknameScreen && (
            <div style={{
              position: 'fixed',
              top: '10px',
              right: '10px',
              zIndex: 1000,
              display: 'flex',
              gap: '10px'
            }}>
              <button onClick={() => playCountdownSound(3)} style={{padding: '5px 10px', background: 'red', color: 'white', border: 'none', borderRadius: '4px'}}>Test 3</button>
              <button onClick={() => playCountdownSound(2)} style={{padding: '5px 10px', background: 'orange', color: 'white', border: 'none', borderRadius: '4px'}}>Test 2</button>
              <button onClick={() => playCountdownSound(1)} style={{padding: '5px 10px', background: 'yellow', color: 'black', border: 'none', borderRadius: '4px'}}>Test 1</button>
              <button onClick={() => playBellSound()} style={{padding: '5px 10px', background: 'green', color: 'white', border: 'none', borderRadius: '4px'}}>Test Bell</button>
            </div>
          )}


          {/* Multi-Layer Diagonal Page Transition Overlay */}
          {isDiagonalTransitioning && (
            <>
              {/* Layer 1 - Darkest shade, slowest animation */}
              <div 
                className="diagonal-page-transition-1"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '250vw',
                  height: '250vh',
                  backgroundColor: 'rgba(82, 38, 157, 0.9)', // #52269d
                  zIndex: 9999,
                  pointerEvents: 'none',
                  transformOrigin: 'center center',
                  filter: 'drop-shadow(0 0 30px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 60px rgba(0, 0, 0, 0.4))'
                }}
              />
              {/* Layer 2 - Medium shade, medium animation */}
              <div 
                className="diagonal-page-transition-2"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '220vw',
                  height: '220vh',
                  backgroundColor: 'rgba(139, 92, 246, 0.7)', // #8B5CF6 - brighter complementary
                  zIndex: 9998,
                  pointerEvents: 'none',
                  transformOrigin: 'center center',
                  filter: 'drop-shadow(0 0 25px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 50px rgba(0, 0, 0, 0.3))'
                }}
              />
              {/* Layer 3 - Lightest shade, fastest animation */}
              <div 
                className="diagonal-page-transition-3"
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '200vw',
                  height: '200vh',
                  backgroundColor: 'rgba(167, 139, 250, 0.5)', // #A78BFA - lighter purple
                  zIndex: 9997,
                  pointerEvents: 'none',
                  transformOrigin: 'center center',
                  filter: 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 40px rgba(0, 0, 0, 0.2))'
                }}
              />
            </>
          )}

          {/* Countdown Timer - Centered on map area only */}
          {resultsPhase === 'countdown' && gameState.round < 6 && (
            <>
              <style jsx>{`
                @keyframes countdownRotateIn {
                  0% { 
                    transform: rotate(-180deg) scale(0.5);
                    opacity: 0;
                  }
                  100% { 
                    transform: rotate(0deg) scale(1);
                    opacity: 1;
                  }
                }
                
              `}</style>
              <div style={{
                position: 'fixed',
                top: 'calc(50vh - 100px)', // Center of viewport minus half of results panel height
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
                textAlign: 'center',
                pointerEvents: 'none',
                width: 'auto',
                height: 'auto',
                margin: 0,
                padding: 0,
                border: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                display: 'block',
                float: 'none',
                clear: 'none',
                overflow: 'visible'
              }}>
                <div 
                  key={countdown} // Force re-render for each number
                  style={{
                    fontSize: '8rem',
                    fontWeight: 800,
                    fontFamily: "'Alan Sans', sans-serif",
                    color: 'white',
                    textShadow: '4px 4px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.5)',
                  animation: animationsOn ? (
                    countdown === 3 ? 'countdownRotateIn 0.3s ease-out' :
                    countdown === 2 ? 'countdownRotateIn 0.15s ease-out' :
                    countdown === 1 ? 'countdownRotateIn 0.15s ease-out' :
                    countdown === 0 ? 'countdownRotateIn 0.15s ease-out' :
                    'countdownRotateIn 0.15s ease-out'
                  ) : 'none',
                  transformOrigin: 'center',
                    margin: 0,
                    padding: 0,
                    lineHeight: 1,
                    border: 'none',
                    outline: 'none',
                    boxSizing: 'border-box',
                    display: 'block',
                    float: 'none',
                    clear: 'none',
                    overflow: 'visible'
                  }}
                >
                  {countdown}
                </div>
              
              {/* Preloading indicator */}
              {isPreloading && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.875rem',
                  fontFamily: "'Alan Sans', sans-serif",
                  zIndex: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '2px solid rgba(255, 255, 255, 0.8)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loading next image...
                </div>
              )}
              </div>
            </>
          )}
        </div>
      )}

        {/* Pause Overlay */}
        {isGamePaused && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            pointerEvents: 'none'
          }}>
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              padding: '2rem',
              borderRadius: '10px',
              fontSize: '2rem',
              fontWeight: 'bold',
              fontFamily: "'Alan Sans', sans-serif",
              textAlign: 'center',
              border: '2px solid #10B981'
            }}>
              ⏸️ GAME PAUSED
              <div style={{ fontSize: '1rem', marginTop: '0.5rem', opacity: 0.8 }}>
                Press ESC or click Resume to continue
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettings && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            border: '2px solid #8B5CF6',
            boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
          }}>
            {/* Settings Header */}
            <div style={{
              textAlign: 'center',
              marginBottom: '2rem'
            }}>
              <h2 style={{
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                margin: 0,
                fontFamily: "'Alan Sans', sans-serif"
              }}>
                Settings
              </h2>
            </div>

            {/* Volume Controls */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <span style={{ color: 'white', marginRight: '0.5rem' }}>🔊</span>
                <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>EFFECT VOLUME</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={effectVolume}
                onChange={(e) => setEffectVolume(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${effectVolume * 100}%, #333 ${effectVolume * 100}%, #333 100%)`,
                  outline: 'none',
                  borderRadius: '3px',
                  appearance: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <span style={{ color: 'white', marginRight: '0.5rem' }}>🎵</span>
                <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>MUSIC VOLUME</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  height: '6px',
                  background: `linear-gradient(to right, #8B5CF6 0%, #8B5CF6 ${musicVolume * 100}%, #333 ${musicVolume * 100}%, #333 100%)`,
                  outline: 'none',
                  borderRadius: '3px',
                  appearance: 'none'
                }}
              />
            </div>

            {/* Toggle Switches */}
            <div style={{ marginBottom: '2rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'white', marginRight: '0.5rem' }}>🔊</span>
                  <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>SOUND ON</span>
                </div>
                <div
                  onClick={() => setSoundOn(!soundOn)}
                  style={{
                    width: '50px',
                    height: '24px',
                    backgroundColor: soundOn ? '#8B5CF6' : '#333',
                    borderRadius: '12px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: soundOn ? '28px' : '2px',
                    transition: 'left 0.3s ease'
                  }} />
                </div>
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <span style={{ color: 'white', marginRight: '0.5rem' }}>🏃</span>
                  <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 'bold' }}>ANIMATIONS ON</span>
                </div>
                <div
                  onClick={() => setAnimationsOn(!animationsOn)}
                  style={{
                    width: '50px',
                    height: '24px',
                    backgroundColor: animationsOn ? '#8B5CF6' : '#333',
                    borderRadius: '12px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.3s ease'
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: animationsOn ? '28px' : '2px',
                    transition: 'left 0.3s ease'
                  }} />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={resumeGame}
                style={{
                  backgroundColor: '#10B981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: "'Alan Sans', sans-serif"
                }}
              >
                RESUME
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  setShowQuitConfirm(true);
                }}
                style={{
                  backgroundColor: '#6B7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: "'Alan Sans', sans-serif"
                }}
              >
                QUIT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quit Confirmation Modal */}
      {showQuitConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          fontFamily: "'Alan Sans', sans-serif"
        }}>
          <div style={{
            backgroundColor: '#1c102f',
            padding: '2rem',
            borderRadius: '1rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            maxWidth: '400px',
            width: '90%',
            border: '2px solid rgba(255, 255, 255, 0.2)'
          }}>
            <h2 style={{
              color: '#ffffff',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              marginBottom: '1rem',
              fontFamily: "'Alan Sans', sans-serif"
            }}>
              Quit Game?
            </h2>
            <p style={{
              color: '#d1d5db',
              fontSize: '1rem',
              marginBottom: '2rem',
              lineHeight: '1.5',
              textAlign: 'center'
            }}>
              All progress will be lost, are you sure you want to quit?
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => setShowQuitConfirm(false)}
                style={{
                  backgroundColor: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: "'Alan Sans', sans-serif",
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#3730a3';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#4f46e5';
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleQuitGame}
                style={{
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.75rem 1.5rem',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: "'Alan Sans', sans-serif",
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#b91c1c';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Force deployment - Tue Oct  7 21:41:09 IST 2025
// Deployment trigger - Tue Oct  7 22:43:27 IST 2025
// Fresh deployment trigger - Wed Oct  8 21:22:43 IST 2025
