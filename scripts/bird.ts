/**
 * Bird module with various bird-related functions
 */

/**
 * Make a bird fly
 * @param name - The bird's name
 * @param height - Flying height in meters
 * @returns Flying message
 */
export const fly = (name: string, height: number): string => {
  return `Bird ${name} is flying at ${height} meters high! Tweet tweet!`;
};

/**
 * Make a bird sing
 * @param name - The bird's name
 * @param song - The song to sing
 * @returns Singing message
 */
export const sing = (name: string, song: string): string => {
  return `Bird ${name} is singing: "${song}" ♪♫♪`;
};

/**
 * Make a bird build a nest
 * @param name - The bird's name
 * @param location - Where to build the nest
 * @returns Nest building message
 */
export const buildNest = (name: string, location: string): string => {
  return `Bird ${name} is building a cozy nest in the ${location}`;
};
