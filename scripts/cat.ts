/**
 * Cat module with various cat-related functions
 */

/**
 * Make a cat say hi with greeting
 * @param greeting - The greeting message
 * @param name - The cat's name
 * @returns Greeting message with cat sounds
 */
export const sayHi = (greeting: string, name: string): string => {
  return `${greeting} ${name} says hi! meow! meow!`;
};

/**
 * Make a cat walk
 * @param name - The cat's name
 * @returns Walking message
 */
export const walk = (name: string): string => {
  return `Cat ${name} is walking`;
};

/**
 * Make a cat purr
 * @param name - The cat's name
 * @param volume - Purr volume (1-10)
 * @returns Purring message
 */
export const purr = (name: string, volume: number): string => {
  const intensity = volume > 5 ? "loudly" : "softly";
  return `Cat ${name} is purring ${intensity}! purrr... purrr...`;
};

/**
 * Make a cat sleep
 * @param name - The cat's name
 * @param location - Where the cat sleeps
 * @returns Sleeping message
 */
export const sleep = (name: string, location: string): string => {
  return `Cat ${name} is sleeping peacefully on the ${location || "couch"}`;
};

/**
 * Make a cat meow
 * @param name - The cat's name
 * @param times - Number of times to meow
 * @returns Meowing message
 */
export const meow = (name: string, times: number): string => {
  const meows = "meow! ".repeat(times || 1);
  return `Cat ${name} is meowing: ${meows.trim()}`;
};
