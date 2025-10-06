/**
 * Cookie Management System for Food Guessing Game
 * Tracks used foods and images to ensure variety in gameplay
 */

export interface GameSession {
  usedFoods: number[];
  usedImages: Record<string, number[]>; // foodName -> array of used image indices
  lastPlayed: number;
  totalSessions: number;
  recentDishes: number[]; // Recently played dish indices (last 2-3 games)
  lastGameDishes: number[]; // Dishes from the most recent completed game
  username: string; // User's last entered nickname
  avatarIndex: number; // User's last selected avatar index
  musicVolume: number; // User's music volume preference (0-1)
  effectVolume: number; // User's effect volume preference (0-1)
  soundOn: boolean; // User's sound on/off preference
}

export class CookieManager {
  private static COOKIE_NAME = 'foodgame_session';
  private static EXPIRY_DAYS = 30;

  /**
   * Get current game session data from cookies
   */
  static getSessionData(): GameSession {
    if (typeof document === 'undefined') {
      // Server-side rendering fallback
      return {
        usedFoods: [],
        usedImages: {},
        lastPlayed: 0,
        totalSessions: 0,
        recentDishes: [],
        lastGameDishes: [],
        username: '',
        avatarIndex: 0,
        musicVolume: 0.3,
        effectVolume: 0.7,
        soundOn: true
      };
    }

    try {
      const cookieValue = this.getCookie(this.COOKIE_NAME);
      if (cookieValue) {
        const parsed = JSON.parse(cookieValue);
        return {
          usedFoods: parsed.usedFoods || [],
          usedImages: parsed.usedImages || {},
          lastPlayed: parsed.lastPlayed || 0,
          totalSessions: parsed.totalSessions || 0,
          recentDishes: parsed.recentDishes || [],
          lastGameDishes: parsed.lastGameDishes || [],
          username: parsed.username || '',
          avatarIndex: parsed.avatarIndex || 0,
          musicVolume: parsed.musicVolume !== undefined ? parsed.musicVolume : 0.3,
          effectVolume: parsed.effectVolume !== undefined ? parsed.effectVolume : 0.7,
          soundOn: parsed.soundOn !== undefined ? parsed.soundOn : true
        };
      }
    } catch (error) {
      console.warn('Error parsing session cookie:', error);
    }

    return {
      usedFoods: [],
      usedImages: {},
      lastPlayed: 0,
      totalSessions: 0,
      recentDishes: [],
      lastGameDishes: [],
      username: '',
      avatarIndex: 0,
      musicVolume: 0.3,
      effectVolume: 0.7,
      soundOn: true
    };
  }

  /**
   * Save game session data to cookies
   */
  static saveSessionData(sessionData: GameSession): void {
    if (typeof document === 'undefined') return;

    try {
      const cookieValue = JSON.stringify(sessionData);
      this.setCookie(this.COOKIE_NAME, cookieValue, this.EXPIRY_DAYS);
    } catch (error) {
      console.warn('Error saving session cookie:', error);
    }
  }

  /**
   * Update session with new food and image usage
   */
  static updateSession(foodIndex: number, foodName: string, imageIndex: number): void {
    const sessionData = this.getSessionData();
    
    // Add food to used foods if not already there
    if (!sessionData.usedFoods.includes(foodIndex)) {
      sessionData.usedFoods.push(foodIndex);
    }

    // Add image to used images for this food
    if (!sessionData.usedImages[foodName]) {
      sessionData.usedImages[foodName] = [];
    }
    
    if (!sessionData.usedImages[foodName].includes(imageIndex)) {
      sessionData.usedImages[foodName].push(imageIndex);
    }

    // Update last played time
    sessionData.lastPlayed = Date.now();

    this.saveSessionData(sessionData);
  }

  /**
   * Update recent dishes when a game is completed
   */
  static updateRecentDishes(gameDishes: number[]): void {
    const sessionData = this.getSessionData();
    
    // Update last game dishes
    sessionData.lastGameDishes = gameDishes;
    
    // Add to recent dishes (keep last 18 dishes = 3 games worth)
    const maxRecentDishes = 18;
    sessionData.recentDishes = [...sessionData.recentDishes, ...gameDishes];
    
    // Keep only the most recent dishes
    if (sessionData.recentDishes.length > maxRecentDishes) {
      sessionData.recentDishes = sessionData.recentDishes.slice(-maxRecentDishes);
    }
    
    this.saveSessionData(sessionData);
  }

  /**
   * Save user preferences (username and avatar)
   */
  static saveUserPreferences(username: string, avatarIndex: number): void {
    const sessionData = this.getSessionData();
    sessionData.username = username;
    sessionData.avatarIndex = avatarIndex;
    this.saveSessionData(sessionData);
  }

  /**
   * Save music/sound preferences
   */
  static saveMusicPreferences(musicVolume: number, effectVolume: number, soundOn: boolean): void {
    const sessionData = this.getSessionData();
    sessionData.musicVolume = musicVolume;
    sessionData.effectVolume = effectVolume;
    sessionData.soundOn = soundOn;
    this.saveSessionData(sessionData);
  }

  /**
   * Get available foods with recent dishes mixed in
   */
  static getAvailableFoodsWithRecent(allFoods: any[], maxRecent: number = 20): number[] {
    const sessionData = this.getSessionData();
    const availableIndices: number[] = [];
    const recentIndices: number[] = [];

    // Separate recent dishes from completely new ones
    for (let i = 0; i < allFoods.length; i++) {
      if (!sessionData.usedFoods.includes(i)) {
        if (sessionData.recentDishes.includes(i)) {
          recentIndices.push(i);
        } else {
          availableIndices.push(i);
        }
      }
    }

    // If we have enough recent dishes, mix them in
    if (recentIndices.length > 0 && availableIndices.length > 0) {
      // Include 1-2 recent dishes per game (out of 6 total)
      const recentCount = Math.min(2, recentIndices.length);
      const recentSelection = recentIndices.slice(-recentCount);
      
      // Mix recent dishes with new ones
      const mixed = [...recentSelection, ...availableIndices];
      return mixed;
    }

    // Fallback to regular available foods
    return availableIndices;
  }

  /**
   * Get available foods (not recently used)
   */
  static getAvailableFoods(allFoods: any[], maxRecent: number = 20): number[] {
    const sessionData = this.getSessionData();
    const availableIndices: number[] = [];

    for (let i = 0; i < allFoods.length; i++) {
      if (!sessionData.usedFoods.includes(i)) {
        availableIndices.push(i);
      }
    }

    // If we have more than maxRecent unused foods, return all available
    if (availableIndices.length > maxRecent) {
      return availableIndices;
    }

    // If we need more foods, reset the used foods list (keep only the most recent ones)
    if (sessionData.usedFoods.length > allFoods.length - 6) {
      const recentUsed = sessionData.usedFoods.slice(-maxRecent);
      sessionData.usedFoods = recentUsed;
      this.saveSessionData(sessionData);
      
      // Return all foods except the most recent ones
      return allFoods.map((_, index) => index).filter(i => !recentUsed.includes(i));
    }

    return availableIndices;
  }

  /**
   * Get the least recently used image for a specific food
   */
  static getLeastUsedImage(foodName: string, totalImages: number): number {
    const sessionData = this.getSessionData();
    const usedImages = sessionData.usedImages[foodName] || [];

    // If no images have been used, start with the first one
    if (usedImages.length === 0) {
      return 0;
    }

    // If all images have been used, find the least recently used one
    if (usedImages.length >= totalImages) {
      // Return the oldest used image (first in the array)
      return usedImages[0];
    }

    // Find the first unused image
    for (let i = 0; i < totalImages; i++) {
      if (!usedImages.includes(i)) {
        return i;
      }
    }

    // Fallback to first image
    return 0;
  }

  /**
   * Reset session data (for testing or user preference)
   */
  static resetSession(): void {
    const sessionData: GameSession = {
      usedFoods: [],
      usedImages: {},
      lastPlayed: Date.now(),
      totalSessions: 0,
      recentDishes: [],
      lastGameDishes: [],
      username: '',
      avatarIndex: 0,
      musicVolume: 0.3,
      effectVolume: 0.7,
      soundOn: true
    };
    this.saveSessionData(sessionData);
  }

  /**
   * Reset only used foods (allows repetition when all foods are used)
   */
  static resetUsedFoods(): void {
    const sessionData = this.getSessionData();
    sessionData.usedFoods = [];
    this.saveSessionData(sessionData);
  }

  /**
   * Get session statistics
   */
  static getSessionStats(): {
    totalSessions: number;
    foodsUsed: number;
    lastPlayed: string;
  } {
    const sessionData = this.getSessionData();
    return {
      totalSessions: sessionData.totalSessions,
      foodsUsed: sessionData.usedFoods.length,
      lastPlayed: new Date(sessionData.lastPlayed).toLocaleString()
    };
  }

  /**
   * Helper method to get cookie value
   */
  private static getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  /**
   * Helper method to set cookie
   */
  private static setCookie(name: string, value: string, days: number): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  }
}
